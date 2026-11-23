// QR 코드 생성 (빌드할 때 만들어 정적 파일로 배포)
// - 스캔이 잘 되도록 흰 바탕 + 아주 진한 색, 오류 복구 수준 H(일부가 가려지거나 인쇄가 번져도 읽힘)
// - 인쇄용 PNG는 1200px로 크게 만듭니다.
import QRCode from 'qrcode';
import { siteConfig } from './site';
import { absoluteUrl, isHttpUrl, postPath } from './url';

const DARK = '#111827';
const LIGHT = '#FFFFFF';

export type QrTarget = { key: string; label: string; description: string; url: string };

/** /qr/ 페이지에서 제공하는 대표 QR 목록 */
export function qrTargets(site: URL | string | undefined): QrTarget[] {
  const list: QrTarget[] = [
    { key: 'home', label: '웹 아카이브 홈', description: '신커 소식 전체를 볼 수 있는 첫 화면', url: absoluteUrl('/', site) },
    { key: 'about', label: '커뮤니티 소개', description: '신커와 신커봉사단 소개, 자주 묻는 질문', url: absoluteUrl('/about/', site) },
    { key: 'archive', label: '전체 글 목록', description: '지금까지 올라온 모든 소식', url: absoluteUrl('/archive/', site) },
  ];
  if (isHttpUrl(siteConfig.cafeUrl)) {
    list.push({ key: 'cafe', label: '네이버 카페 가입', description: '회원 가입·댓글·모임 신청은 카페에서', url: siteConfig.cafeUrl });
  }
  return list;
}

export function postQrUrl(id: string, site: URL | string | undefined): string {
  return absoluteUrl(postPath(id), site);
}

export async function qrSvg(text: string): Promise<string> {
  const svg = await QRCode.toString(text, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 2,
    color: { dark: DARK, light: LIGHT },
  });
  // 화면 크기에 맞게 늘어나도록 고정 크기 속성 없이 viewBox만 사용
  return svg.replace('<svg ', '<svg role="img" ');
}

export async function qrPng(text: string, width = 1200): Promise<Buffer> {
  return QRCode.toBuffer(text, {
    type: 'png',
    errorCorrectionLevel: 'H',
    margin: 2,
    width,
    color: { dark: DARK, light: LIGHT },
  });
}
