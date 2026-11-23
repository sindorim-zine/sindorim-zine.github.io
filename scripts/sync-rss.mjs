#!/usr/bin/env node
// 네이버 카페 RSS → Gemini AI 정제 → src/content/posts/*.md 자동 생성
//
// 환경변수
//   NAVER_CAFE_RSS_URL  RSS 주소 (여러 개면 콤마로 구분)
//   GEMINI_API_KEY      Google AI Studio API 키
//   GEMINI_MODEL        (선택) 기본 gemini-2.5-flash
//
// 설정이 비어 있거나 오류가 나도 절대 실패 코드(exit 1)를 내지 않습니다.
// 초기 세팅 단계에서도 빌드·배포가 멈추지 않도록 안내 로그만 남기고 정상 종료합니다.

import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Parser from 'rss-parser';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POSTS_DIR = path.join(ROOT, 'src/content/posts');
const RSS_IMAGE_DIR = path.join(ROOT, 'public/images/rss');
const SITE_CONFIG = path.join(ROOT, 'src/data/siteConfig.json');
const CACHE_DIR = path.join(ROOT, '.cache');
const NEW_URLS_FILE = path.join(CACHE_DIR, 'new-urls.json');

const MAX_ITEMS_PER_RUN = 5;
const DELAY_MS = 4000;
const FETCH_TIMEOUT_MS = 15000;
const IMAGE_TIMEOUT_MS = 10000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MODEL = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const MISSING_DETAIL_NOTICE = '자세한 일정과 세부 내용은 하단의 네이버 카페 원문 공지에서 확인하실 수 있습니다.';

const log = (...args) => console.log('[sync-rss]', ...args);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// process.exit()를 직접 부르면 Windows에서 네트워크 소켓 정리 중 비정상 종료(exit 127)될 수 있어
// 종료 코드만 0으로 정하고 자연스럽게 끝나도록 합니다.
function finish(message) {
  if (message) log(message);
  process.exitCode = 0;
}

process.on('unhandledRejection', (error) => {
  console.warn('[sync-rss] 예상치 못한 오류로 이번 수집을 건너뜁니다:', error?.message || error);
  process.exitCode = 0;
});

// ---------------------------------------------------------------------------
// 1. 환경변수 검증 (Graceful Skip)
// ---------------------------------------------------------------------------
function readFeedUrls() {
  return (process.env.NAVER_CAFE_RSS_URL || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => {
      try {
        const u = new URL(s);
        return u.protocol === 'https:' || u.protocol === 'http:';
      } catch {
        return false;
      }
    });
}

// ---------------------------------------------------------------------------
// 2. 인코딩 자동 판별 (UTF-8 / EUC-KR)
// ---------------------------------------------------------------------------
function detectCharset(buffer, contentType) {
  const fromHeader = /charset\s*=\s*["']?([\w-]+)/i.exec(contentType || '')?.[1];
  if (fromHeader) return fromHeader.toLowerCase();
  const head = new TextDecoder('latin1').decode(buffer.slice(0, 512));
  const fromXml = /encoding\s*=\s*["']([\w-]+)["']/i.exec(head)?.[1];
  if (fromXml) return fromXml.toLowerCase();
  return 'utf-8';
}

function decodeBuffer(arrayBuffer, contentType) {
  const bytes = new Uint8Array(arrayBuffer);
  let charset = detectCharset(bytes, contentType);
  if (['ks_c_5601-1987', 'ksc5601', 'cp949', 'x-windows-949', 'ms949'].includes(charset)) charset = 'euc-kr';
  try {
    const text = new TextDecoder(charset, { fatal: charset === 'utf-8' }).decode(bytes);
    return { text, charset };
  } catch {
    // UTF-8로 선언됐지만 깨지는 경우 EUC-KR로 재시도
    return { text: new TextDecoder('euc-kr').decode(bytes), charset: 'euc-kr(fallback)' };
  }
}

async function fetchFeed(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/rss+xml, application/xml, text/xml, */*' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const { text, charset } = decodeBuffer(await res.arrayBuffer(), res.headers.get('content-type'));
  const parser = new Parser();
  const feed = await parser.parseString(text.replace(/^﻿/, ''));
  log(`RSS 수신: ${url} (${charset}, ${feed.items?.length ?? 0}건)`);
  return feed.items ?? [];
}

// ---------------------------------------------------------------------------
// 3. HTML 정제
// ---------------------------------------------------------------------------
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', middot: '·', hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”' };

function decodeEntities(text) {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

function cleanHtml(html) {
  return decodeEntities(
    String(html || '')
      .replace(/<(script|style|iframe|noscript)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t ]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

function extractImageUrl(item) {
  const candidates = [item.enclosure?.url, item['media:content']?.$?.url, item['media:thumbnail']?.$?.url];
  const html = `${item['content:encoded'] || ''} ${item.content || ''} ${item.description || ''}`;
  for (const match of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) candidates.push(match[1]);
  for (const c of candidates) {
    if (!c) continue;
    const value = decodeEntities(c.trim()).replace(/^\/\//, 'https://');
    if (/^https?:\/\//i.test(value)) return value;
  }
  return null;
}

// ---------------------------------------------------------------------------
// 4. 중복 방지 (sourceGuid / originalUrl 대조)
// ---------------------------------------------------------------------------
function normalizeUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url.trim());
    u.hash = '';
    u.hostname = u.hostname.toLowerCase().replace(/^m\./, '');
    const params = [...u.searchParams.entries()].filter(([k]) => !/^(utm_|ref|fromList)/i.test(k));
    params.sort(([a], [b]) => a.localeCompare(b));
    u.search = params.length ? `?${new URLSearchParams(params)}` : '';
    return u.toString().replace(/\/+$/, '');
  } catch {
    return url.trim();
  }
}

function readFrontmatterValue(frontmatter, key) {
  const line = new RegExp(`^${key}\\s*:\\s*(.+)$`, 'm').exec(frontmatter)?.[1]?.trim();
  if (!line) return '';
  try {
    return line.startsWith('"') ? JSON.parse(line) : line.replace(/^'(.*)'$/, '$1');
  } catch {
    return line.replace(/^["']|["']$/g, '');
  }
}

async function loadExistingKeys() {
  const keys = new Set();
  const files = existsSync(POSTS_DIR) ? await readdir(POSTS_DIR) : [];
  for (const file of files.filter((f) => f.endsWith('.md'))) {
    const content = await readFile(path.join(POSTS_DIR, file), 'utf8');
    const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content)?.[1] ?? '';
    const guid = readFrontmatterValue(frontmatter, 'sourceGuid');
    const original = readFrontmatterValue(frontmatter, 'originalUrl');
    if (guid) keys.add(`guid:${guid.trim()}`);
    if (original) keys.add(`url:${normalizeUrl(original)}`);
  }
  return { keys, files: new Set(files) };
}

// ---------------------------------------------------------------------------
// 5. 네이버 이미지 핫링크 차단 우회 (로컬 저장)
// ---------------------------------------------------------------------------
const IMAGE_EXT = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp' };

async function downloadImage(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Referer: 'https://cafe.naver.com/', Accept: 'image/*' },
      signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const ext = IMAGE_EXT[type];
    if (!ext) throw new Error(`이미지 형식 아님 (${type || '알 수 없음'})`);
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 512 || buffer.length > MAX_IMAGE_BYTES) throw new Error(`이미지 크기 비정상 (${buffer.length} bytes)`);
    const name = `${createHash('sha1').update(url).digest('hex').slice(0, 16)}.${ext}`;
    await mkdir(RSS_IMAGE_DIR, { recursive: true });
    await writeFile(path.join(RSS_IMAGE_DIR, name), buffer);
    return `/images/rss/${name}`;
  } catch (error) {
    log(`  이미지 저장 실패 → 기본 일러스트로 대체 (${error.message})`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 6. Gemini: 개인정보 마스킹 · 할루시네이션 차단 · SEO 변환
// ---------------------------------------------------------------------------
function systemInstruction(categories) {
  return `당신은 서울 구로구 신도림동 지역 커뮤니티 '신도림 커뮤니티'(네이버 카페)의 공식 웹 아카이브 편집자입니다.
네이버 카페 RSS의 짧은 글 정보를 외부 독자와 AI 검색엔진이 이해하기 쉬운 공개용 기사로 다듬습니다.

[개인정보 보호 — 반드시 지킬 것]
- 일반 회원의 실명, 닉네임과 결합된 신상, 휴대폰·전화번호, 계좌번호, 이메일, 카카오톡 ID, 상세 주소(아파트 동·호수, 번지)를 절대 출력하지 마세요.
- 개인을 가리키는 표현은 "[회원]"으로 바꾸고, 번호·계좌·이메일은 완전히 삭제하거나 "[비공개]"로 표시하세요.
- 공식 단체명, 공공기관, 상호명, 공개 장소명(예: 도림천, 신도림역)처럼 공개된 정보만 남기세요.

[사실 창작 금지 — Strict Grounding]
- 입력 원문에 명시된 사실만 사용하세요. 날짜, 요일, 시간, 장소, 회비·가격, 인원, 준비물, 연락 방법 등 원문에 없는 구체적 정보를 절대 추측하거나 지어내지 마세요.
- 원문이 잘려 세부 정보를 확인할 수 없으면 본문 마지막 문단에 정확히 다음 문장을 넣으세요: "${MISSING_DETAIL_NOTICE}"
- 과장, 홍보성 수식어, 원문에 없는 의견을 덧붙이지 마세요.

[제목 최적화]
- cleanTitle: 카페 내부용 짧은 제목을, 외부 사용자가 ChatGPT나 Gemini에 질문할 법한 자연스러운 한국어 문장형 제목으로 다듬으세요. 원문 사실 범위 안에서 "신도림" 같은 지역·맥락 키워드를 자연스럽게 포함하세요. 40자 안팎.

[출력 필드]
- urlSlug: 제목 의미를 담은 영문 소문자·숫자·하이픈 3~6단어 (예: sindorim-dorimcheon-walking-meetup). 한글·공백·특수문자 금지.
- summary: 원문 사실만으로 쓴 정확히 3문장의 핵심 요약.
- category: 다음 중 하나만 선택: ${categories.join(', ')}
- markdownBody: 한국어 마크다운 본문. 첫 줄에 제목(#)을 쓰지 마세요. 필요하면 ## 소제목과 목록을 쓰되, 원문보다 길게 부풀리지 마세요.`;
}

async function transformWithGemini(ai, Type, categories, item) {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `다음은 네이버 카페 RSS 항목입니다. 규칙에 따라 JSON으로 변환하세요.\n\n제목: ${item.title}\n게시 카테고리(RSS): ${item.rssCategory || '없음'}\n원문 내용(일부일 수 있음):\n${item.text || '(본문 요약 없음)'}`,
          },
        ],
      },
    ],
    config: {
      systemInstruction: systemInstruction(categories),
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          cleanTitle: { type: Type.STRING, description: '외부 검색 최적화 한국어 제목' },
          urlSlug: { type: Type.STRING, description: '영문 소문자·숫자·하이픈 3~6단어' },
          summary: { type: Type.STRING, description: '원문 사실만 담은 3문장 요약' },
          category: { type: Type.STRING, enum: categories, description: '카테고리' },
          markdownBody: { type: Type.STRING, description: '마크다운 본문' },
        },
        required: ['cleanTitle', 'urlSlug', 'summary', 'category', 'markdownBody'],
        propertyOrdering: ['cleanTitle', 'urlSlug', 'summary', 'category', 'markdownBody'],
      },
    },
  });
  const raw = typeof response.text === 'string' ? response.text : '';
  const data = JSON.parse(raw);
  for (const key of ['cleanTitle', 'urlSlug', 'summary', 'category', 'markdownBody']) {
    if (typeof data[key] !== 'string' || !data[key].trim()) throw new Error(`응답 필드 누락: ${key}`);
  }
  return data;
}

// 모델 출력에 남은 개인정보 패턴을 한 번 더 기계적으로 가립니다(이중 안전장치).
// URL 안의 숫자(네이버 글 번호 등)는 건드리지 않고, 앞뒤가 숫자인 경우(날짜·금액 일부)는 가리지 않습니다.
function scrubPiiSegment(text) {
  return text
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[비공개]')
    // 휴대폰: 010-1234-5678, 01012345678, +82 10-1234-5678
    .replace(/(?<![\d-])(?:\+82[-\s]?1[016789]|01[016789])[-\s.]?\d{3,4}[-\s.]?\d{4}(?![\d-])/g, '[비공개]')
    // 지역번호 전화: 02-123-4567, 031-1234-5678 (구분자 필수)
    .replace(/(?<![\d-])0\d{1,2}[-\s.]\d{3,4}[-\s.]\d{4}(?![\d-])/g, '[비공개]')
    // 계좌번호 형태: 123-456-789012 (마지막 묶음 4자리 이상이라 날짜 2026-11-20은 제외)
    .replace(/(?<![\d-])\d{3,6}-\d{2,6}-\d{4,8}(?:-\d{1,6})?(?![\d-])/g, '[비공개]')
    // 상세 주소: 101동 1203호
    .replace(/\d{2,4}\s?동\s?\d{2,4}\s?호/g, '[비공개]');
}

function scrubPii(text) {
  return String(text)
    .split(/(https?:\/\/[^\s)<>"']+)/g)
    .map((part, i) => (i % 2 === 1 ? part : scrubPiiSegment(part)))
    .join('');
}

function toSlug(value, fallbackSeed) {
  const words = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 6);
  if (words.length >= 2) return words.join('-').slice(0, 80).replace(/-+$/, '');
  return `cafe-post-${createHash('sha1').update(fallbackSeed).digest('hex').slice(0, 8)}`;
}

function kstDate(date) {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function uniqueFilename(base, existingFiles) {
  let name = `${base}.md`;
  let n = 2;
  while (existingFiles.has(name) || existsSync(path.join(POSTS_DIR, name))) name = `${base}-${n++}.md`;
  existingFiles.add(name);
  return name;
}

function buildMarkdown({ title, pubDate, category, summary, thumbnail, originalUrl, sourceGuid, body }) {
  const lines = [
    '---',
    `title: ${JSON.stringify(title)}`,
    `pubDate: ${JSON.stringify(pubDate)}`,
    `category: ${JSON.stringify(category)}`,
    `summary: ${JSON.stringify(summary)}`,
    'pinned: false',
    'draft: false',
  ];
  if (thumbnail) lines.push(`thumbnail: ${JSON.stringify(thumbnail)}`);
  if (originalUrl) lines.push(`originalUrl: ${JSON.stringify(originalUrl)}`);
  if (sourceGuid) lines.push(`sourceGuid: ${JSON.stringify(sourceGuid)}`);
  lines.push('---', '', body.trim(), '');
  return lines.join('\n');
}

async function writeOutputs(newPaths) {
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(NEW_URLS_FILE, JSON.stringify(newPaths, null, 2));
  if (process.env.GITHUB_OUTPUT) {
    await writeFile(process.env.GITHUB_OUTPUT, `new_posts=${newPaths.length}\n`, { flag: 'a' });
  }
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  await writeOutputs([]);

  const feedUrls = readFeedUrls();
  if (feedUrls.length === 0) {
    return finish('NAVER_CAFE_RSS_URL이 비어 있거나 올바른 주소가 아닙니다. RSS 수집을 건너뜁니다. (GitHub Secrets에 등록하면 자동 수집이 시작됩니다)');
  }
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (apiKey.length < 20) {
    return finish('GEMINI_API_KEY가 비어 있거나 올바르지 않습니다. RSS 수집을 건너뜁니다. (Google AI Studio에서 키를 발급해 GitHub Secrets에 등록하세요)');
  }

  let siteConfig = {};
  try {
    siteConfig = JSON.parse(await readFile(SITE_CONFIG, 'utf8'));
  } catch {
    log('siteConfig.json을 읽지 못해 기본 카테고리를 사용합니다.');
  }
  const categories = Array.isArray(siteConfig.categories) && siteConfig.categories.length
    ? siteConfig.categories.filter((c) => typeof c === 'string' && c.trim())
    : ['공지사항', '모임·행사', '동네 소식', '생활 정보', '맛집·카페'];

  const { keys, files } = await loadExistingKeys();

  const collected = [];
  for (const url of feedUrls) {
    try {
      for (const item of await fetchFeed(url)) {
        const link = (item.link || '').trim();
        const guid = String(item.guid || item.id || link || '').trim();
        if (!guid && !link) continue;
        if ((guid && keys.has(`guid:${guid}`)) || (link && keys.has(`url:${normalizeUrl(link)}`))) continue;
        keys.add(`guid:${guid}`);
        if (link) keys.add(`url:${normalizeUrl(link)}`);
        const date = new Date(item.isoDate || item.pubDate || Date.now());
        collected.push({
          title: cleanHtml(item.title || '제목 없음'),
          link,
          guid,
          date: Number.isNaN(date.getTime()) ? new Date() : date,
          rssCategory: Array.isArray(item.categories) ? item.categories.map((c) => (typeof c === 'string' ? c : c?._ ?? '')).join(', ') : '',
          text: cleanHtml(item['content:encoded'] || item.content || item.contentSnippet || item.description || '').slice(0, 4000),
          imageUrl: extractImageUrl(item),
        });
      }
    } catch (error) {
      log(`RSS 수신 실패, 이 주소는 건너뜁니다: ${url} (${error.message})`);
    }
  }

  if (collected.length === 0) return finish('새로 발행할 글이 없습니다.');

  // 최신 글부터 처리해 새 소식이 먼저 올라오게 합니다. 남은 글은 다음 실행 때 이어서 처리됩니다.
  const queue = collected.sort((a, b) => b.date - a.date).slice(0, MAX_ITEMS_PER_RUN);
  log(`신규 후보 ${collected.length}건 중 ${queue.length}건을 처리합니다. (1회 최대 ${MAX_ITEMS_PER_RUN}건)`);

  let GoogleGenAI, Type;
  try {
    ({ GoogleGenAI, Type } = await import('@google/genai'));
  } catch (error) {
    return finish(`@google/genai SDK를 불러오지 못했습니다(npm install 필요). 이번 수집을 건너뜁니다: ${error.message}`);
  }
  const ai = new GoogleGenAI({ apiKey });

  await mkdir(POSTS_DIR, { recursive: true });
  const newPaths = [];

  for (const [index, item] of queue.entries()) {
    if (index > 0) await sleep(DELAY_MS);
    log(`(${index + 1}/${queue.length}) ${item.title}`);
    let result;
    try {
      result = await transformWithGemini(ai, Type, categories, item);
    } catch (error) {
      const message = error?.message || String(error);
      const status = Number(error?.status ?? error?.code);
      log(`  Gemini 변환 실패 → 다음 실행 때 다시 시도합니다 (${message.slice(0, 200)})`);
      if (status === 401 || status === 403 || /API_KEY_INVALID|API key not valid|PERMISSION_DENIED|UNAUTHENTICATED/i.test(message)) {
        log('  API 키 문제로 보여 이번 수집을 중단합니다. GEMINI_API_KEY를 확인하세요.');
        break;
      }
      continue;
    }

    const thumbnail = item.imageUrl ? await downloadImage(item.imageUrl) : null;
    const slug = toSlug(result.urlSlug, item.guid || item.link || item.title);
    const date = kstDate(item.date);
    const filename = uniqueFilename(`${date}-${slug}`, files);
    let body = scrubPii(result.markdownBody).replace(/^#\s+.*\n+/, '');
    if (!body.includes(MISSING_DETAIL_NOTICE) && item.link) body += `\n\n${MISSING_DETAIL_NOTICE}`;

    const markdown = buildMarkdown({
      title: scrubPii(result.cleanTitle).trim(),
      pubDate: item.date.toISOString(),
      category: categories.includes(result.category) ? result.category : categories[0],
      summary: scrubPii(result.summary).replace(/\s+/g, ' ').trim(),
      thumbnail,
      originalUrl: item.link,
      sourceGuid: item.guid,
      body,
    });
    await writeFile(path.join(POSTS_DIR, filename), markdown, 'utf8');
    newPaths.push(`/posts/${filename.replace(/\.md$/, '')}/`);
    log(`  저장 완료: src/content/posts/${filename}`);
  }

  await writeOutputs(newPaths);
  finish(`완료: 새 글 ${newPaths.length}건 생성`);
}

main().catch((error) => finish(`예상치 못한 오류로 이번 수집을 건너뜁니다: ${error?.message || error}`));
