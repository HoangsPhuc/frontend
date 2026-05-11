import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy file' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Tạo tên file duy nhất tránh trùng lặp
    const uniqueName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    
    // Đảm bảo thư mục tồn tại
    await mkdir(uploadDir, { recursive: true });
    
    const filePath = join(uploadDir, uniqueName);
    await writeFile(filePath, buffer);

    // Trả về đường dẫn để lưu vào DB
    return NextResponse.json({ success: true, url: `/uploads/${uniqueName}` });
  } catch (e) {
    console.error('Upload error:', e);
    return NextResponse.json({ success: false, error: 'Lỗi tải ảnh lên' }, { status: 500 });
  }
}
