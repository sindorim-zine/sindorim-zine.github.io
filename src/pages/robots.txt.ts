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

// 주의: robots.txt에는 영문(ASCII)만 씁니다. 한글 주석이 있으면 일부 검사 도구(네이버 등)가
// 형식 오류로 보고 'robots.txt 없음'으로 표시할 수 있습니다.
export const GET: APIRoute = ({ site }) => {
  const lines: string[] = [
    '# Sindorim Community official web archive',
    `# AI summary: ${absoluteUrl('/llms.txt', site)}`,
    `# AI full text: ${absoluteUrl('/llms-full.txt', site)}`,
    '',
    'User-agent: *',
    'Allow: /',
    '',
  ];
  for (const bot of AI_AND_SEARCH_BOTS) {
    lines.push(`User-agent: ${bot}`, 'Allow: /', '');
  }
  lines.push(`Sitemap: ${absoluteUrl('/sitemap-index.xml', site)}`);
  lines.push(`Sitemap: ${absoluteUrl('/rss.xml', site)}`);

  return new Response(lines.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
