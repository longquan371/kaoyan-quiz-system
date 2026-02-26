'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Question {
  id: string;
  type: 'choice' | 'fill';
  content: string;
  options?: { label: string; text: string }[];
}

interface Answer {
  questionId: string;
  userAnswer: string;
}

export default function StudentPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [currentScore, setCurrentScore] = useState(0);

  useEffect(() => {
    // 检查用户登录状态
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    setCurrentScore(parsedUser.total_score || 0);

    // 自动生成题目
    generateQuestions(parsedUser.id);
  }, [router]);

  const generateQuestions = async (userId: string, retrain: boolean = false) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, retrain }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '生成题目失败');
      }

      setQuestions(data.questions);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers({ ...answers, [questionId]: value });
  };

  const handleSubmit = async () => {
    // 检查是否所有题目都已回答
    const unansweredQuestions = questions.filter(q => !answers[q.id]);
    if (unansweredQuestions.length > 0) {
      setError('请完成所有题目后再提交');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const answerArray: Answer[] = questions.map(q => ({
        questionId: q.id,
        userAnswer: answers[q.id],
      }));

      const response = await fetch('/api/submit-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          answers: answerArray,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '提交失败');
      }

      setResult(data);

      // 更新本地存储的用户信息
      const updatedUser = { ...user, total_score: data.newTotalScore };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setCurrentScore(data.newTotalScore);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextRound = () => {
    setAnswers({});
    setResult(null);
    generateQuestions(user.id, false);
  };

  const handleRetrain = () => {
    setAnswers({});
    setResult(null);
    generateQuestions(user.id, true);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  if (isLoading && questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat bg-fixed p-4" style={{backgroundImage: 'url("/background-image.png")'}}>
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
              <p className="mt-4 text-white">正在为您生成题目...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat bg-fixed p-4" style={{backgroundImage: 'url("/background-image.png")'}}>
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="pt-6">
            <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800 mb-4">
              <AlertDescription className="text-red-600 dark:text-red-400">
                {error}
              </AlertDescription>
            </Alert>
            <Button onClick={() => router.push('/')} className="w-full">
              返回首页
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed p-4" style={{backgroundImage: 'url("/background-image.png")'}}>
      <div className="max-w-4xl mx-auto py-8">
        {/* 顶部导航 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">
              欢迎同学
            </h1>
            <p className="text-white mt-1">
              当前总分：<span className="text-2xl font-bold text-white">
                {currentScore}
              </span> 分
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            退出登录
          </Button>
        </div>

        {result ? (
          // 显示结果
          <Card className="shadow-xl border-2">
            <CardHeader>
              <CardTitle>答题结果</CardTitle>
              <CardDescription>
                本次得分变化：{result.totalScoreChange > 0 ? '+' : ''}{result.totalScoreChange} 分
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.results.map((res: any, index: number) => (
                <div
                  key={res.questionId}
                  className={`p-4 rounded-lg ${
                    res.isCorrect
                      ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800'
                      : 'bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold mb-2">
                        第 {index + 1} 题
                        {res.isCorrect ? (
                          <span className="ml-2 text-green-600 dark:text-green-400">✓ 正确</span>
                        ) : (
                          <span className="ml-2 text-red-600 dark:text-red-400">✗ 错误</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        分数变化：{res.scoreChange > 0 ? '+' : ''}{res.scoreChange} 分
                      </p>
                      {!res.isCorrect && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                          正确答案：{res.correctAnswer}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex gap-3 mt-6">
                <Button onClick={handleNextRound} className="flex-1" variant="default">
                  继续答题
                </Button>
                <Button onClick={handleRetrain} className="flex-1" variant="outline">
                  掌握不熟，重新训练
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          // 显示题目
          <Card className="shadow-xl border-2">
            <CardHeader>
              <CardTitle>测试题目</CardTitle>
              <CardDescription>
                请完成以下题目，选择题从4个选项中选择，填空题在横线处填写答案
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {questions.map((question, index) => (
                <div key={question.id} className="border-b pb-6 last:border-b-0">
                  <div className="mb-4">
                    <Label className="text-lg font-semibold">
                      第 {index + 1} 题
                      {question.type === 'choice' ? '（选择题）' : '（填空题）'}
                    </Label>
                    <p className="mt-2 text-gray-700 dark:text-gray-300 whitespace-pre-line">
                      {question.content}
                    </p>
                  </div>

                  {question.type === 'choice' && question.options && (
                    <RadioGroup
                      value={answers[question.id] || ''}
                      onValueChange={(value) => handleAnswerChange(question.id, value)}
                    >
                      {question.options.map((option) => (
                        <div key={option.label} className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800">
                          <RadioGroupItem value={option.label} id={`${question.id}-${option.label}`} />
                          <Label
                            htmlFor={`${question.id}-${option.label}`}
                            className="flex-1 cursor-pointer"
                          >
                            <span className="font-semibold mr-2">{option.label}.</span>
                            {option.text}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}

                  {question.type === 'fill' && (
                    <Input
                      type="text"
                      placeholder="请输入答案（10个字符以内）"
                      value={answers[question.id] || ''}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      maxLength={10}
                      className="mt-2"
                    />
                  )}
                </div>
              ))}

              {error && (
                <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
                  <AlertDescription className="text-red-600 dark:text-red-400">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleSubmit}
                className="w-full mt-4"
                disabled={isSubmitting}
              >
                {isSubmitting ? '提交中...' : '提交答案'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
