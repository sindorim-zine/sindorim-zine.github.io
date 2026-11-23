import type { APIRoute } from 'astro';
import { eventOf, formatDate, formatEvent, getPublishedPosts, illustrationFor, publishedTime, thumbnailOf } from '../utils/site';
import { postPath, withBase } from '../utils/url';

// 메인 목록 '더 보기'·정렬·카테고리 필터용 가벼운 글 목록 (고정 공지 제외)
// 메인 페이지는 처음 24개만 그리고, 나머지는 방문자가 필요할 때 이 파일을 한 번만 받아 화면에 추가합니다.
export const GET: APIRoute = async () => {
  const posts = (await getPublishedPosts()).filter((p) => !p.data.pinned);
  const items = posts.map((post) => {
    const event = eventOf(post);
    const thumb = thumbnailOf(post);
    return {
      id: post.id,
      url: withBase(postPath(post.id)),
      title: post.data.title,
      summary: post.data.summary,
      category: post.data.category,
      date: post.data.pubDate.getTime(),
      dateIso: post.data.pubDate.toISOString(),
      dateLabel: formatDate(post.data.pubDate),
      published: publishedTime(post),
      thumb: thumb ? withBase(thumb) : '',
      illustration: illustrationFor(post.data.category),
      event: event ? { start: event.start, end: event.end, text: formatEvent(event) } : null,
    };
  });
  return new Response(JSON.stringify({ total: items.length, items }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
