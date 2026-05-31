import sharp from 'sharp';
import { readFileSync } from 'fs';

const svg = readFileSync('icon.svg');

async function gen(size, file, paddingRatio = 0) {
  const pad = Math.round(size * paddingRatio);
  const inner = size - pad * 2;
  await sharp(svg)
    .resize(inner, inner)
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: '#060d1a' })
    .png()
    .toFile(`public/icons/${file}`);
  console.log(`wrote public/icons/${file}`);
}

await Promise.all([
  gen(192, 'icon-192.png'),
  gen(512, 'icon-512.png'),
  gen(512, 'icon-512-maskable.png', 0.1),  // content in inner 80%
  gen(180, 'apple-touch-icon.png'),
]);

console.log('done');
