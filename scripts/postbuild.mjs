#!/usr/bin/env node
// 빌드 후처리
// 1) 많은 검사 도구가 기본으로 찾는 /sitemap.xml 주소도 열리도록
//    Astro가 만든 sitemap-index.xml을 sitemap.xml로 복사합니다. (내용 동일)
// 2) 카드·목록용 작은 사진: 올린 사진(public/images/uploads)마다 가로 600px WebP를 '이름.w600.webp'로 만듭니다.
//    메인 화면 카드는 이 작은 사진을 써서, 1600px 원본을 받을 때보다 데이터가 훨씬 적게 듭니다.
//    (저장소에는 원본만 두고 배포본에만 만들기 때문에 저장소 용량은 늘지 않습니다)

import { copyFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const index = path.join(dist, 'sitemap-index.xml');

if (existsSync(index)) {
  await copyFile(index, path.join(dist, 'sitemap.xml'));
  console.log('[postbuild] sitemap.xml 생성 (sitemap-index.xml 복사)');
} else {
  console.log('[postbuild] sitemap-index.xml이 없어 건너뜁니다.');
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

const uploads = path.join(dist, 'images', 'uploads');
if (existsSync(uploads)) {
  const sharp = (await import('sharp')).default;
  let made = 0;
  let failed = 0;
  for await (const file of walk(uploads)) {
    if (!/\.(jpe?g|png|webp)$/i.test(file) || /\.w600\.webp$/i.test(file)) continue;
    const out = file.replace(/\.(jpe?g|png|webp)$/i, '.w600.webp');
    try {
      // 원본이 600px보다 작으면 키우지 않고 WebP로만 바꿉니다.
      await sharp(file).rotate().resize({ width: 600, withoutEnlargement: true }).webp({ quality: 78 }).toFile(out);
      made++;
    } catch (error) {
      // 작은 사진을 못 만들면 원본을 복사해 둬 카드 사진이 깨지지 않게 합니다.
      failed++;
      await copyFile(file, out).catch(() => {});
      console.log(`[postbuild] 작은 사진 만들기 실패(원본 사용): ${path.relative(dist, file)} — ${error?.message || error}`);
    }
  }
  if (made || failed) {
    console.log(`[postbuild] 카드용 작은 사진 ${made}장 생성${failed ? `, ${failed}장은 원본 사용` : ''}`);
  }
}
