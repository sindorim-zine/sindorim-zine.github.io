import type { APIRoute, GetStaticPaths } from 'astro';
import { qrSvg, qrTargets } from '../../utils/qr';

// 인쇄·디자인용 벡터 QR: /qr/home.svg 등 (크기를 아무리 키워도 깨지지 않음)
export const getStaticPaths = (async ({ site }: { site?: URL }) =>
  qrTargets(site).map((t) => ({ params: { name: t.key }, props: { url: t.url } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { url } = props as { url: string };
  return new Response(await qrSvg(url), { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' } });
};
