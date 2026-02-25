import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();

    // 获取所有文档作为题库
    const { data: documents, error } = await client
      .from('documents')
      .select('id, filename, uploaded_at')
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: '获取题库列表失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      questionBanks: documents || [],
    });
  } catch (error) {
    console.error('Get question banks error:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
