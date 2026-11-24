import type { APIRoute } from 'astro';
import { cardThumb, eventOf, formatDate, formatEvent, getPublishedPosts, illustrationFor, publishedTime, thumbnailOf } from '../utils/site';
import { postPath, withBase } from '../utils/url';

// 메인 목록 '더 보기'·정렬·카테고리 필터용 가벼운 글 목록 (고정 공지 제외)
// 메인 페이지는 처음 24개만 그리고, 나머지는 방문자가 필요할 때 이 파일을 한 번만 받아 화면에 추가합니다.
export const GET: APIRoute = async () => {
  // 외부 행사 소식은 메인 피드에 섞지 않고 '가볼 만한 행사' 목록으로 따로 보여 주므로 여기서도 뺍니다.
  const posts = (await getPublishedPosts()).filter((p) => !p.data.pinned && !p.data.external);
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
      thumb: thumb ? withBase(cardThumb(thumb)) : '',
      illustration: illustrationFor(post.data.category),
      event: event ? { start: event.start, end: event.end, text: formatEvent(event) } : null,
    };
  });
  return new Response(JSON.stringify({ total: items.length, items }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
