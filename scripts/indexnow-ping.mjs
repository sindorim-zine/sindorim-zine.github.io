#!/usr/bin/env node
// IndexNow 실시간 색인 핑 (Bing · Naver · Yandex 등 IndexNow 참여 검색엔진에 새 URL을 즉시 알림)
//
// 사용법
//   node scripts/indexnow-ping.mjs              → .cache/new-urls.json(카페 글 올리기로 새로 발행된 글)을 전송
//   node scripts/indexnow-ping.mjs --changed    → 위 목록 + 직전 커밋에서 바뀐 게시글(Pages CMS 수정 등)을 함께 전송
//
// 키 우선순위: 환경변수 INDEXNOW_KEY → src/data/siteConfig.json의 indexNowKey
// 키가 없거나 전송에 실패해도 절대 실패 코드를 내지 않습니다.

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { siteRoot } from './site-url.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NEW_URLS_FILE = path.join(ROOT, '.cache/new-urls.json');
const SITE_CONFIG = path.join(ROOT, 'src/data/siteConfig.json');
const KEY_PATTERN = /^[A-Za-z0-9-]{8,128}$/;
const ENDPOINT = 'https://api.indexnow.org/indexnow';

const log = (...args) => console.log('[indexnow]', ...args);
// process.exit() 대신 종료 코드만 지정해 Windows 소켓 정리 중 비정상 종료를 피합니다.
const finish = (message) => {
  if (message) log(message);
  process.exitCode = 0;
};

async function resolveKey() {
  let key = (process.env.INDEXNOW_KEY || '').trim();
  if (!key) {
    try {
      key = String(JSON.parse(await readFile(SITE_CONFIG, 'utf8')).indexNowKey || '').trim();
    } catch {
      key = '';
    }
  }
  return KEY_PATTERN.test(key) ? key : '';
}

function changedPostPaths() {
  try {
    const output = execSync('git diff --name-only --diff-filter=AM HEAD~1 HEAD -- src/content/posts', {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return output
      .split('\n')
      .map((f) => f.trim())
      .filter((f) => f.endsWith('.md'))
      // 비공개(draft: true) 글은 사이트에 없으므로 알리지 않습니다.
      .filter((f) => {
        try {
          const content = readFileSync(path.join(ROOT, f), 'utf8');
          const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content)?.[1] ?? '';
          return !/^draft\s*:\s*true\s*$/m.test(frontmatter);
        } catch {
          return false;
        }
      })
      .map((f) => `/posts/${path.basename(f, '.md').toLowerCase()}/`);
  } catch {
    return [];
  }
}

async function main() {
  const key = await resolveKey();
  if (!key) return finish('INDEXNOW_KEY가 없어 색인 요청을 건너뜁니다. (Bing Webmaster Tools에서 키를 발급해 등록하면 자동 전송됩니다)');

  const root = siteRoot();
  if (!/^https:\/\//.test(root)) return finish(`배포 주소(${root})가 https가 아니어서 건너뜁니다. 로컬 실행에서는 정상입니다.`);

  let paths = [];
  if (existsSync(NEW_URLS_FILE)) {
    try {
      const fromInbox = JSON.parse(await readFile(NEW_URLS_FILE, 'utf8'));
      if (Array.isArray(fromInbox)) paths.push(...fromInbox);
    } catch {
      // 무시
    }
  }
  if (process.argv.includes('--changed')) paths.push(...changedPostPaths());
  paths = [...new Set(paths)];
  if (!Array.isArray(paths) || paths.length === 0) return finish('새로 알릴 URL이 없습니다.');

  // 새 글이 생기면 홈·llms.txt도 함께 갱신 요청합니다.
  const urlList = [...new Set([...paths, '/', '/llms.txt', '/llms-full.txt'])].map((p) => `${root}${p}`);
  const host = new URL(root).host;
  const keyLocation = `${root}/${key}.txt`; // 서브패스 포함 전체 주소 (403 방지)

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host, key, keyLocation, urlList }),
      signal: AbortSignal.timeout(15000),
    });
    log(`전송 결과 HTTP ${res.status} (${urlList.length}개 URL, keyLocation=${keyLocation})`);
    if (res.status === 403) log('403: 키 파일이 아직 배포되지 않았거나 키가 다릅니다. 배포가 끝난 뒤 다시 시도됩니다.');
    if (res.status === 422) log('422: URL이 host와 일치하지 않습니다. SITE_URL 설정을 확인하세요.');
  } catch (error) {
    log(`전송 실패(무시하고 계속): ${error.message}`);
  }
  finish();
}

main().catch((error) => finish(`예상치 못한 오류(무시): ${error?.message || error}`));
