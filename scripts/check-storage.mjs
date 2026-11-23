#!/usr/bin/env node
// 용량 점검: GitHub Pages 무료 한도(사이트 1GB, 저장소 1GB 권장)에 가까워지면 알려 줍니다.
// - 매 배포마다 GitHub Actions 실행 요약(Summary)에 현재 용량을 표시
// - 700MB를 넘으면 저장소에 '[용량 알림]' 이슈를 한 번 등록 → GitHub가 저장소 주인에게 이메일로 알림
// - 900MB를 넘으면 '[용량 경고]' 이슈를 한 번 더 등록
// 어떤 경우에도 실패 코드를 내지 않습니다(배포를 막지 않음).

import { existsSync } from 'node:fs';
import { appendFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MB = 1024 * 1024;
const WARN_MB = Number(process.env.STORAGE_WARN_MB) || 700;
const CRITICAL_MB = Number(process.env.STORAGE_CRITICAL_MB) || 900;
const LIMIT_MB = 1024;

const repo = process.env.GITHUB_REPOSITORY || '';
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const api = (p, init = {}) =>
  fetch(`https://api.github.com${p}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'sindorim-storage-check',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(15000),
  });

async function dirSize(dir) {
  if (!existsSync(dir)) return 0;
  let total = 0;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) total += await dirSize(full);
    else if (entry.isFile()) total += (await stat(full)).size;
  }
  return total;
}

const fmt = (bytes) => `${(bytes / MB).toFixed(1)}MB`;

async function repoSizeBytes() {
  if (!repo) return 0;
  try {
    const res = await api(`/repos/${repo}`);
    if (!res.ok) return 0;
    const data = await res.json();
    return (Number(data.size) || 0) * 1024; // GitHub는 KB 단위로 알려 줌 (기록 포함 전체 저장소)
  } catch {
    return 0;
  }
}

async function openIssueExists(prefix) {
  try {
    const res = await api(`/repos/${repo}/issues?state=open&per_page=100`);
    if (!res.ok) return true; // 확인 실패 시 중복 등록을 피하려고 '있음'으로 간주
    const issues = await res.json();
    return issues.some((i) => typeof i.title === 'string' && i.title.startsWith(prefix));
  } catch {
    return true;
  }
}

async function createIssue(title, body) {
  const res = await api(`/repos/${repo}/issues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body }),
  });
  console.log(`[storage] 이슈 등록 ${res.ok ? '완료' : `실패 (HTTP ${res.status})`}: ${title}`);
}

function issueBody(level, sizes, biggest) {
  return `## ${level === 'critical' ? '🚨' : '⚠️'} 사이트 용량이 ${level === 'critical' ? CRITICAL_MB : WARN_MB}MB를 넘었습니다

GitHub Pages 무료 한도는 **사이트 1GB**(저장소도 1GB 이하 권장)입니다. 한도에 닿기 전에 정리 계획을 세워 주세요.

| 항목 | 현재 용량 |
|---|---|
| 배포되는 사이트 (dist) | **${fmt(sizes.site)}** |
| 업로드 사진 (public/images/uploads) | ${fmt(sizes.uploads)} |
| 저장소 전체 (기록 포함) | ${fmt(sizes.repo)} |
| 한도 | ${LIMIT_MB}MB |

### 큰 사진 상위 10개
${biggest.map((b) => `- ${b.path} — ${fmt(b.size)}`).join('\n') || '- (없음)'}

### 권장 조치
1. **사진을 외부 저장소로 옮기기**: Cloudflare R2(월 10GB 무료) 같은 이미지 저장소로 옮기고 사이트에는 주소만 남기면 용량 문제가 사실상 해결됩니다. Claude에게 "사진을 외부 저장소로 옮겨줘"라고 요청하세요.
2. **오래된 글 사진 정리**: 오래전 행사 글의 추가 사진을 대표 사진 한 장만 남기고 지우는 방법도 있습니다.
3. 사진은 이미 자동 압축(폭 1600px)되고 있으므로, 압축만으로는 더 줄이기 어렵습니다.

> 이 이슈는 자동 점검(scripts/check-storage.mjs)이 등록했습니다. 조치가 끝나면 이슈를 닫아 주세요. 닫은 뒤에도 기준을 넘어 있으면 다시 등록됩니다.`;
}

async function main() {
  const uploadsDir = path.join(ROOT, 'public/images/uploads');
  const sizes = {
    site: await dirSize(path.join(ROOT, 'dist')),
    uploads: await dirSize(uploadsDir),
    repo: await repoSizeBytes(),
  };
  const peak = Math.max(sizes.site, sizes.repo);
  const percent = Math.round((peak / (LIMIT_MB * MB)) * 100);
  const line = `사이트 ${fmt(sizes.site)} · 사진 ${fmt(sizes.uploads)} · 저장소 ${fmt(sizes.repo)} → 한도(1GB)의 ${percent}%`;
  console.log(`[storage] ${line}`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(
      process.env.GITHUB_STEP_SUMMARY,
      `### 💾 용량 점검\n\n${line}\n\n- 알림 기준: ${WARN_MB}MB (이슈·이메일), ${CRITICAL_MB}MB (경고)\n`,
    );
  }

  const level = peak >= CRITICAL_MB * MB ? 'critical' : peak >= WARN_MB * MB ? 'warn' : null;
  if (!level) return;
  if (!repo || !token) {
    console.log(`[storage] ⚠️ 용량이 ${level === 'critical' ? CRITICAL_MB : WARN_MB}MB를 넘었습니다. (로컬 실행이라 이슈는 등록하지 않음)`);
    return;
  }

  const files = [];
  const walk = async (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else files.push({ path: path.relative(ROOT, full).split(path.sep).join('/'), size: (await stat(full)).size });
    }
  };
  await walk(uploadsDir);
  const biggest = files.sort((a, b) => b.size - a.size).slice(0, 10);

  const prefix = level === 'critical' ? '[용량 경고]' : '[용량 알림]';
  if (await openIssueExists(prefix)) {
    console.log(`[storage] ${prefix} 이슈가 이미 열려 있어 새로 등록하지 않습니다.`);
    return;
  }
  await createIssue(`${prefix} 사이트 용량 ${fmt(peak)} — 1GB 한도의 ${percent}%`, issueBody(level, sizes, biggest));
}

main()
  .catch((error) => console.warn('[storage] 점검 중 오류(배포에는 영향 없음):', error?.message || error))
  .finally(() => {
    process.exitCode = 0;
  });
