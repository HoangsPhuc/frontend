import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const INPUT_PATH = path.join(process.cwd(), 'public', 'logo.jpg');
const OUT_192 = path.join(process.cwd(), 'public', 'icon-192x192.png');
const OUT_512 = path.join(process.cwd(), 'public', 'icon-512x512.png');

async function main() {
  if (!fs.existsSync(INPUT_PATH)) {
    console.error('❌ logo.jpg not found in public directory!');
    process.exit(1);
  }

  try {
    // Generate 512x512
    await sharp(INPUT_PATH)
      .resize(512, 512, { fit: 'cover' })
      .png()
      .toFile(OUT_512);

    // Generate 192x192
    await sharp(INPUT_PATH)
      .resize(192, 192, { fit: 'cover' })
      .png()
      .toFile(OUT_192);

    console.log('✅ Generated icon-192x192.png and icon-512x512.png successfully!');
  } catch (error) {
    console.error('❌ Error generating icons:', error);
  }
}

main();
