import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    console.log('=== Upload Debug Start ===');
    console.log('Received file:', file ? file.name : 'null');
    console.log('File type:', file?.type);
    console.log('File size:', file?.size);

    if (!file) {
      return NextResponse.json(
        { error: '请选择文件' },
        { status: 400 }
      );
    }

    // 检查文件类型
    if (!file.name.endsWith('.docx')) {
      return NextResponse.json(
        { error: '只支持 .docx 格式的 Word 文档' },
        { status: 400 }
      );
    }

    console.log('File type check passed');

    // 获取文件内容
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    console.log('File buffer size:', buffer.length);

    // 使用简单的文件名
    const filename = `${Date.now()}_${file.name}`;
    const filepath = `/opt/kaoyan-quiz-system/uploads/${filename}`;

    console.log('Saving file to:', filepath);

    // 写入文件
    const fs = require('fs');
    fs.writeFileSync(filepath, buffer);

    console.log('File saved successfully');

    // 保存到数据库
    const client = getSupabaseClient();
    console.log('Connecting to Supabase...');

    const { error } = await client.from('documents').insert({
      filename: file.name,
      file_url: filepath,
    });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: `数据库错误: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('Database save successful');
    console.log('=== Upload Debug End ===');

    return NextResponse.json({
      message: '文件上传成功',
      filename: file.name,
      filepath,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: `上传失败: ${error.message}` },
      { status: 500 }
    );
  }
}
