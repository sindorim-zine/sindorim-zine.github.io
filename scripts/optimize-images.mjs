#!/usr/bin/env node
// public/images/uploads 안의 무거운 사진을 자동으로 압축합니다. (GitHub Actions에서 배포 전에 매번 실행)
// - Pages CMS로 직접 올린 사진(대표 사진, 메인 배너, ③ 사진 추가)과 기존 사진까지 처리
// - 확장자가 바뀌면(.png → .jpg 등) 게시글·설정 파일 안의 경로도 함께 고칩니다.
// - 이미 가벼운 사진은 건너뛰므로 여러 번 실행해도 안전합니다.
// - 어떤 경우에도 실패 코드를 내지 않습니다.

import { existsSync } from 'node:fs';
import { readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeExt, optimizeImage } from './lib/image-optimize.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UPLOADS = path.join(ROOT, 'public/images/uploads');
const REFERENCE_DIRS = ['src/content/posts', 'src/data', 'src/inbox'].map((d) => path.join(ROOT, d));
const TARGET_EXT = new Set(['jpg', 'jpeg', 'png', 'webp']);

const log = (...args) => console.log('[images]', ...args);
const kb = (n) => `${(n / 1024).toFixed(0)}KB`;

async function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

const toPublic = (abs) => '/' + path.relative(path.join(ROOT, 'public'), abs).split(path.sep).join('/');

/** 글·설정 파일에서 사진 경로를 바꿉니다. 공백·한글이 인코딩된(%20 등) 형태도 함께 찾습니다. */
async function replaceReferences(oldPublic, newPublic, { dryRun = false } = {}) {
  const forms = [...new Set([oldPublic, encodeURI(oldPublic)])];
  let count = 0;
  for (const dir of REFERENCE_DIRS) {
    for (const file of await walk(dir)) {
      if (!/\.(md|json)$/.test(file)) continue;
      const text = await readFile(file, 'utf8');
      if (!forms.some((f) => text.includes(f))) continue;
      count++;
      if (dryRun) continue;
      let next = text;
      for (const f of forms) next = next.split(f).join(f === oldPublic ? newPublic : encodeURI(newPublic));
      await writeFile(file, next, 'utf8');
    }
  }
  return count;
}

async function main() {
  const files = (await walk(UPLOADS)).filter((f) => TARGET_EXT.has(normalizeExt(path.extname(f))));
  let before = 0;
  let after = 0;
  let changed = 0;
  for (const file of files) {
    const ext = normalizeExt(path.extname(file));
    const input = await readFile(file);
    let result;
    try {
      result = await optimizeImage(input, ext);
    } catch (error) {
      log(`건너뜀 (${path.basename(file)}): ${error.message}`);
      continue;
    }
    if (!result.changed) continue;

    const target = result.ext === ext ? file : file.replace(/\.[^.]+$/, `.${result.ext}`);
    // 확장자가 바뀌는데 이 사진을 쓰는 글·설정을 찾지 못하면, 경로가 깨질 수 있으므로 원본을 그대로 둡니다.
    if (target !== file && (await replaceReferences(toPublic(file), '', { dryRun: true })) === 0) {
      log(`건너뜀 (${toPublic(file)}): 이 사진을 쓰는 글을 찾지 못해 형식을 바꾸지 않습니다.`);
      continue;
    }
    // 확장자가 바뀌는데 같은 이름의 파일이 이미 있으면 덮어쓰지 않도록 이름을 바꿉니다.
    const finalPath = target !== file && existsSync(target) ? target.replace(/(\.[^.]+)$/, `-o$1`) : target;
    await writeFile(finalPath, result.buffer);
    if (finalPath !== file) {
      await unlink(file);
      const refs = await replaceReferences(toPublic(file), toPublic(finalPath));
      log(`${toPublic(file)} → ${toPublic(finalPath)} (${kb(input.length)} → ${kb(result.buffer.length)}, 참조 ${refs}곳 수정)`);
    } else {
      log(`${toPublic(file)} (${kb(input.length)} → ${kb(result.buffer.length)})`);
    }
    before += input.length;
    after += result.buffer.length;
    changed++;
  }
  if (changed) log(`완료: ${changed}장 압축, ${kb(before)} → ${kb(after)} (${Math.round((1 - after / before) * 100)}% 절약)`);
  else log('압축할 무거운 사진이 없습니다.');
}

main()
  .catch((error) => console.warn('[images] 예상치 못한 오류(배포는 계속 진행):', error?.message || error))
  .finally(() => {
    process.exitCode = 0;
  });
