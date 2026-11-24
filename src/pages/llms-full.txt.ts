import type { APIRoute } from 'astro';
import { compareNewest, getPublishedPosts } from '../utils/site';
import { EXTERNAL_NOTE, coreContextMarkdown, eventLine, markdownResponse, postMarkdown, upcomingEvents } from '../utils/markdown';
import { absoluteUrl } from '../utils/url';

// llms-full.txt: AI가 한 번에 읽는 '주요 글 본문 모음'.
// 글이 많아져도 AI가 끝까지 읽을 수 있도록 신커 최근 글 최대 100개, 전체 크기 약 400KB까지만 담고,
// 나머지 글은 /archive.md(전체 목록)와 각 글의 .md 주소로 안내합니다.
// 외부 행사 소식(신커 주최 아님)은 본문을 넣지 않고 맨 뒤에 한 줄씩만 따로 둡니다.
const MAX_POSTS = 100;
const MAX_BYTES = 400 * 1024;
const EXTERNAL_LIMIT = 20;

export const GET: APIRoute = async ({ site }) => {
  const posts = await getPublishedPosts();
  const own = posts.filter((p) => !p.data.external);
  const pinned = own.filter((p) => p.data.pinned);
  const latest = own.filter((p) => !p.data.pinned).sort(compareNewest);
  const events = upcomingEvents(own);
  const external = upcomingEvents(posts.filter((p) => p.data.external), EXTERNAL_LIMIT);
  const encoder = new TextEncoder();

  const sections = [coreContextMarkdown(site, { full: true })];
  if (events.length) sections.push('## 다가오는 신커 행사·접수 일정', '', ...events.map((p) => eventLine(p, site)), '');
  if (pinned.length) {
    sections.push('---', '', '# 중요 고정 공지', '');
    for (const post of pinned) sections.push(postMarkdown(post, site, { headingLevel: 2 }), '');
  }

  let bytes = encoder.encode(sections.join('\n')).length;
  let included = 0;
  if (latest.length) {
    sections.push('---', '', '# 신커 최신 게시글', '');
    for (const post of latest) {
      if (included >= MAX_POSTS) break;
      const block = postMarkdown(post, site, { headingLevel: 2 });
      const size = encoder.encode(block).length;
      if (included > 0 && bytes + size > MAX_BYTES) break;
      sections.push(block, '');
      bytes += size;
      included++;
    }
  }
  const rest = latest.length - included;
  if (rest > 0) {
    sections.push(
      '---',
      '',
      `# 이전 게시글 ${rest}개`,
      '',
      `이 파일에는 신커 최근 ${included}개 글의 본문만 담았습니다. 나머지 글은 [전체 글 목록](${absoluteUrl('/archive.md', site)})에서 찾을 수 있고, 각 글의 본문은 목록의 .md 링크로 읽을 수 있습니다.`,
      '',
    );
  }
  if (external.length) {
    sections.push('---', '', '# 가볼 만한 외부 행사 (신커 주최 아님)', '', EXTERNAL_NOTE, '', ...external.map((p) => eventLine(p, site)), '');
  }
  return markdownResponse(sections.join('\n'), 'text/plain; charset=utf-8');
};
