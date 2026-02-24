import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const { userId, answers } = await request.json();

    if (!userId || !answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: '参数错误' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    let totalScoreChange = 0;
    const results = [];

    for (const answer of answers) {
      const { questionId, userAnswer } = answer;

      // 获取题目信息
      const { data: questions } = await client
        .from('questions')
        .select('*')
        .eq('id', questionId)
        .limit(1);

      if (!questions || questions.length === 0) {
        continue;
      }

      const question = questions[0];
      let isCorrect = 0;
      let scoreChange = 0;

      // 判断答案是否正确
      if (question.type === 'choice') {
        // 选择题：+10分或-10分
        isCorrect = userAnswer === question.correct_answer ? 1 : 0;
        scoreChange = isCorrect ? 10 : -10;
      } else if (question.type === 'fill') {
        // 填空题：对+（字符数*5）分
        isCorrect = userAnswer.trim() === question.correct_answer.trim() ? 1 : 0;
        if (isCorrect) {
          scoreChange = userAnswer.trim().length * 5;
        } else {
          scoreChange = 0; // 填空题答错不扣分
        }
      }

      totalScoreChange += scoreChange;

      // 保存答题记录
      await client.from('score_records').insert({
        user_id: userId,
        question_id: questionId,
        is_correct: isCorrect,
        score_change: scoreChange,
        user_answer: userAnswer,
      });

      results.push({
        questionId,
        isCorrect: !!isCorrect,
        scoreChange,
        correctAnswer: question.correct_answer,
      });
    }

    // 获取用户当前分数
    const { data: currentUser } = await client
      .from('users')
      .select('total_score')
      .eq('id', userId)
      .single();

    const currentScore = currentUser?.total_score || 0;
    const newTotalScore = currentScore + totalScoreChange;

    // 更新用户总分
    await client
      .from('users')
      .update({
        total_score: newTotalScore,
      })
      .eq('id', userId);

    return NextResponse.json({
      results,
      totalScoreChange,
      newTotalScore,
    });
  } catch (error) {
    console.error('Submit answers error:', error);
    return NextResponse.json(
      { error: '提交答案失败' },
      { status: 500 }
    );
  }
}
