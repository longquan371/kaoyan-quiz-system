'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: '',
    cozeApiKey: '',
  });
  const [registerForm, setRegisterForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    cozeApiKey: '',
  });

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
          cozeApiKey: loginForm.cozeApiKey,
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

    if (!registerForm.cozeApiKey) {
      setError('请输入豆包API Key');
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
          cozeApiKey: registerForm.cozeApiKey,
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            考研自测系统
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            AI 智能出题，助力考研复习
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
                    <Label htmlFor="login-apikey">豆包 API Key（学生必填）</Label>
                    <Input
                      id="login-apikey"
                      type="password"
                      placeholder="请输入您的豆包API Key（格式：pat_xxx...）"
                      value={loginForm.cozeApiKey}
                      onChange={(e) => setLoginForm({ ...loginForm, cozeApiKey: e.target.value })}
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                      <p>⚠️ 老师无需填写，学生必须填写才能使用AI出题</p>
                      <p className="text-orange-600 dark:text-orange-400">
                        💡 格式要求：以 <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">pat_</code> 开头
                      </p>
                      <p>
                        📖 获取方式：<a href="https://www.coze.cn/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">登录豆包官网 → 个人中心 → API管理 → 创建API Key</a>
                      </p>
                    </div>
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
                      placeholder="请输入密码"
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
                    <Label htmlFor="register-apikey">豆包 API Key *</Label>
                    <Input
                      id="register-apikey"
                      type="password"
                      placeholder="请输入您的豆包API Key（格式：pat_xxx...）"
                      value={registerForm.cozeApiKey}
                      onChange={(e) => setRegisterForm({ ...registerForm, cozeApiKey: e.target.value })}
                      required
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                      <p>⚠️ 学生账户必须填写豆包API Key才能使用AI出题功能</p>
                      <p className="text-orange-600 dark:text-orange-400">
                        💡 格式要求：以 <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">pat_</code> 开头
                      </p>
                      <p>
                        📖 获取方式：<a href="https://www.coze.cn/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">登录豆包官网 → 个人中心 → API管理 → 创建API Key</a>
                      </p>
                    </div>
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
