import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import mammoth from 'mammoth';

// 按自然段分割文档内容
function splitIntoParagraphs(content: string): string[] {
  // 按双换行符或单换行符分割，过滤空段落
  const paragraphs = content
    .split(/\n\s*\n|\n/)
    .map(p => p.trim())
    .filter(p => p.length > 10); // 过滤掉太短的段落（少于10个字符）
  return paragraphs;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: '用户ID不能为空' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // 获取用户信息
    const { data: users } = await client
      .from('users')
      .select('*')
      .eq('id', userId)
      .limit(1);

    if (!users || users.length === 0) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    const user = users[0];

    console.log(`[Generate Questions] User: ${user.username}, Sequential Mode: ${user.sequential_mode}, Current Paragraph Index: ${user.current_paragraph_index}`);

    // 如果用户没有选择题库，使用最新的文档
    let documentId = user.selected_document;
    if (!documentId) {
      const { data: latestDoc } = await client
        .from('documents')
        .select('id')
        .order('uploaded_at', { ascending: false })
        .limit(1);

      if (latestDoc && latestDoc.length > 0) {
        documentId = latestDoc[0].id;
      } else {
        return NextResponse.json(
          { error: '暂无可用的题库，请联系老师上传文档' },
          { status: 400 }
        );
      }
    }

    // 从数据库获取文档路径
    const { data: documents } = await client
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .limit(1);

    if (!documents || documents.length === 0) {
      return NextResponse.json(
        { error: '题库文档不存在' },
        { status: 404 }
      );
    }

    const document = documents[0];

    // 读取文档内容
    const docxBuffer = await mammoth.extractRawText({ path: document.file_url });
    const documentContent = docxBuffer.value;
    const sourceDocumentName = document.filename;

    console.log('Using question bank:', sourceDocumentName);
    console.log('Document content length:', documentContent.length);
    console.log('Sequential mode:', user.sequential_mode);

    // 调用豆包 LLM 生成题目
    const config = new Config();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const llmClient = new LLMClient(config, customHeaders);

    let prompt = '';
    let questionsToGenerate = 5; // 默认生成5道题

    if (user.sequential_mode) {
      // === 顺序出题模式 ===
      // 获取当前出题进度（默认为0）
      let currentParagraphIndex = user.current_paragraph_index || 0;

      // 将文档按自然段分割
      const paragraphs = splitIntoParagraphs(documentContent);
      console.log(`Total paragraphs: ${paragraphs.length}, Starting from: ${currentParagraphIndex}`);

      // 获取用户已经回答过的题目，用于去重
      const { data: scoreRecords } = await client
        .from('score_records')
        .select('question_id')
        .eq('user_id', userId);

      const answeredQuestionIds = scoreRecords?.map(r => r.question_id) || [];

      // 获取这些题目的内容，用于在prompt中排除
      let excludedQuestions: string[] = [];
      if (answeredQuestionIds.length > 0) {
        const { data: answeredQuestions } = await client
          .from('questions')
          .select('content, source_document')
          .in('id', answeredQuestionIds);

        // 只排除来自当前文档的已回答题目
        excludedQuestions = answeredQuestions
          ?.filter(q => q.source_document === sourceDocumentName)
          .map(q => q.content.substring(0, 100)) || [];
      }

      console.log(`Excluded ${excludedQuestions.length} previously answered questions`);

      // 检查是否需要循环回到开头
      if (currentParagraphIndex >= paragraphs.length) {
        console.log('Reached end of document, cycling back to beginning');
        currentParagraphIndex = 0;
        // 不更新数据库，等到本次出题完成后再更新
      }

      // 计算本次可以出多少道题（最多5道，但也要保证不超过剩余段落数）
      const remainingParagraphs = paragraphs.length - currentParagraphIndex;
      questionsToGenerate = Math.min(5, remainingParagraphs);

      // 取接下来的 N 个段落
      const selectedParagraphs = paragraphs.slice(currentParagraphIndex, currentParagraphIndex + questionsToGenerate);

      console.log(`Selected ${selectedParagraphs.length} paragraphs from index ${currentParagraphIndex}`);

      // 为每个段落生成一道题目
      const isFirstRound = currentParagraphIndex === 0 && excludedQuestions.length === 0;

      prompt = `你是一个专业的考研出题老师。请根据以下各个段落的内容，为每个段落生成一道题。

${!isFirstRound ? `重要提示：这是新一轮出题循环，请生成与之前完全不同的题目！` : ''}

总共需要生成 ${selectedParagraphs.length} 道题。
段落顺序和题目要求：
${selectedParagraphs.map((para, index) => `
第 ${currentParagraphIndex + index + 1} 段（必须为这一段出题）：
"${para.substring(0, 150)}..."

`).join('')}

${excludedQuestions.length > 0 ? `
以下题目是之前已经出过的，请绝对不要出类似的题目：
${excludedQuestions.map((q, i) => `${i + 1}. ${q}...`).join('\n')}
` : ''}

题目分配规则：
1. 前 ${Math.ceil(questionsToGenerate * 0.6)} 道题生成选择题，后 ${Math.floor(questionsToGenerate * 0.4)} 道题生成填空题
2. 每道题必须严格按照对应的段落内容出题，不要出其他段落的题
3. ${!isFirstRound ? '必须生成与之前完全不同的题目，变换提问方式、考察角度或知识点！' : ''}
4. 填空题答案要在10个字符以内

请严格按照以下JSON格式返回题目：

{
  "questions": [
    {
      "type": "choice",
      "content": "题目内容",
      "options": [
        {"label": "A", "text": "选项A内容"},
        {"label": "B", "text": "选项B内容"},
        {"label": "C", "text": "选项C内容"},
        {"label": "D", "text": "选项D内容"}
      ],
      "correct_answer": "A"
    },
    {
      "type": "fill",
      "content": "题目内容（用____表示填空位置）",
      "correct_answer": "答案内容（10个字符以内）"
    }
  ]
}

重要：
- 严格按照段落的顺序，为每个段落生成一道题
- 只返回JSON，不要有任何其他文字`;

      // 生成题目后，更新用户的出题进度
      const newParagraphIndex = currentParagraphIndex + questionsToGenerate;
      await client
        .from('users')
        .update({ current_paragraph_index: newParagraphIndex })
        .eq('id', userId);

      console.log(`Updated current_paragraph_index to ${newParagraphIndex}`);

    } else {
      // === 随机出题模式 ===
      prompt = `你是一个专业的考研出题老师。请根据以下文档内容，生成3道选择题和2道填空题。

要求：
1. 题目可以来自文档的任意部分
2. 每次生成的题目要不同，避免重复
3. 题目要基于文档内容，考察不同的重点知识点

文档内容：
${documentContent}

请严格按照以下JSON格式返回题目，不要包含任何其他文字：

{
  "questions": [
    {
      "type": "choice",
      "content": "题目内容",
      "options": [
        {"label": "A", "text": "选项A内容"},
        {"label": "B", "text": "选项B内容"},
        {"label": "C", "text": "选项C内容"},
        {"label": "D", "text": "选项D内容"}
      ],
      "correct_answer": "A"
    },
    {
      "type": "fill",
      "content": "题目内容（用____表示填空位置）",
      "correct_answer": "答案内容（10个字符以内）"
    }
  ]
}

重要：
- 只返回JSON，不要有任何其他文字`;
    }

    const response = await llmClient.invoke(
      [{ role: 'user', content: prompt }],
      { temperature: 0.8 }
    );

    console.log('LLM response:', response.content.substring(0, 100) + '...');

    // 解析 LLM 返回的 JSON
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('无法解析题目');
    }

    const questionsData = JSON.parse(jsonMatch[0]);

    // 将题目保存到数据库
    const savedQuestions = [];

    for (const question of questionsData.questions) {
      const { data: newQuestion } = await client
        .from('questions')
        .insert({
          content: question.content,
          type: question.type,
          options: question.type === 'choice' ? question.options : null,
          correct_answer: question.correct_answer,
          source_document: sourceDocumentName,
        })
        .select()
        .single();

      savedQuestions.push({
        id: newQuestion.id,
        type: newQuestion.type,
        content: newQuestion.content,
        options: newQuestion.options,
      });
    }

    return NextResponse.json({
      questions: savedQuestions,
    });
  } catch (error) {
    console.error('Generate questions error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '生成题目失败' },
      { status: 500 }
    );
  }
}
