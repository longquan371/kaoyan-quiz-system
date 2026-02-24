import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const { username, password, volcengineApiKey, cozePatToken } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: '用户名和密码不能为空' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // 查询用户
    const { data: users, error } = await client
      .from('users')
      .select('*')
      .eq('username', username)
      .limit(1);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: '数据库错误' },
        { status: 500 }
      );
    }

    if (!users || users.length === 0) {
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    const user = users[0];

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    // 如果是学生，检查是否提供了 API Key 和 PAT 令牌
    if (user.role === 'student') {
      const updates: any = {};
      if (volcengineApiKey) {
        updates.volcengine_api_key = volcengineApiKey;
      }
      if (cozePatToken) {
        updates.coze_pat_token = cozePatToken;
      }

      if (Object.keys(updates).length > 0) {
        await client
          .from('users')
          .update(updates)
          .eq('id', user.id);
      }
    }

    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
