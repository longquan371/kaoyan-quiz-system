'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Student {
  id: string;
  username: string;
  total_score: number;
  created_at: string;
}

export default function TeacherPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');

  useEffect(() => {
    // 检查老师登录状态
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'teacher') {
      router.push('/');
      return;
    }

    // 加载学生列表
    loadStudents();
  }, [router]);

  const loadStudents = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/teacher/students');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '加载学生列表失败');
      }

      setStudents(data.students || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError('');
    setUploadMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/teacher/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '上传失败');
      }

      setUploadMessage(`文件 "${file.name}" 上传成功！`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat bg-fixed p-4" style={{backgroundImage: 'url("/background-image.png")'}}>
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
              <p className="mt-4 text-gray-600 dark:text-gray-300">加载中...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed p-4" style={{backgroundImage: 'url("/background-image.png")'}}>
      <div className="max-w-6xl mx-auto py-8">
        {/* 顶部导航 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              老师后台
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              管理学生成绩和上传新题目
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            退出登录
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 学生成绩列表 */}
          <Card className="shadow-xl border-2">
            <CardHeader>
              <CardTitle>学生成绩</CardTitle>
              <CardDescription>查看所有学生的累计得分</CardDescription>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  暂无学生数据
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>用户名</TableHead>
                        <TableHead>总分</TableHead>
                        <TableHead>注册时间</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.username}</TableCell>
                          <TableCell>
                            <span
                              className={`font-bold ${
                                student.total_score >= 0
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`}
                            >
                              {student.total_score}
                            </span>
                          </TableCell>
                          <TableCell className="text-gray-600 dark:text-gray-400">
                            {new Date(student.created_at).toLocaleDateString('zh-CN')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 上传文档 */}
          <Card className="shadow-xl border-2">
            <CardHeader>
              <CardTitle>上传新题目文档</CardTitle>
              <CardDescription>
                上传 Word 文档（.docx），系统将根据文档内容生成题目
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file-upload">选择文件</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".docx"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </div>

              {uploadMessage && (
                <div className="p-4 bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800 rounded-lg">
                  <p className="text-green-600 dark:text-green-400 text-sm">
                    {uploadMessage}
                  </p>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800 rounded-lg">
                  <p className="text-red-600 dark:text-red-400 text-sm">
                    {error}
                  </p>
                </div>
              )}

              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <p>💡 提示：</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>只支持 .docx 格式的 Word 文档</li>
                  <li>文档内容应包含考研相关的知识点</li>
                  <li>上传后系统会自动生成选择题和填空题</li>
                </ul>
              </div>

              {isUploading && (
                <div className="flex items-center space-x-2">
                  <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">上传中...</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
