// Schema.org JSON-LD 생성기. 검색엔진·AI가 이 사이트를 카페의 '공식 출처'로 인식하도록 돕습니다.
import { about, eventOf, siteConfig, thumbnailOf, type Post } from './site';
import { absoluteUrl, isHttpUrl, postPath } from './url';

type Site = URL | string | undefined;

const AREA = '서울특별시 구로구 신도림동';

function orgId(site: Site) {
  return `${absoluteUrl('/', site)}#organization`;
}

function websiteId(site: Site) {
  return `${absoluteUrl('/', site)}#website`;
}

export function organizationSchema(site: Site) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': orgId(site),
    name: siteConfig.siteTitle,
    ...(siteConfig.alternateNames.length ? { alternateName: siteConfig.alternateNames } : {}),
    ...(siteConfig.subOrganizations.length
      ? { subOrganization: siteConfig.subOrganizations.map((name) => ({ '@type': 'Organization', name, parentOrganization: { '@id': orgId(site) } })) }
      : {}),
    url: absoluteUrl('/', site),
    description: siteConfig.siteDescription,
    logo: absoluteUrl('/favicon.svg', site),
    areaServed: {
      '@type': 'Place',
      name: AREA,
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'KR',
        addressRegion: '서울특별시',
        addressLocality: '구로구',
        streetAddress: '신도림동',
      },
    },
    location: {
      '@type': 'Place',
      name: about.locationInfo || AREA,
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'KR',
        addressRegion: '서울특별시',
        addressLocality: '구로구 신도림동',
      },
    },
  };
  if (isHttpUrl(siteConfig.cafeUrl)) data.sameAs = [siteConfig.cafeUrl];
  return data;
}

export function websiteSchema(site: Site) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': websiteId(site),
    name: siteConfig.siteTitle,
    url: absoluteUrl('/', site),
    description: siteConfig.siteDescription,
    inLanguage: 'ko-KR',
    publisher: { '@id': orgId(site) },
    about: { '@type': 'Place', name: AREA },
    ...(isHttpUrl(siteConfig.cafeUrl) ? { sameAs: [siteConfig.cafeUrl] } : {}),
  };
}

export function aboutPageSchema(site: Site) {
  return {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: about.introTitle || `${siteConfig.siteTitle} 소개`,
    url: absoluteUrl('/about/', site),
    description: about.introLead || siteConfig.siteDescription,
    inLanguage: 'ko-KR',
    isPartOf: { '@id': websiteId(site) },
    about: { '@id': orgId(site) },
    mainEntity: organizationSchema(site),
  };
}

export function faqPageSchema(site: Site) {
  if (about.faqs.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    url: absoluteUrl('/about/', site),
    inLanguage: 'ko-KR',
    mainEntity: about.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}

export function blogPostingSchema(post: Post, site: Site) {
  const url = absoluteUrl(postPath(post.id), site);
  const thumb = thumbnailOf(post);
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.data.title,
    description: post.data.summary,
    datePublished: post.data.pubDate.toISOString(),
    // 실제 발행(또는 다시 올린) 시각이 작성일보다 뒤면 수정일로 사용
    dateModified: (post.data.publishedAt && post.data.publishedAt > post.data.pubDate ? post.data.publishedAt : post.data.pubDate).toISOString(),
    inLanguage: 'ko-KR',
    articleSection: post.data.category,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    author: { '@type': 'Organization', name: siteConfig.representativeName, url: absoluteUrl('/about/', site) },
    publisher: {
      '@id': orgId(site),
      '@type': 'Organization',
      name: siteConfig.siteTitle,
      logo: { '@type': 'ImageObject', url: absoluteUrl('/images/og-default.png', site) },
    },
    isPartOf: { '@id': websiteId(site) },
    contentLocation: { '@type': 'Place', name: AREA },
  };
  if (thumb) data.image = absoluteUrl(thumb, site);
  if (isHttpUrl(post.data.originalUrl)) data.isBasedOn = post.data.originalUrl;
  return data;
}

/**
 * 행사 구조화 데이터(Event). 행사 날짜가 있는 글에만 만듭니다.
 * '접수 마감·신청 마감'처럼 행사 당일이 아닌 날짜는 행사로 표시하지 않습니다.
 * 장소는 원문에 적혀 있을 때만 넣습니다(지어내지 않음).
 */
export function eventSchema(post: Post, site: Site) {
  const event = eventOf(post);
  if (!event || /마감/.test(event.label)) return null;
  const url = absoluteUrl(postPath(post.id), site);
  const thumb = thumbnailOf(post);
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: post.data.title,
    startDate: event.start,
    endDate: event.end,
    description: post.data.summary,
    url,
    inLanguage: 'ko-KR',
    eventStatus: 'https://schema.org/EventScheduled',
    organizer: { '@id': orgId(site), '@type': 'Organization', name: siteConfig.siteTitle, url: absoluteUrl('/', site) },
  };
  if (thumb) data.image = absoluteUrl(thumb, site);
  if (event.location) {
    data.eventAttendanceMode = 'https://schema.org/OfflineEventAttendanceMode';
    data.location = { '@type': 'Place', name: event.location, address: { '@type': 'PostalAddress', streetAddress: event.location, addressLocality: '구로구', addressRegion: '서울특별시', addressCountry: 'KR' } };
  }
  if (isHttpUrl(post.data.originalUrl)) data.sameAs = post.data.originalUrl;
  return data;
}

export function breadcrumbSchema(items: { name: string; path: string }[], site: Site) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path, site),
    })),
  };
}
