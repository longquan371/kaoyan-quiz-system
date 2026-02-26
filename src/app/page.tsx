'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface QuestionBank {
  id: string;
  filename: string;
  uploaded_at: string;
}

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: '',
    selectedDocument: '',
    sequentialMode: false,
  });
  const [registerForm, setRegisterForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    selectedDocument: '',
    sequentialMode: false,
  });

  // 加载题库列表
  useEffect(() => {
    const loadQuestionBanks = async () => {
      try {
        const response = await fetch('/api/question-banks');
        const data = await response.json();
        if (response.ok) {
          const banks = data.questionBanks || [];
          setQuestionBanks(banks);
          
          // 如果有题库，默认选择第一个
          if (banks.length > 0) {
            setLoginForm(prev => ({ ...prev, selectedDocument: banks[0].id }));
            setRegisterForm(prev => ({ ...prev, selectedDocument: banks[0].id }));
          }
        }
      } catch (err) {
        console.error('加载题库失败:', err);
      } finally {
        setLoadingBanks(false);
      }
    };

    loadQuestionBanks();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // 检查是否是老师账户
      if (loginForm.username === 'wljdnx' && loginForm.password === '902323') {
        // 老师登录
        localStorage.setItem('user', JSON.stringify({
          username: 'wljdnx',
          role: 'teacher',
        }));
        window.location.href = '/teacher';
        return;
      }

      // 学生登录
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginForm.username,
          password: loginForm.password,
          selectedDocument: loginForm.selectedDocument,
          sequentialMode: loginForm.sequentialMode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '登录失败');
      }

      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = '/student';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (registerForm.password !== registerForm.confirmPassword) {
      setError('两次密码输入不一致');
      return;
    }

    if (!registerForm.selectedDocument) {
      setError('请选择题库');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: registerForm.username,
          password: registerForm.password,
          selectedDocument: registerForm.selectedDocument,
          sequentialMode: registerForm.sequentialMode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '注册失败');
      }

      // 注册成功后自动登录
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = '/student';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat bg-fixed p-4" style={{backgroundImage: 'url("/background-image.png")'}}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8 bg-gray-700/70 rounded-lg p-6 backdrop-blur-sm">
          <h1 className="text-4xl font-bold text-white mb-2">
            瓦叔带你考上研！
          </h1>
          <p className="text-white">
            今天也是充满斗志的一天
          </p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">登录</TabsTrigger>
            <TabsTrigger value="register">注册</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card className="shadow-xl border-2">
              <CardHeader>
                <CardTitle>欢迎回来</CardTitle>
                <CardDescription>输入您的账号密码登录系统</CardDescription>
              </CardHeader>
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  {error && (
                    <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
                      <AlertDescription className="text-red-600 dark:text-red-400">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="login-username">用户名</Label>
                    <Input
                      id="login-username"
                      type="text"
                      placeholder="请输入用户名"
                      value={loginForm.username}
                      onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">密码</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="请输入密码"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-questionbank">选择题库</Label>
                    <Select
                      value={loginForm.selectedDocument}
                      onValueChange={(value) => setLoginForm({ ...loginForm, selectedDocument: value })}
                      disabled={loadingBanks || questionBanks.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          loadingBanks ? '加载中...' : 
                          questionBanks.length === 0 ? '暂无可用题库' : 
                          '请选择题库'
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {questionBanks.map((bank) => (
                          <SelectItem key={bank.id} value={bank.id}>
                            {bank.filename}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      选择题库后，题目将从该题库中生成
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="login-sequential"
                      checked={loginForm.sequentialMode}
                      onCheckedChange={(checked) => setLoginForm({ ...loginForm, sequentialMode: checked as boolean })}
                    />
                    <Label htmlFor="login-sequential" className="text-sm font-normal cursor-pointer">
                      按顺序出题（每个自然段至少一道题）
                    </Label>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? '登录中...' : '登录'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card className="shadow-xl border-2">
              <CardHeader>
                <CardTitle>创建账户</CardTitle>
                <CardDescription>注册学生账户开始学习</CardDescription>
              </CardHeader>
              <form onSubmit={handleRegister}>
                <CardContent className="space-y-4">
                  {error && (
                    <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
                      <AlertDescription className="text-red-600 dark:text-red-400">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="register-username">用户名</Label>
                    <Input
                      id="register-username"
                      type="text"
                      placeholder="请输入用户名"
                      value={registerForm.username}
                      onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">密码</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="请输入密码（至少6位）"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-confirm">确认密码</Label>
                    <Input
                      id="register-confirm"
                      type="password"
                      placeholder="请再次输入密码"
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-questionbank">选择题库</Label>
                    <Select
                      value={registerForm.selectedDocument}
                      onValueChange={(value) => setRegisterForm({ ...registerForm, selectedDocument: value })}
                      disabled={loadingBanks || questionBanks.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          loadingBanks ? '加载中...' : 
                          questionBanks.length === 0 ? '暂无可用题库' : 
                          '请选择题库'
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {questionBanks.map((bank) => (
                          <SelectItem key={bank.id} value={bank.id}>
                            {bank.filename}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      选择题库后，题目将从该题库中生成
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="register-sequential"
                      checked={registerForm.sequentialMode}
                      onCheckedChange={(checked) => setRegisterForm({ ...registerForm, sequentialMode: checked as boolean })}
                    />
                    <Label htmlFor="register-sequential" className="text-sm font-normal cursor-pointer">
                      按顺序出题（每个自然段至少一道题）
                    </Label>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? '注册中...' : '注册'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
