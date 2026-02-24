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

    // 获取用户信息和 API Key
    const { data: users } = await client
      .from('users')
      .select('coze_api_key')
      .eq('id', userId)
      .limit(1);

    if (!users || users.length === 0) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    const user = users[0];
    if (!user.coze_api_key) {
      return NextResponse.json(
        { error: '请先配置豆包API Key（格式：pat_xxxx...）' },
        { status: 400 }
      );
    }

    // 检查 API Key 格式
    if (!user.coze_api_key.startsWith('pat_')) {
      return NextResponse.json(
        { error: '豆包API Key 格式不正确，应以 pat_ 开头' },
        { status: 400 }
      );
    }

    // 获取示例文档内容
    const docxBuffer = await mammoth.extractRawText({ path: '/tmp/news_exam.docx' });
    const documentContent = docxBuffer.value;

    console.log('Document content length:', documentContent.length);
    console.log('API Key format check:', user.coze_api_key.substring(0, 10) + '...');

    // 调用豆包 LLM 生成题目
    const config = new Config({
      apiKey: user.coze_api_key,
    });
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
          source_document: 'news_exam.docx',
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
