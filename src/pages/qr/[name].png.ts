import type { APIRoute, GetStaticPaths } from 'astro';
import { qrPng, qrTargets } from '../../utils/qr';

// 인쇄용 대표 QR 이미지: /qr/home.png, /qr/about.png, /qr/archive.png, /qr/cafe.png
export const getStaticPaths = (async ({ site }: { site?: URL }) =>
  qrTargets(site).map((t) => ({ params: { name: t.key }, props: { url: t.url } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { url } = props as { url: string };
  return new Response(new Uint8Array(await qrPng(url)), { headers: { 'Content-Type': 'image/png' } });
};
