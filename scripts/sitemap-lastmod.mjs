// 사이트맵 <lastmod>(마지막 수정일) 계산
// - 글 페이지: 실제 발행(또는 다시 올린) 시각 publishedAt, 없으면 작성일 pubDate
// - 홈·전체 글 목록: 가장 최근 글의 날짜 (새 글이 올라오면 바뀌는 페이지)
// - 소개 페이지: about.json 파일의 마지막 저장 시각(git 기록 우선)
// 비공개(draft: true) 글은 사이트맵에 없으므로 계산하지 않습니다.

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POSTS_DIR = path.join(ROOT, 'src/content/posts');

function toDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * 파일의 마지막 커밋 시각. 기록을 찾지 못하면 null(수정일을 넣지 않음).
 * 파일 수정 시각은 배포 서버에서 매번 '지금'이 되어 부정확하므로 쓰지 않습니다.
 */
function lastChanged(file) {
  try {
    const out = execSync(`git log -1 --format="%H %cI" -- "${file}"`, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (!out) return null;
    const [hash, iso] = out.split(' ');
    // 배포 서버는 최근 기록만 받아 오므로(shallow clone), 기록의 '경계' 커밋은 그 파일을 실제로 바꾼 커밋이 아닐 수 있습니다.
    // 경계 커밋이면 정확한 날짜를 알 수 없으므로 수정일을 넣지 않습니다.
    const shallowFile = path.join(ROOT, '.git', 'shallow');
    if (existsSync(shallowFile) && readFileSync(shallowFile, 'utf8').split(/\s+/).includes(hash)) return null;
    return new Date(iso);
  } catch {
    return null;
  }
}

/** @returns {{ byPath: Map<string, Date>, latest: Date | null, about: Date | null }} */
export function collectLastmod() {
  const byPath = new Map();
  let latest = null;
  if (existsSync(POSTS_DIR)) {
    for (const file of readdirSync(POSTS_DIR)) {
      if (!file.endsWith('.md')) continue;
      const text = readFileSync(path.join(POSTS_DIR, file), 'utf8');
      const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1];
      if (!fm) continue;
      let data;
      try {
        data = YAML.parse(fm) || {};
      } catch {
        continue;
      }
      if (data.draft === true) continue;
      const pub = toDate(data.pubDate);
      const published = toDate(data.publishedAt);
      const date = published && pub && published > pub ? published : pub ?? published;
      if (!date) continue;
      // 글 주소는 파일 이름(소문자)과 같습니다: /posts/<이름>/
      byPath.set(`/posts/${file.replace(/\.md$/, '').toLowerCase()}/`, date);
      if (!latest || date > latest) latest = date;
    }
  }
  const about = lastChanged(path.join(ROOT, 'src/data/about.json'));
  return { byPath, latest, about };
}

/** @astrojs/sitemap의 serialize 옵션: 각 주소에 lastmod를 붙입니다. */
export function lastmodSerializer(base = '/') {
  const { byPath, latest, about } = collectLastmod();
  const prefix = String(base || '/').replace(/\/+$/, '');
  return (item) => {
    let pathname = new URL(item.url).pathname;
    if (prefix && pathname.startsWith(prefix)) pathname = pathname.slice(prefix.length) || '/';
    let date = byPath.get(pathname);
    if (!date && (pathname === '/' || pathname === '/archive/')) date = latest;
    if (!date && pathname === '/about/') date = about;
    return date ? { ...item, lastmod: date.toISOString() } : item;
  };
}
