import type { APIRoute, GetStaticPaths } from 'astro';
import { getPublishedPosts } from '../../../utils/site';
import { postQrUrl, qrPng } from '../../../utils/qr';

// 글마다 인쇄용 QR: /qr/posts/<글 주소>.png — 행사 포스터·전단지에 바로 넣을 수 있습니다.
export const getStaticPaths = (async () => {
  const posts = await getPublishedPosts();
  return posts.map((post) => ({ params: { id: post.id } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params, site }) => {
  const png = await qrPng(postQrUrl(String(params.id), site));
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
