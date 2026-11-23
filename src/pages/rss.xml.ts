import type { APIRoute } from 'astro';
import { compareNewest, eventOf, formatEvent, getPublishedPosts, siteConfig, thumbnailOf } from '../utils/site';
import { absoluteUrl, postPath } from '../utils/url';

// RSS 2.0 피드: 네이버 서치어드바이저 'RSS 제출'과 피드 구독기용. 최근 글 50개.
const LIMIT = 50;

const escapeXml = (value: string) =>
  value.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);

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
        thumb ? `      <enclosure url="${escapeXml(absoluteUrl(thumb, site))}" type="${/\.png$/i.test(thumb) ? 'image/png' : /\.webp$/i.test(thumb) ? 'image/webp' : 'image/jpeg'}" length="0" />` : '',
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
