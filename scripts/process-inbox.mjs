#!/usr/bin/env node
// ✨ 카페 글 받아쓰기: 운영자가 Pages CMS에 붙여 넣은 카페 글(src/inbox/*.md)을
// Gemini로 정리해 게시글(src/content/posts/*.md)로 발행합니다.
//
// 운영자가 하는 일: 카페 글 주소 + 본문 붙여넣기 → 저장 (나머지는 이 스크립트가 처리)
//
// 처리 결과
//   성공  → 게시글 생성(또는 같은 카페 글 주소의 기존 글을 새 내용으로 교체) + 받아쓰기 항목 삭제
//   키 없음 → 발행하지 않고 '처리 상태'에 키 등록 안내 표시 (회원 이름은 AI만 가릴 수 있어 안전을 위해 대기)
//   AI 실패 → 받아쓰기 항목을 지우지 않고 '처리 상태'에 사유를 적어 둠 (다시 저장하거나 다음 날 아침 자동 재시도)
//
// 어떤 경우에도 실패 코드(exit 1)를 내지 않아 사이트 배포가 멈추지 않습니다.

import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import {
  DEFAULT_CATEGORIES,
  buildPostMarkdown,
  isAuthError,
  kstDateString,
  normalizeUrl,
  scrubPii,
  toSlug,
  writeWithGemini,
} from './lib/ai-writer.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INBOX_DIR = path.join(ROOT, 'src/inbox');
const POSTS_DIR = path.join(ROOT, 'src/content/posts');
const SITE_CONFIG = path.join(ROOT, 'src/data/siteConfig.json');
const CACHE_DIR = path.join(ROOT, '.cache');
const NEW_URLS_FILE = path.join(CACHE_DIR, 'new-urls.json');
const MAX_PER_RUN = 10;
const DELAY_MS = 4000;

const log = (...args) => console.log('[inbox]', ...args);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function splitFrontmatter(content) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(content);
  if (!match) return { data: {}, body: content };
  let data = {};
  try {
    data = YAML.parse(match[1]) || {};
  } catch {
    data = {};
  }
  return { data, body: match[2] || '' };
}

function asList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string' && v.trim());
  return typeof value === 'string' && value.trim() ? [value] : [];
}

function toDateString(value) {
  if (!value) return kstDateString();
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? kstDateString() : kstDateString(d);
}

async function loadCategories() {
  try {
    const config = JSON.parse(await readFile(SITE_CONFIG, 'utf8'));
    const list = Array.isArray(config.categories) ? config.categories.filter((c) => typeof c === 'string' && c.trim()) : [];
    return list.length ? list : DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

/** 같은 카페 글 주소로 이미 발행된 게시글 파일을 찾습니다(다시 올리면 새 내용으로 교체). */
async function findPostByOriginalUrl(url) {
  const target = normalizeUrl(url);
  if (!target || !existsSync(POSTS_DIR)) return null;
  for (const file of await readdir(POSTS_DIR)) {
    if (!file.endsWith('.md')) continue;
    const { data } = splitFrontmatter(await readFile(path.join(POSTS_DIR, file), 'utf8'));
    if (data.originalUrl && normalizeUrl(data.originalUrl) === target) return file;
  }
  return null;
}

function uniqueFilename(base) {
  let name = `${base}.md`;
  let n = 2;
  while (existsSync(path.join(POSTS_DIR, name))) name = `${base}-${n++}.md`;
  return name;
}

async function markFailed(file, raw, reason) {
  const { data, body } = splitFrontmatter(raw);
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const stamp = `${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일 ${String(kst.getUTCHours()).padStart(2, '0')}:${String(kst.getUTCMinutes()).padStart(2, '0')}`;
  data.aiStatus = `⚠️ ${stamp} AI 정리 실패: ${reason} — 이 글을 그대로 다시 저장하면 재시도하고, 아니면 내일 아침 8시에 자동으로 다시 시도합니다.`;
  await writeFile(path.join(INBOX_DIR, file), `---\n${YAML.stringify(data).trimEnd()}\n---\n\n${body.trim()}\n`, 'utf8');
}

async function main() {
  if (!existsSync(INBOX_DIR)) return log('받아쓰기 폴더가 없어 건너뜁니다.');
  const files = (await readdir(INBOX_DIR)).filter((f) => f.endsWith('.md')).sort();
  await mkdir(CACHE_DIR, { recursive: true });
  const newPaths = [];
  if (files.length === 0) {
    await writeFile(NEW_URLS_FILE, '[]');
    return log('새로 정리할 카페 글이 없습니다.');
  }

  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  const useAi = apiKey.length >= 20;
  if (!useAi) log('GEMINI_API_KEY가 없어 발행하지 않고 대기합니다. (GitHub Secrets에 키를 등록하면 처리됩니다)');

  const categories = await loadCategories();
  await mkdir(POSTS_DIR, { recursive: true });
  let aiBlocked = false;

  for (const [index, file] of files.slice(0, MAX_PER_RUN).entries()) {
    const raw = await readFile(path.join(INBOX_DIR, file), 'utf8');
    const { data, body } = splitFrontmatter(raw);
    const sourceText = String(body || '').trim();
    const originalUrl = typeof data.originalUrl === 'string' ? data.originalUrl.trim() : '';
    const hintTitle = typeof data.title === 'string' ? data.title.trim() : '';
    const hintCategory = typeof data.category === 'string' && categories.includes(data.category) ? data.category : '';
    const photos = asList(data.photos);
    const draft = data.publish === 'review';
    const pinned = data.pinned === true;
    const pubDate = toDateString(data.pubDate);

    log(`(${index + 1}/${files.length}) ${file}`);
    if (sourceText.length < 10) {
      await markFailed(file, raw, '카페 글 내용이 비어 있습니다. 본문을 붙여 넣어 주세요');
      continue;
    }

    if (!useAi) {
      await markFailed(file, raw, 'AI 키가 아직 등록되지 않았습니다 (GitHub Secrets에 GEMINI_API_KEY 등록 필요)');
      continue;
    }

    let result;
    if (!aiBlocked) {
      if (index > 0) await sleep(DELAY_MS);
      try {
        result = await writeWithGemini({ apiKey, categories, sourceText: scrubPii(sourceText).slice(0, 12000), hintTitle, hintCategory });
      } catch (error) {
        const message = (error?.message || String(error)).slice(0, 160);
        log(`  AI 정리 실패: ${message}`);
        if (isAuthError(error)) aiBlocked = true;
        await markFailed(file, raw, isAuthError(error) ? 'Gemini 키가 올바르지 않습니다 (GitHub Secrets의 GEMINI_API_KEY 확인)' : message);
        continue;
      }
    } else {
      await markFailed(file, raw, 'Gemini 키가 올바르지 않습니다 (GitHub Secrets의 GEMINI_API_KEY 확인)');
      continue;
    }

    const title = scrubPii(result.cleanTitle).trim();
    const category = hintCategory || (categories.includes(result.category) ? result.category : categories[0]);
    let markdownBody = scrubPii(result.markdownBody).replace(/^#\s+.*\n+/, '').trim();
    // 대표 사진 외 추가 사진은 본문 아래에 붙입니다.
    if (photos.length > 1) {
      markdownBody += `\n\n${photos.slice(1).map((p, i) => `![사진 ${i + 2}](${p})`).join('\n\n')}`;
    }

    const existing = originalUrl ? await findPostByOriginalUrl(originalUrl) : null;
    const filename = existing ?? uniqueFilename(`${pubDate}-${toSlug(result.urlSlug || '', originalUrl || title || file)}`);
    const markdown = buildPostMarkdown({
      title,
      pubDate,
      category,
      summary: scrubPii(result.summary).replace(/\s+/g, ' ').trim(),
      pinned,
      draft,
      thumbnail: photos[0],
      originalUrl,
      body: markdownBody,
    });
    await writeFile(path.join(POSTS_DIR, filename), markdown, 'utf8');
    await unlink(path.join(INBOX_DIR, file));
    if (!draft) newPaths.push(`/posts/${filename.replace(/\.md$/, '').toLowerCase()}/`);
    log(`  ${existing ? '기존 글 교체' : '새 글 발행'}: src/content/posts/${filename}${draft ? ' (비공개 저장)' : ''}`);
  }

  await writeFile(NEW_URLS_FILE, JSON.stringify(newPaths, null, 2));
  if (process.env.GITHUB_OUTPUT) await writeFile(process.env.GITHUB_OUTPUT, `published=${newPaths.length}\n`, { flag: 'a' });
  log(`완료: 공개 발행 ${newPaths.length}건`);
}

process.on('unhandledRejection', (error) => {
  console.warn('[inbox] 예상치 못한 오류(배포는 계속 진행):', error?.message || error);
  process.exitCode = 0;
});

main()
  .catch((error) => console.warn('[inbox] 예상치 못한 오류(배포는 계속 진행):', error?.message || error))
  .finally(() => {
    process.exitCode = 0;
  });
