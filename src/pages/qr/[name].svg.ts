import type { APIRoute, GetStaticPaths } from 'astro';
import { qrSvg, qrTargets } from '../../utils/qr';

// 인쇄·디자인용 벡터 QR: /qr/home.svg 등 (크기를 아무리 키워도 깨지지 않음)
// 주의: getStaticPaths에는 사이트 주소(site)가 전달되지 않으므로, 실제 주소는 GET에서 계산합니다.
export const getStaticPaths = (() =>
  qrTargets(undefined).map((t) => ({ params: { name: t.key } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params, site }) => {
  const target = qrTargets(site).find((t) => t.key === params.name);
  if (!target) return new Response('Not found', { status: 404 });
  return new Response(await qrSvg(target.url), { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' } });
};
