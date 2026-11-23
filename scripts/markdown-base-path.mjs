// 게시글 본문(마크다운) 안의 루트 경로 링크·이미지(/images/uploads/..., /about)에 base 경로를 붙이는
// Astro 7 기본 마크다운 처리기(Sätteri)용 HAST 플러그인입니다.
// Pages CMS가 본문에 넣는 이미지 경로도 서브패스·커스텀 도메인에서 깨지지 않습니다.

const ATTRS = { a: ['href'], img: ['src', 'srcSet'], source: ['src', 'srcSet'], video: ['src', 'poster'], audio: ['src'] };

function prefix(value, base) {
  if (typeof value !== 'string') return value;
  if (!value.startsWith('/') || value.startsWith('//')) return value;
  if (value === base || value.startsWith(`${base}/`)) return value;
  return `${base}${value}`;
}

function prefixSrcset(value, base) {
  return String(value)
    .split(',')
    .map((part) => {
      const [url, ...rest] = part.trim().split(/\s+/);
      return [prefix(url, base), ...rest].join(' ');
    })
    .join(', ');
}

/** @param {string} rawBase 예: '/' 또는 '/repo' */
export default function basePathHastPlugin(rawBase = '/') {
  const base = String(rawBase || '/').replace(/\/+$/, '');
  return () => ({
    name: 'sindorim-base-path',
    element: {
      filter: Object.keys(ATTRS),
      visit(node, ctx) {
        const props = node.properties || {};
        // 본문 사진은 화면에 보일 때 불러오도록(첫 화면 속도 향상)
        if (node.tagName === 'img') {
          if (props.loading == null) ctx.setProperty(node, 'loading', 'lazy');
          if (props.decoding == null) ctx.setProperty(node, 'decoding', 'async');
        }
        if (!base) return;
        for (const key of ATTRS[node.tagName] || []) {
          const value = props[key];
          if (value == null) continue;
          const next = key === 'srcSet'
            ? prefixSrcset(Array.isArray(value) ? value.join(', ') : value, base)
            : prefix(value, base);
          if (next !== value) ctx.setProperty(node, key, next);
        }
      },
    },
  });
}
