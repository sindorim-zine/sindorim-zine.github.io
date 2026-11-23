import type { APIRoute } from 'astro';
import { compareNewest, getPublishedPosts } from '../utils/site';
import { coreContextMarkdown, markdownResponse, postMarkdown } from '../utils/markdown';

export const GET: APIRoute = async ({ site }) => {
  const posts = await getPublishedPosts();
  const pinned = posts.filter((p) => p.data.pinned);
  const latest = posts
    .filter((p) => !p.data.pinned)
    .sort(compareNewest);

  const sections = [coreContextMarkdown(site, { full: true })];

  if (pinned.length) {
    sections.push('---', '', '# 중요 고정 공지', '');
    for (const post of pinned) sections.push(postMarkdown(post, site, { headingLevel: 2 }), '');
  }
  if (latest.length) {
    sections.push('---', '', '# 최신 게시글', '');
    for (const post of latest) sections.push(postMarkdown(post, site, { headingLevel: 2 }), '');
  }

  return markdownResponse(sections.join('\n'), 'text/plain; charset=utf-8');
};
