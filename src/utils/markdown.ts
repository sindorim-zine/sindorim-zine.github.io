// AI 크롤러용 순수 마크다운 생성기 (llms.txt, llms-full.txt, about.md, posts/[id].md)
import { about, eventOf, formatDate, formatEvent, siteConfig, type Post } from './site';
import { absoluteUrl, isHttpUrl, postMarkdownPath, postPath } from './url';

type Site = URL | string | undefined;

const oneLine = (value: string) => value.replace(/\s+/g, ' ').trim();

/** 커뮤니티 핵심 정의·활동·연혁·FAQ (모든 AI 문서의 최상단 공통 블록) */
export function coreContextMarkdown(site: Site, { full }: { full: boolean }): string {
  const lines: string[] = [];
  lines.push(`# ${siteConfig.siteTitle}`);
  lines.push('');
  lines.push(`> ${oneLine(about.introLead || siteConfig.siteDescription)}`);
  lines.push('');
  lines.push(`- 공식 웹 아카이브: ${absoluteUrl('/', site)}`);
  if (isHttpUrl(siteConfig.cafeUrl)) lines.push(`- 공식 네이버 카페(원본 활동 공간): ${siteConfig.cafeUrl}`);
  lines.push(`- 활동 지역: ${about.locationInfo}`);
  lines.push(`- 운영: ${siteConfig.representativeName}`);
  lines.push(`- 커뮤니티 소개(마크다운): ${absoluteUrl('/about.md', site)}`);
  lines.push('');

  const banner = siteConfig.eventBanner;
  if (banner.enabled && banner.text.trim()) {
    lines.push('## 현재 주요 공지');
    lines.push('');
    const link = banner.linkUrl ? ` (${absoluteUrl(banner.linkUrl, site)})` : '';
    lines.push(`- [${banner.badge || '공지'}] ${oneLine(banner.text)}${link}`);
    lines.push('');
  }

  lines.push('## 커뮤니티 소개');
  lines.push('');
  if (about.introTitle) lines.push(`**${about.introTitle}**`, '');
  if (full && about.introBody) {
    lines.push(about.introBody.trim(), '');
  } else if (about.introLead) {
    lines.push(oneLine(about.introLead), '');
  }

  if (about.coreValues.length) {
    lines.push('## 핵심 활동', '');
    for (const v of about.coreValues) lines.push(`- **${v.title}**: ${oneLine(v.description)}`);
    lines.push('');
  }

  if (about.milestones.length) {
    lines.push('## 연혁', '');
    for (const m of about.milestones) lines.push(`- ${m.period}: ${oneLine(m.event)}`);
    lines.push('');
  }

  if (about.faqs.length) {
    lines.push('## 자주 묻는 질문', '');
    for (const f of about.faqs) {
      lines.push(`### ${f.question}`, '', oneLine(f.answer), '');
    }
  }
  return lines.join('\n');
}

/** llms.txt용 게시글 한 줄 링크 */
export function postLinkLine(post: Post, site: Site): string {
  const date = post.data.pubDate.toISOString().slice(0, 10);
  const summary = post.data.summary ? `: ${oneLine(post.data.summary)}` : '';
  const event = eventOf(post);
  const when = event ? `, ${event.label} ${event.start}${event.end !== event.start ? `~${event.end}` : ''}` : '';
  return `- [${post.data.title}](${absoluteUrl(postMarkdownPath(post.id), site)}) (${date}, ${post.data.category}${when})${summary}`;
}

/** 게시글 전체 마크다운 (상세 .md 미러와 llms-full.txt에서 사용) */
export function postMarkdown(post: Post, site: Site, { headingLevel = 1 }: { headingLevel?: 1 | 2 } = {}): string {
  const h = '#'.repeat(headingLevel);
  const meta: string[] = [
    `- 게시일: ${formatDate(post.data.pubDate)} (${post.data.pubDate.toISOString().slice(0, 10)})`,
    `- 카테고리: ${post.data.category}`,
    `- 작성: ${siteConfig.representativeName}`,
    `- 웹 페이지: ${absoluteUrl(postPath(post.id), site)}`,
  ];
  const event = eventOf(post);
  if (event) meta.push(`- ${event.label}: ${formatEvent(event).replace(` ${event.label}`, '')} (${event.start}${event.end !== event.start ? ` ~ ${event.end}` : ''})`);
  if (post.data.pinned) meta.push('- 상단 고정 중요 안내');
  if (isHttpUrl(post.data.originalUrl)) meta.push(`- 네이버 카페 원문: ${post.data.originalUrl}`);

  const parts = [`${h} ${post.data.title}`, '', meta.join('\n'), ''];
  if (post.data.summary) parts.push(`**핵심 요약:** ${oneLine(post.data.summary)}`, '');
  // 본문 속 루트 경로(/images/..., /about)를 AI가 바로 쓸 수 있는 절대 주소로 바꿉니다.
  const root = absoluteUrl('/', site).replace(/\/+$/, '');
  const body = (post.body ?? '')
    .trim()
    .replace(/(\]\()\/(?!\/)/g, `$1${root}/`)
    .replace(/((?:src|href)=["'])\/(?!\/)/g, `$1${root}/`);
  if (body) {
    // 하위 문서로 넣을 때 본문 제목 단계를 한 단계 내립니다.
    parts.push(headingLevel === 2 ? body.replace(/^(#{1,5}) /gm, '#$1 ') : body, '');
  }
  return parts.join('\n');
}

export function aboutMarkdown(site: Site): string {
  const lines: string[] = [];
  lines.push(`# ${about.introTitle || `${siteConfig.siteTitle} 소개`}`, '');
  if (about.introLead) lines.push(`> ${oneLine(about.introLead)}`, '');
  lines.push(`- 활동 지역: ${about.locationInfo}`);
  lines.push(`- 운영: ${siteConfig.representativeName}`);
  lines.push(`- 웹 페이지: ${absoluteUrl('/about/', site)}`);
  if (isHttpUrl(siteConfig.cafeUrl)) lines.push(`- 네이버 카페: ${siteConfig.cafeUrl}`);
  lines.push('');
  if (about.introBody) lines.push(about.introBody.trim(), '');
  if (about.coreValues.length) {
    lines.push('## 핵심 활동', '');
    for (const v of about.coreValues) lines.push(`### ${v.title}`, '', v.description, '');
  }
  if (about.milestones.length) {
    lines.push('## 연혁', '');
    for (const m of about.milestones) lines.push(`- **${m.period}**: ${m.event}`);
    lines.push('');
  }
  if (about.faqs.length) {
    lines.push('## 자주 묻는 질문 (FAQ)', '');
    for (const f of about.faqs) lines.push(`### Q. ${f.question}`, '', `A. ${f.answer}`, '');
  }
  return lines.join('\n');
}

export function markdownResponse(body: string, contentType = 'text/markdown; charset=utf-8') {
  return new Response(body.replace(/\n{3,}/g, '\n\n').trimEnd() + '\n', {
    headers: { 'Content-Type': contentType },
  });
}
