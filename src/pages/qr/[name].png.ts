import type { APIRoute, GetStaticPaths } from 'astro';
import { qrPng, qrTargets } from '../../utils/qr';

// 인쇄용 대표 QR 이미지: /qr/home.png, /qr/about.png, /qr/archive.png, /qr/cafe.png
// 주의: getStaticPaths에는 사이트 주소(site)가 전달되지 않으므로, 실제 주소는 GET에서 계산합니다.
export const getStaticPaths = (() =>
  qrTargets(undefined).map((t) => ({ params: { name: t.key } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params, site }) => {
  const target = qrTargets(site).find((t) => t.key === params.name);
  if (!target) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(await qrPng(target.url)), { headers: { 'Content-Type': 'image/png' } });
};
