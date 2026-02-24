import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();

    // 获取所有学生用户（按总分降序排列）
    const { data: students, error } = await client
      .from('users')
      .select('id, username, total_score, created_at')
      .eq('role', 'student')
      .order('total_score', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: '数据库错误' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      students: students || [],
    });
  } catch (error) {
    console.error('Get students error:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
