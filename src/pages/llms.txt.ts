import type { APIRoute } from 'astro';
import { compareNewest, getPublishedPosts } from '../utils/site';
import { coreContextMarkdown, eventLine, markdownResponse, postLinkLine, upcomingEvents } from '../utils/markdown';
import { absoluteUrl } from '../utils/url';

// llms.txt: AI가 가장 먼저 읽는 '요약 목차'. 글이 수천 개가 되어도 작게 유지합니다.
// 커뮤니티 핵심 소개 → 현재 공지 → 다가오는 행사 → 고정 공지 → 최신 글 30개 → 더 보기 링크
const LATEST_LIMIT = 30;

export const GET: APIRoute = async ({ site }) => {
  const posts = await getPublishedPosts();
  const pinned = posts.filter((p) => p.data.pinned);
  const latest = posts.filter((p) => !p.data.pinned).sort(compareNewest).slice(0, LATEST_LIMIT);
  const events = upcomingEvents(posts);

  const sections = [coreContextMarkdown(site, { full: false })];
  if (events.length) sections.push('## 다가오는 행사·접수 일정', '', ...events.map((p) => eventLine(p, site)), '');
  if (pinned.length) sections.push('## 중요 고정 공지', '', ...pinned.map((p) => postLinkLine(p, site)), '');
  if (latest.length) sections.push(`## 최신 게시글 (최근 ${latest.length}개)`, '', ...latest.map((p) => postLinkLine(p, site)), '');
  sections.push(
    '## 더 보기',
    '',
    `- [주요 글 본문 모음 (llms-full.txt)](${absoluteUrl('/llms-full.txt', site)})`,
    `- [전체 글 목록 (${posts.length}개)](${absoluteUrl('/archive.md', site)})`,
    `- [커뮤니티 소개](${absoluteUrl('/about.md', site)})`,
    `- [사이트맵](${absoluteUrl('/sitemap-index.xml', site)})`,
    '',
  );
  return markdownResponse(sections.join('\n'), 'text/plain; charset=utf-8');
};
