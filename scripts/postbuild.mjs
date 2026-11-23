#!/usr/bin/env node
// 빌드 후처리: 많은 검사 도구가 기본으로 찾는 /sitemap.xml 주소도 열리도록
// Astro가 만든 sitemap-index.xml을 sitemap.xml로 복사합니다. (내용 동일)

import { copyFile } from 'node:fs/promises';
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
