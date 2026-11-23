// 붙여 넣은 카페 글 속 사진 처리
// - 마크다운 이미지 ![](url), HTML <img src>, 링크로 감싼 이미지 [![](img)](link), data:image(base64)를 찾아
// - 네이버 등 외부 이미지는 서버에서 내려받아 public/images/uploads/cafe/에 저장하고(외부 사이트 표시 차단 우회)
// - 본문에서는 [[사진N]] 표시로 바꿔 AI가 정리한 뒤에도 원래 위치에 다시 넣을 수 있게 합니다.

import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { optimizeImage } from './image-optimize.mjs';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const TIMEOUT_MS = 15000;
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_IMAGES = 30;
const EXT = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp' };

export const PLACEHOLDER = (n) => `[[사진${n}]]`;
const PLACEHOLDER_RE = /\[\[사진(\d+)\]\]/g;

// 링크로 감싼 이미지 → 이미지만 남김
const LINKED_IMAGE_RE = /\[\s*(!\[[^\]]*\]\([^)]*\))\s*\]\([^)]*\)/g;
// 마크다운 이미지 ![alt](url "title") / ![alt](<url>) 와 HTML <img src>를 본문 순서대로 한 번에 찾습니다.
const ANY_IMAGE_RE = /!\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+["'][^"']*["'])?\s*\)|<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;

/** 본문에서 사진을 찾아 [[사진N]] 표시로 바꿉니다. */
export function extractImages(markdown) {
  const urls = [];
  const indexOf = (url) => {
    const clean = url.trim().replace(/&amp;/g, '&');
    let i = urls.indexOf(clean);
    if (i === -1) {
      if (urls.length >= MAX_IMAGES) return null;
      urls.push(clean);
      i = urls.length - 1;
    }
    return i + 1;
  };
  const toPlaceholder = (_, mdUrl, htmlUrl) => {
    const n = indexOf(mdUrl || htmlUrl || '');
    return n ? `\n\n${PLACEHOLDER(n)}\n\n` : '';
  };
  const text = String(markdown ?? '')
    .replace(LINKED_IMAGE_RE, '$1')
    .replace(ANY_IMAGE_RE, toPlaceholder)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { text, urls };
}

/** AI에 보낼 텍스트: 남은 HTML 태그와 마크다운 잔여물을 정리합니다(사진 표시는 유지). */
export function toPlainForAi(text) {
  return String(text)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/[​‌‍﻿]/g, '') // 네이버 편집기가 넣는 보이지 않는 글자 제거
    // 네이버 복사 시 붙는 '[출처] … | 작성자 [닉네임](프로필 주소)'에서 작성자 정보는 AI에 보내지 않습니다.
    .replace(/\|?\s*작성자\s*\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\++(\[[^\]]+\]\([^)]+\))\++/g, '$1') // 네이버 밑줄 표시(++링크++) 정리
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t ]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

function naverSized(url) {
  try {
    const u = new URL(url);
    // 네이버 이미지 서버는 type 파라미터로 크기를 정합니다. 너무 큰 원본 대신 폭 1600px 버전을 받습니다.
    if (/(^|\.)pstatic\.net$/i.test(u.hostname) && /phinf/i.test(u.hostname)) u.searchParams.set('type', 'w1600');
    return u.toString();
  } catch {
    return url;
  }
}

let lastSize = 0;

async function downloadOne(url, uploadDir, publicPrefix) {
  // 이미 우리 저장소에 있는 사진(CMS 업로드)은 그대로 사용
  lastSize = 0;
  // '//host/…'(프로토콜 생략 주소)는 외부 이미지이므로 https로 받아 저장합니다.
  if (url.startsWith('//')) url = `https:${url}`;
  else if (url.startsWith('/')) return url;

  let buffer;
  let ext;
  if (url.startsWith('data:image/')) {
    const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(url);
    if (!m) throw new Error('지원하지 않는 data 이미지');
    ext = EXT[m[1].toLowerCase()];
    if (!ext) throw new Error(`지원하지 않는 형식 ${m[1]}`);
    buffer = Buffer.from(m[2], 'base64');
  } else if (/^https?:\/\//i.test(url)) {
    const get = (target) =>
      fetch(target, {
        headers: { 'User-Agent': USER_AGENT, Referer: 'https://cafe.naver.com/', Accept: 'image/*' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    const sized = naverSized(url);
    let res = await get(sized);
    // 일부 네이버 이미지 서버(링크 미리보기 썸네일 등)는 크기 지정을 받지 않으므로 원래 주소로 다시 받습니다.
    if (!res.ok && sized !== url) res = await get(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    ext = EXT[type];
    if (!ext) throw new Error(`이미지가 아님 (${type || '알 수 없음'})`);
    buffer = Buffer.from(await res.arrayBuffer());
  } else {
    throw new Error('알 수 없는 주소 형식');
  }

  if (buffer.length < 100 || buffer.length > MAX_BYTES) throw new Error(`크기 비정상 (${buffer.length} bytes)`);
  // 대표 사진 선택용 크기는 압축 전 원본 기준(사진다운 사진인지 판단), 저장은 압축본으로
  lastSize = buffer.length;
  try {
    const optimized = await optimizeImage(buffer, ext);
    buffer = optimized.buffer;
    ext = optimized.ext || ext;
  } catch {
    // 압축 실패 시 원본 저장
  }
  const name = `${createHash('sha1').update(buffer).digest('hex').slice(0, 16)}.${ext}`;
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, name), buffer);
  return `${publicPrefix}/${name}`;
}

/**
 * 사진들을 내려받아 로컬 경로 목록을 돌려줍니다. 실패한 사진은 null.
 * @returns {Promise<{ local: (string|null)[], failed: number }>}
 */
/** 링크 미리보기 썸네일(dthumb)·스티커처럼 기사 사진이 아닌 작은 이미지인지 */
function isDecorative(url) {
  try {
    const u = new URL(url);
    if (/^dthumb-phinf\./i.test(u.hostname)) return true; // 링크 미리보기 카드 썸네일
    if (/storep-phinf|sticker|emoticon/i.test(u.hostname + u.pathname)) return true; // 네이버 스티커·이모티콘
  } catch {
    // 상대 경로·data URI 등은 해당 없음
  }
  return false;
}

export async function downloadImages(urls, { root, log = () => {} }) {
  const uploadDir = path.join(root, 'public/images/uploads/cafe');
  const local = [];
  const sizes = [];
  let failed = 0;
  for (const [i, url] of urls.entries()) {
    if (isDecorative(url)) {
      local.push(null);
      sizes.push(0);
      log(`  사진 ${i + 1}: 링크 미리보기·스티커 이미지라 제외`);
      continue;
    }
    try {
      const saved = await downloadOne(url, uploadDir, '/images/uploads/cafe');
      local.push(saved);
      sizes.push(lastSize);
    } catch (error) {
      failed++;
      local.push(null);
      sizes.push(0);
      log(`  사진 ${i + 1} 내려받기 실패 → 본문에서 제외 (${error.message})`);
    }
  }
  return { local, sizes, failed };
}

/** 대표 사진: 본문 사진 중 충분히 큰(20KB 이상) 첫 사진, 없으면 가장 큰 사진 */
export function pickThumbnail(local, sizes) {
  const candidates = local.map((src, i) => ({ src, size: sizes[i] || 0 })).filter((c) => c.src);
  if (!candidates.length) return undefined;
  const big = candidates.find((c) => c.size >= 20 * 1024 || c.src.startsWith('/images/uploads/') && !c.src.startsWith('/images/uploads/cafe/'));
  return (big ?? candidates.sort((a, b) => b.size - a.size)[0]).src;
}

/** AI가 정리한 본문의 [[사진N]] 표시를 실제 사진으로 바꾸고, 빠진 사진은 끝에 붙입니다. */
/** 이미지 설명(alt)용 글자: 마크다운을 깨뜨리는 괄호는 빼고 적당한 길이로 */
export function altText(title, n) {
  const base = String(title || '').replace(/[[\]()<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
  return base ? `${base} 사진 ${n}` : `사진 ${n}`;
}

export function restoreImages(markdown, local, title = '') {
  const used = new Set();
  // 설명(alt)의 번호는 실제로 보이는 사진 순서대로 1, 2, 3… (제외된 사진 때문에 번호가 건너뛰지 않게)
  let shown = 0;
  let out = String(markdown).replace(PLACEHOLDER_RE, (_, n) => {
    const i = Number(n) - 1;
    const src = local[i];
    if (!src || used.has(i)) return '';
    used.add(i);
    return `\n\n![${altText(title, ++shown)}](${src})\n\n`;
  });
  const missing = local.map((src, i) => (src && !used.has(i) ? `![${altText(title, ++shown)}](${src})` : null)).filter(Boolean);
  if (missing.length) out += `\n\n${missing.join('\n\n')}`;
  return out.replace(/\n{3,}/g, '\n\n').trim();
}
