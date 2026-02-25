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
    
    // 读取文档内容
    const docxBuffer = await mammoth.extractRawText({ path: document.file_url });
    const documentContent = docxBuffer.value;
    const sourceDocumentName = document.filename;

    console.log('Using question bank:', sourceDocumentName);
    console.log('Document content length:', documentContent.length);

    // 调用豆包 LLM 生成题目
    const config = new Config();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const llmClient = new LLMClient(config, customHeaders);

    const prompt = `你是一个专业的考研出题老师。请根据以下文档内容，生成3道选择题和2道填空题。

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

要求：
1. 选择题要有明确的4个选项（A/B/C/D）
2. 填空题的答案要在10个字符以内
3. 题目要基于文档内容，考察重点知识
4. 只返回JSON，不要有任何其他文字`;

    const response = await llmClient.invoke(
      [{ role: 'user', content: prompt }],
      { temperature: 0.7 }
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
