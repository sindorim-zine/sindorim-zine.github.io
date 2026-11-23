import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Pages CMS가 빈 칸을 "" 또는 null로 저장할 수 있으므로, 선택 문자열은 nullish로 받고 빈 값은 화면에서 무시합니다.
const optionalText = z.string().nullish();

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    pubDate: z.coerce.date(),
    // 같은 날 올린 글의 순서를 정하는 실제 발행 시각 (카페 글 올리기가 자동 기록, CMS에는 숨김)
    publishedAt: z.preprocess((v) => (v === '' || v == null ? undefined : v), z.coerce.date().optional()),
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
