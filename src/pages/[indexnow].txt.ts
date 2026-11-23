import type { APIRoute, GetStaticPaths } from 'astro';
import { siteConfig } from '../utils/site';

// IndexNow 키 파일: https://사이트주소/[KEY].txt
// 키 우선순위: 환경변수 INDEXNOW_KEY → siteConfig.json의 indexNowKey
// 키가 비어 있거나 형식이 올바르지 않으면 페이지를 만들지 않아(빈 배열) 초기 빌드가 실패하지 않습니다.
const KEY_PATTERN = /^[A-Za-z0-9-]{8,128}$/;

export const getStaticPaths = (() => {
  const key = (process.env.INDEXNOW_KEY || siteConfig.indexNowKey || '').trim();
  if (!KEY_PATTERN.test(key)) return [];
  return [{ params: { indexnow: key }, props: { key } }];
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const { key } = props as { key: string };
  return new Response(key, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
