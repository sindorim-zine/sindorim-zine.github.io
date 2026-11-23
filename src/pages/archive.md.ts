import type { APIRoute } from 'astro';
import { getPublishedPosts } from '../utils/site';
import { archiveMarkdown, markdownResponse } from '../utils/markdown';

// 전체 글 목록 마크다운 (AI 크롤러용). 글 하나당 한 줄이라 수천 개여도 가볍습니다.
export const GET: APIRoute = async ({ site }) => markdownResponse(archiveMarkdown(await getPublishedPosts(), site));
