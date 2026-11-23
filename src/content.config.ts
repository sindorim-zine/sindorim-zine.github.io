import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Pages CMS가 빈 칸을 "" 또는 null로 저장할 수 있으므로, 선택 문자열은 nullish로 받고 빈 값은 화면에서 무시합니다.
const optionalText = z.string().nullish();

// 행사 날짜는 시간대 문제를 피하려고 'YYYY-MM-DD' 글자 그대로 다룹니다. (YAML이 날짜로 읽어도 다시 글자로 변환)
const optionalDay = z.preprocess((v) => {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (typeof v === 'string') {
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(v.trim());
    return m ? m[1] : undefined;
  }
  return undefined;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional());

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    pubDate: z.coerce.date(),
    // 같은 날 올린 글의 순서를 정하는 실제 발행 시각 (카페 글 올리기가 자동 기록, CMS에는 숨김)
    publishedAt: z.preprocess((v) => (v === '' || v == null ? undefined : v), z.coerce.date().optional()),
    // 행사 정보 (다가오는 행사순 정렬·D-day 표시). 카페 글 올리기에서 AI가 원문의 날짜로 채웁니다.
    eventDate: optionalDay,
    eventEndDate: optionalDay,
    eventLabel: optionalText,
    eventLocation: optionalText,
    category: z.string(),
    summary: z.string().default(''),
    pinned: z.boolean().default(false),
    thumbnail: optionalText,
    originalUrl: optionalText,
    sourceGuid: optionalText,
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts };
