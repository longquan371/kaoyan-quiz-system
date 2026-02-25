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

    // 如果没有文档，使用默认示例文档
    if (!documents || documents.length === 0) {
      return NextResponse.json({
        questionBanks: [
          {
            id: 'default',
            filename: '示例考研题',
            uploaded_at: new Date().toISOString(),
          },
        ],
      });
    }

    // 添加默认选项
    const questionBanks = [
      {
        id: 'default',
        filename: '示例考研题',
        uploaded_at: new Date().toISOString(),
      },
      ...documents.map((doc: any) => ({
        id: doc.id,
        filename: doc.filename,
        uploaded_at: doc.uploaded_at,
      })),
    ];

    return NextResponse.json({
      questionBanks,
    });
  } catch (error) {
    console.error('Get question banks error:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
