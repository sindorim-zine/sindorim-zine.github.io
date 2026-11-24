#!/usr/bin/env node
// 🔎 외부 행사 후보 검토: 신커 주최가 아닌 축제·공연·전시·팝업·공공 체험 모집 소식을
// '미리 알리되 가는 것은 회원의 선택'으로 남기기 위한 검토 대기열(src/candidates/*.md)을 관리합니다.
//
// 후보가 들어오는 길
//   ① 공공 API 자동 수집 (--collect, 매일 아침 예약 실행 때만) — scripts/lib/event-sources.mjs
//   ② 운영진 제보 — Pages CMS에서 공식 안내 주소 + 안내문 붙여넣기 → 저장
//
// 이 스크립트가 하는 일 (CMS에서 저장할 때마다, 그리고 매일 아침 실행)
//   검토 대기 + 아직 AI 정리 전 → AI가 제목·3줄 요약·일정·장소·요금을 정리하고 '광고성 의심' 정도를 표시
//   ✅ 공개      → '가볼 만한 행사' 글로 발행(외부 행사 표시) 후 후보 삭제
//   🚫 제외      → 후보 삭제 + 같은 행사가 다시 수집되지 않게 기억
//   행사가 이미 끝난 검토 대기 후보 → 자동 삭제
//
// 공개 여부는 언제나 사람이 정합니다. AI는 정리와 참고 표시만 합니다.
// 어떤 경우에도 실패 코드(exit 1)를 내지 않아 사이트 배포가 멈추지 않습니다.

import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import {
  EXTERNAL_CATEGORY,
  buildPostMarkdown,
  cleanEventDates,
  fixEscapedNewlines,
  isAuthError,
  kstDateString,
  normalizeUrl,
  screenEventWithGemini,
  scrubPii,
  toSlug,
} from './lib/ai-writer.mjs';
import { collectEvents } from './lib/event-sources.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CANDIDATE_DIR = path.join(ROOT, 'src/candidates');
const SEEN_FILE = path.join(CANDIDATE_DIR, '_seen.json');
const POSTS_DIR = path.join(ROOT, 'src/content/posts');
const NEW_URLS_FILE = path.join(ROOT, '.cache/new-urls.json');
const MAX_AI_PER_RUN = 12;
const MAX_PENDING = 40; // 검토 대기 후보가 이보다 많으면 자동 수집을 쉬어 운영진 부담을 줄입니다.
const SEEN_KEEP_DAYS = 400;
const DELAY_MS = 4000;

const log = (...args) => console.log('[candidates]', ...args);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const today = kstDateString();

// 광고성 1차 표시용 키워드 (AI 판단과 함께 운영진에게 참고로 보여 줍니다. 자동으로 지우지는 않습니다)
const AD_WORDS = ['분양', '모델하우스', '보험', '대출', '투자', '재테크', '상담 예약', '무료 상담', '가입 시', '회원가입', '앱 설치', '앱 다운로드', '수강생 모집', '원데이 클래스', '체험단 모집', '리뷰 작성', '협찬', '할인 쿠폰', '선착순 할인', '구매 시', '결제 시'];

function splitFrontmatter(content) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(content);
  if (!match) return { data: {}, body: content };
  try {
    return { data: YAML.parse(match[1]) || {}, body: match[2] || '' };
  } catch {
    return { data: {}, body: match[2] || '' };
  }
}

const str = (v) => (typeof v === 'string' ? v.trim() : v instanceof Date && !Number.isNaN(v.getTime()) ? v.toISOString().slice(0, 10) : '');
const day = (v) => {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(str(v));
  return m ? m[1] : '';
};

function serialize(data, body) {
  const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  return `---\n${YAML.stringify(clean).trimEnd()}\n---\n\n${String(body || '').trim()}\n`;
}

function adWordsIn(text) {
  const t = String(text || '');
  return AD_WORDS.filter((w) => t.includes(w));
}

function aiCheckText(adRisk, adReason, words) {
  const icon = adRisk === '높음' ? '🔴' : adRisk === '보통' ? '🟡' : adRisk === '낮음' ? '🟢' : '⚪';
  const parts = [`${icon} 광고성 ${adRisk || '미판정'}`];
  if (adReason) parts.push(adReason);
  if (words.length) parts.push(`주의 단어: ${words.join(', ')}`);
  return parts.join(' — ');
}

function stamp() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return `${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일 ${String(kst.getUTCHours()).padStart(2, '0')}:${String(kst.getUTCMinutes()).padStart(2, '0')}`;
}

/** 같은 행사를 가리키는 열쇠: 수집 출처의 고유 번호, 없으면 공식 안내 주소 */
const keyOf = (data) => str(data.sourceId) || (str(data.originalUrl) ? `url:${normalizeUrl(str(data.originalUrl))}` : '');

async function loadSeen() {
  try {
    const raw = JSON.parse(await readFile(SEEN_FILE, 'utf8'));
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  } catch {
    return {};
  }
}

async function saveSeen(seen) {
  const cutoff = kstDateString(new Date(Date.now() - SEEN_KEEP_DAYS * 86400000));
  const kept = Object.fromEntries(Object.entries(seen).filter(([, d]) => typeof d === 'string' && d >= cutoff).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(SEEN_FILE, `${JSON.stringify(kept, null, 2)}\n`, 'utf8');
}

async function publishedUrls() {
  const urls = new Set();
  if (!existsSync(POSTS_DIR)) return urls;
  for (const file of await readdir(POSTS_DIR)) {
    if (!file.endsWith('.md')) continue;
    const { data } = splitFrontmatter(await readFile(path.join(POSTS_DIR, file), 'utf8'));
    if (data.originalUrl) urls.add(`url:${normalizeUrl(String(data.originalUrl))}`);
  }
  return urls;
}

function uniquePostFilename(base) {
  let name = `${base}.md`;
  let n = 2;
  while (existsSync(path.join(POSTS_DIR, name))) name = `${base}-${n++}.md`;
  return name;
}

function uniqueCandidateFilename(base) {
  let name = `${base}.md`;
  let n = 2;
  while (existsSync(path.join(CANDIDATE_DIR, name))) name = `${base}-${n++}.md`;
  return name;
}

/** AI로 후보를 정리해 비어 있는 칸을 채웁니다(운영진이 이미 적은 칸은 그대로 둡니다). */
async function screen(data, body, apiKey) {
  const facts = [
    data.title && `제목: ${data.title}`,
    data.eventDate && `시작일: ${day(data.eventDate)}`,
    data.eventEndDate && `종료일: ${day(data.eventEndDate)}`,
    data.eventLocation && `장소: ${data.eventLocation}`,
    data.organizer && `주최: ${data.organizer}`,
    data.feeInfo && `요금: ${data.feeInfo}`,
    data.sourceName && `자료 제공처(주최 아님, 주최 칸에 쓰지 말 것): ${data.sourceName}`,
    data.originalUrl && `공식 안내 주소: ${data.originalUrl}`,
  ].filter(Boolean);
  const sourceText = scrubPii([...facts, '', String(body || '')].join('\n')).slice(0, 12000);
  const r = await screenEventWithGemini({ apiKey, sourceText, today });
  const dates = cleanEventDates(r, today);
  const next = { ...data };
  if (!str(next.title)) next.title = scrubPii(r.title).trim();
  if (!str(next.summary)) next.summary = scrubPii(fixEscapedNewlines(r.summary)).replace(/\s+/g, ' ').trim();
  if (!day(next.eventDate) && dates.eventDate) {
    next.eventDate = dates.eventDate;
    if (dates.eventEndDate) next.eventEndDate = dates.eventEndDate;
  }
  if (!str(next.eventLabel) && dates.eventLabel) next.eventLabel = dates.eventLabel;
  if (!str(next.eventLocation) && dates.eventLocation) next.eventLocation = dates.eventLocation;
  // 자료 제공처(서울 열린데이터광장 등)를 주최로 잘못 적는 경우는 버립니다.
  const aiOrganizer = str(r.organizer);
  const isSourceName = aiOrganizer && (aiOrganizer === str(data.sourceName) || /열린데이터광장|TourAPI|공공서비스예약 정보|KOPIS/.test(aiOrganizer));
  if (!str(next.organizer) && aiOrganizer && !isSourceName) next.organizer = aiOrganizer.slice(0, 80);
  if (!str(next.feeInfo) && str(r.feeInfo)) next.feeInfo = str(r.feeInfo).slice(0, 80);
  next.aiCheck = aiCheckText(r.adRisk, str(r.adReason), adWordsIn(`${body}\n${next.title}\n${next.summary}`));
  next.aiDone = true;
  const organized = scrubPii(fixEscapedNewlines(r.body)).replace(/^#\s+.*\n+/, '').trim();
  return { data: next, body: organized || body };
}

function publishPost(data, body) {
  const title = str(data.title);
  const pubDate = today;
  const dates = cleanEventDates(
    { eventDate: day(data.eventDate), eventEndDate: day(data.eventEndDate), eventLabel: str(data.eventLabel) || '행사 기간', eventLocation: str(data.eventLocation) },
    pubDate,
  );
  const slug = toSlug(str(data.urlSlug), str(data.originalUrl) || title).replace(/^cafe-post-/, 'event-');
  const filename = uniquePostFilename(`${pubDate}-${slug}`);
  const markdown = buildPostMarkdown({
    title,
    pubDate,
    publishedAt: new Date().toISOString(),
    ...dates,
    category: EXTERNAL_CATEGORY,
    summary: str(data.summary),
    pinned: false,
    draft: false,
    thumbnail: str(data.thumbnail),
    originalUrl: str(data.originalUrl),
    body: scrubPii(String(body || '').trim()) || str(data.summary),
    external: true,
    organizer: str(data.organizer),
    sourceName: str(data.sourceName) || '운영진 제보',
    feeInfo: str(data.feeInfo),
  });
  return { filename, markdown };
}

async function collect(seen, apiKeyForAi) {
  const pending = (await readdir(CANDIDATE_DIR)).filter((f) => f.endsWith('.md'));
  if (pending.length >= MAX_PENDING) {
    log(`검토 대기 후보가 ${pending.length}건이라 오늘은 새로 수집하지 않습니다. (운영진 검토 후 다시 수집)`);
    return 0;
  }
  const known = new Set([...Object.keys(seen), ...(await publishedUrls())]);
  for (const file of pending) {
    const { data } = splitFrontmatter(await readFile(path.join(CANDIDATE_DIR, file), 'utf8'));
    const key = keyOf(data);
    if (key) known.add(key);
    if (data.originalUrl) known.add(`url:${normalizeUrl(String(data.originalUrl))}`);
  }
  // 하루에 AI가 정리할 수 있는 만큼만 새로 넣습니다(운영진이 하루에 훑어볼 수 있는 양).
  const limit = Math.min(MAX_AI_PER_RUN, MAX_PENDING - pending.length);
  const items = await collectEvents({ today, log, limit, isKnown: (item) => known.has(item.sourceId) || (item.originalUrl && known.has(`url:${normalizeUrl(item.originalUrl)}`)) });
  for (const item of items) {
    const { body, ...data } = item;
    const words = adWordsIn(`${data.title}\n${body}`);
    const source = String(data.sourceId).split(':')[0];
    const file = uniqueCandidateFilename(`${today.replaceAll('-', '')}-${source}-${createHash('sha1').update(String(data.sourceId)).digest('hex').slice(0, 8)}`);
    const front = {
      decision: 'pending',
      ...data,
      collectedAt: today,
      aiDone: false,
      aiCheck: apiKeyForAi ? '' : aiCheckText('', '', words),
      aiStatus: apiKeyForAi ? '⏳ AI 정리 대기' : 'AI 키가 없어 원문 그대로입니다. 내용을 확인하고 공개 여부를 골라 주세요.',
    };
    await writeFile(path.join(CANDIDATE_DIR, file), serialize(front, body), 'utf8');
    known.add(data.sourceId);
  }
  log(`자동 수집: 새 후보 ${items.length}건`);
  return items.length;
}

async function main() {
  await mkdir(CANDIDATE_DIR, { recursive: true });
  await mkdir(path.dirname(NEW_URLS_FILE), { recursive: true });
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  const useAi = apiKey.length >= 20;
  const seen = await loadSeen();

  if (process.argv.includes('--collect')) {
    try {
      await collect(seen, useAi);
    } catch (error) {
      log('자동 수집 중 오류(건너뜀):', error?.message || error);
    }
  }

  const files = (await readdir(CANDIDATE_DIR)).filter((f) => f.endsWith('.md')).sort();
  const newPaths = [];
  let aiCalls = 0;
  let aiBlocked = !useAi;

  for (const file of files) {
    const full = path.join(CANDIDATE_DIR, file);
    const raw = await readFile(full, 'utf8');
    let { data, body } = splitFrontmatter(raw);
    const decision = str(data.decision) || 'pending';
    const key = keyOf(data);

    if (decision === 'reject') {
      if (key) seen[key] = today;
      await unlink(full);
      log(`제외: ${file} ${str(data.title)}`);
      continue;
    }

    // 운영진이 '공개'를 골랐는데 아직 정리 전이면(제보를 바로 공개로 저장한 경우) AI 정리를 먼저 합니다.
    const needsAi = !data.aiDone && String(body || '').trim().length >= 10;
    if (needsAi && !aiBlocked && aiCalls < MAX_AI_PER_RUN) {
      if (aiCalls > 0) await sleep(DELAY_MS);
      aiCalls++;
      try {
        ({ data, body } = await screen(data, body, apiKey));
        data.aiStatus = decision === 'publish' ? '' : `✅ ${stamp()} AI 정리 완료 — 내용과 광고성 표시를 확인한 뒤 '✅ 공개' 또는 '🚫 제외'로 바꿔 저장하세요.`;
        log(`AI 정리: ${file} → ${data.title}`);
      } catch (error) {
        const message = (/"message"\s*:\s*"([^"]+)"/.exec(error?.message || '')?.[1] || error?.message || String(error)).slice(0, 200);
        if (isAuthError(error)) aiBlocked = true;
        data.aiStatus = `⚠️ ${stamp()} AI 정리 실패: ${isAuthError(error) ? 'Gemini 키 확인 필요' : message} — 다시 저장하면 재시도합니다.`;
        await writeFile(full, serialize(data, body), 'utf8');
        if (decision !== 'publish') continue;
      }
    } else if (needsAi && !useAi && !str(data.aiCheck)) {
      data.aiCheck = aiCheckText('', '', adWordsIn(`${body}\n${str(data.title)}`));
    }

    if (decision === 'publish') {
      if (!str(data.title) || !str(data.summary)) {
        data.decision = 'pending';
        data.aiStatus = `⚠️ ${stamp()} 제목과 3줄 요약이 있어야 공개할 수 있습니다. 두 칸을 채운 뒤 다시 '✅ 공개'로 저장해 주세요.`;
        await writeFile(full, serialize(data, body), 'utf8');
        continue;
      }
      const { filename, markdown } = publishPost(data, body);
      await writeFile(path.join(POSTS_DIR, filename), markdown, 'utf8');
      await unlink(full);
      if (key) seen[key] = today;
      newPaths.push(`/posts/${filename.replace(/\.md$/, '').toLowerCase()}/`);
      log(`공개: src/content/posts/${filename}`);
      continue;
    }

    // 검토 대기: 행사가 이미 끝났으면 정리합니다.
    // 날짜를 모르는 후보는 들어온 지 30일이 지나면 정리합니다.
    const lastDay = day(data.eventEndDate) || day(data.eventDate);
    const addedOn = day(data.collectedAt) || (/^(\d{4})(\d{2})(\d{2})/.exec(file)?.slice(1).join('-') ?? '');
    const staleUndated = !lastDay && addedOn && addedOn < kstDateString(new Date(Date.now() - 30 * 86400000));
    if ((lastDay && lastDay < today) || staleUndated) {
      if (key) seen[key] = today;
      await unlink(full);
      log(`기간 지남 → 삭제: ${file}`);
      continue;
    }
    const next = serialize(data, body);
    if (next !== raw) await writeFile(full, next, 'utf8');
  }

  await saveSeen(seen);
  if (newPaths.length) {
    let existing = [];
    try {
      existing = JSON.parse(await readFile(NEW_URLS_FILE, 'utf8'));
    } catch {}
    await writeFile(NEW_URLS_FILE, JSON.stringify([...(Array.isArray(existing) ? existing : []), ...newPaths], null, 2));
  }
  log(`완료: 공개 ${newPaths.length}건, AI 정리 ${aiCalls}건`);
}

main()
  .catch((error) => console.warn('[candidates] 예상치 못한 오류(배포는 계속 진행):', error?.message || error))
  .finally(() => {
    process.exitCode = 0;
  });
