import type { APIRoute } from 'astro';
import { absoluteUrl } from '../utils/url';

// 검색엔진과 주요 AI 크롤러를 명시적으로 허용합니다.
const AI_AND_SEARCH_BOTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'Google-Extended',
  'Googlebot',
  'Bingbot',
  'ClaudeBot',
  'Claude-SearchBot',
  'PerplexityBot',
  'Yeti',
];

export const GET: APIRoute = ({ site }) => {
  const lines: string[] = [];
  for (const bot of AI_AND_SEARCH_BOTS) {
    lines.push(`User-agent: ${bot}`, 'Allow: /', '');
  }
  lines.push('User-agent: *', 'Allow: /', '');
  lines.push(`Sitemap: ${absoluteUrl('/sitemap-index.xml', site)}`);
  lines.push('');
  lines.push(`# AI용 요약: ${absoluteUrl('/llms.txt', site)}`);
  lines.push(`# AI용 전체 본문: ${absoluteUrl('/llms-full.txt', site)}`);

  return new Response(lines.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
