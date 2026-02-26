import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

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

    // 创建上传目录（如果不存在）
    const fs = require('fs');
    const path = require('path');
    const uploadDir = path.join(process.cwd(), 'uploads');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 将文件保存到永久目录
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `${Date.now()}_${file.name}`;
    const filepath = path.join(uploadDir, filename);

    await writeFile(filepath, buffer);
    console.log(`File saved to: ${filepath}`);

    // 保存文件信息到数据库
    const client = getSupabaseClient();
    const { error } = await client.from('documents').insert({
      filename: file.name,
      file_url: filepath,
    });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: '保存文件信息失败' },
        { status: 500 }
      );
    }

    console.log(`Document saved successfully: ${file.name} -> ${filepath}`);

    return NextResponse.json({
      message: '文件上传成功',
      filename: file.name,
      filepath,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: '上传失败' },
      { status: 500 }
    );
  }
}
