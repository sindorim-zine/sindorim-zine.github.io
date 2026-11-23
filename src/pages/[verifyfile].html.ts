import type { APIRoute, GetStaticPaths } from 'astro';
import { siteConfig } from '../utils/site';

// 검색엔진 'HTML 파일' 소유 확인 방식 지원.
// CMS '검색엔진 소유 확인 코드'에 'google-site-verification: googleXXXX.html'처럼 넣으면
// https://사이트주소/googleXXXX.html 파일을 만들어 줍니다. (값이 없으면 아무 파일도 만들지 않음)
export const getStaticPaths = (() =>
  siteConfig.verificationFiles.map((file) => ({
    params: { verifyfile: file.replace(/\.html$/i, '') },
    props: { file },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const { file } = props as { file: string };
  const vendor = file.toLowerCase().startsWith('naver') ? 'naver' : 'google';
  return new Response(`${vendor}-site-verification: ${file}`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
};
