import type { APIRoute } from 'astro';
import { compareNewest, getPublishedPosts } from '../utils/site';
import { coreContextMarkdown, markdownResponse, postLinkLine } from '../utils/markdown';
import { absoluteUrl } from '../utils/url';

const LATEST_LIMIT = 50;

export const GET: APIRoute = async ({ site }) => {
  const posts = await getPublishedPosts();
  const pinned = posts.filter((p) => p.data.pinned);
  const latest = posts
    .filter((p) => !p.data.pinned)
    .sort(compareNewest)
    .slice(0, LATEST_LIMIT);

  const sections = [coreContextMarkdown(site, { full: false })];

  if (pinned.length) {
    sections.push('## 중요 고정 공지', '', ...pinned.map((p) => postLinkLine(p, site)), '');
  }
  if (latest.length) {
    sections.push('## 최신 게시글', '', ...latest.map((p) => postLinkLine(p, site)), '');
  }
  sections.push(
    '## 더 보기',
    '',
    `- [전체 본문 모음 (llms-full.txt)](${absoluteUrl('/llms-full.txt', site)})`,
    `- [커뮤니티 소개](${absoluteUrl('/about.md', site)})`,
    `- [사이트맵](${absoluteUrl('/sitemap-index.xml', site)})`,
    '',
  );

  return markdownResponse(sections.join('\n'), 'text/plain; charset=utf-8');
};
