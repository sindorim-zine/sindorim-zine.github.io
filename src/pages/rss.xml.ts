import type { APIRoute } from 'astro';
import { statSync } from 'node:fs';
import path from 'node:path';
import { compareNewest, eventOf, formatEvent, getPublishedPosts, siteConfig, thumbnailOf } from '../utils/site';
import { absoluteUrl, postPath } from '../utils/url';

// RSS 2.0 피드: 네이버 서치어드바이저 'RSS 제출'과 피드 구독기용. 최근 글 50개.
const LIMIT = 50;

// XML 1.0에서 허용되지 않는 제어 문자는 지우고, 특수 문자는 이스케이프합니다(피드 전체가 깨지는 것 방지).
const escapeXml = (value: string) =>
  value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
    .replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);

/** public 폴더의 대표 사진 크기(바이트). RSS enclosure에는 실제 크기가 필요합니다. 찾지 못하면 0 */
function fileSize(publicPath: string): number {
  try {
    return statSync(path.join(process.cwd(), 'public', publicPath.replace(/^\/+/, ''))).size;
  } catch {
    return 0;
  }
}

export const GET: APIRoute = async ({ site }) => {
  const posts = (await getPublishedPosts()).sort(compareNewest).slice(0, LIMIT);
  const home = absoluteUrl('/', site);
  const items = posts
    .map((post) => {
      const url = absoluteUrl(postPath(post.id), site);
      const event = eventOf(post);
      const thumb = thumbnailOf(post);
      const description = [event ? `[${formatEvent(event)}] ` : '', post.data.summary || ''].join('');
      const pub = post.data.publishedAt ?? post.data.pubDate;
      return [
        '    <item>',
        `      <title>${escapeXml(post.data.title)}</title>`,
        `      <link>${escapeXml(url)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
        `      <pubDate>${pub.toUTCString()}</pubDate>`,
        `      <category>${escapeXml(post.data.category)}</category>`,
        `      <description>${escapeXml(description)}</description>`,
        thumb && fileSize(thumb) > 0
          ? `      <enclosure url="${escapeXml(absoluteUrl(thumb, site))}" type="${/\.png$/i.test(thumb) ? 'image/png' : /\.webp$/i.test(thumb) ? 'image/webp' : 'image/jpeg'}" length="${fileSize(thumb)}" />`
          : '',
        '    </item>',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');

  const lastBuild = posts[0] ? (posts[0].data.publishedAt ?? posts[0].data.pubDate) : new Date();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteConfig.siteTitle)}</title>
    <link>${escapeXml(home)}</link>
    <description>${escapeXml(siteConfig.siteDescription)}</description>
    <language>ko-KR</language>
    <lastBuildDate>${lastBuild.toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(absoluteUrl('/rss.xml', site))}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
