import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import mammoth from 'mammoth';

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

    // 获取用户最近回答过的题目（避免重复）
    const { data: userAnswers } = await client
      .from('score_records')
      .select('question_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    const answeredQuestionIds = userAnswers?.map(a => a.question_id) || [];

    // 获取这些题目的内容，用于在prompt中排除
    let excludedTopics: string[] = [];
    if (answeredQuestionIds.length > 0) {
      const { data: answeredQuestions } = await client
        .from('questions')
        .select('content')
        .in('id', answeredQuestionIds.slice(0, 10)); // 只取最近的10道

      excludedTopics = answeredQuestions?.map(q => q.content.substring(0, 50)) || [];
    }

    // 读取文档内容
    const docxBuffer = await mammoth.extractRawText({ path: document.file_url });
    const documentContent = docxBuffer.value;
    const sourceDocumentName = document.filename;

    console.log('Using question bank:', sourceDocumentName);
    console.log('Document content length:', documentContent.length);
    console.log('Sequential mode:', user.sequential_mode);
    console.log('Excluded topics count:', excludedTopics.length);

    // 调用豆包 LLM 生成题目
    const config = new Config();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const llmClient = new LLMClient(config, customHeaders);

    // 根据是否按顺序出题，使用不同的prompt
    let prompt = '';
    const randomSeed = Math.floor(Math.random() * 10000); // 随机种子，增加多样性

    // 构建已回答题目的排除信息
    const excludedTopicsText = excludedTopics.length > 0
      ? `以下题目是用户最近已经回答过的，请绝对不要出类似的题目：
${excludedTopics.map((t, i) => `${i + 1}. ${t}...`).join('\n')}

`
      : '';

    if (user.sequential_mode) {
      // 按顺序出题模式
      prompt = `你是一个专业的考研出题老师。请根据以下文档内容，按顺序生成5道题（3道选择题和2道填空题）。

重要要求（必须严格遵守）：
1. 每次出题必须选择不同的知识点！绝对不要重复之前出过的题目
2. 请随机选择一个起始自然段（文档的前50%到70%之间的位置），然后从该段开始按照自然段的顺序出题
3. 每个自然段至少生成一道题（如果自然段较少，前面的自然段可以生成多道题）
4. 总共生成5道题（3道选择题和2道填空题）
5. 选择题和填空题交替或按顺序分配到各个自然段
6. 题目要基于文档内容，考察重点知识点，不要都是问同一个问题

${excludedTopicsText}随机种子：${randomSeed}
当前时间：${new Date().getTime()}

文档内容：
${documentContent}

请严格按照以下JSON格式返回题目，不要包含任何其他文字：`;
    } else {
      // 随机出题模式（默认）
      prompt = `你是一个专业的考研出题老师。请根据以下文档内容，生成3道选择题和2道填空题。

重要要求（必须严格遵守）：
1. 每次出题必须选择不同的知识点！绝对不要重复之前出过的题目
2. 题目必须来自文档的不同部分，不要总是选择相同的内容
3. 每次生成的题目要完全不同，避免相似或重复
4. 题目要基于文档内容，考察不同的重点知识点

${excludedTopicsText}随机种子：${randomSeed}
当前时间：${new Date().getTime()}

文档内容：
${documentContent}

请严格按照以下JSON格式返回题目，不要包含任何其他文字：`;
    }

    prompt += `

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

要求：
1. 选择题要有明确的4个选项（A/B/C/D）
2. 填空题的答案要在10个字符以内
3. ${user.sequential_mode ? '严格按照自然段顺序出题，每个自然段至少一道题' : '题目可以来自文档的任意部分'}
4. 只返回JSON，不要有任何其他文字`;

    const response = await llmClient.invoke(
      [{ role: 'user', content: prompt }],
      { temperature: 1.0 } // 最高温度以最大化多样性
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
