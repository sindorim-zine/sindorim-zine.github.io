// 외부 행사 소식(external: true) 글 목록을 빌드 설정·스크립트에서 함께 쓰기 위한 도우미.
// 외부 행사 글은 회원들이 사이트에서 그대로 볼 수 있지만, 검색엔진에는 내보내지 않습니다(noindex).
// 공공 자료를 정리한 비슷한 모양의 글이 많아지면 검색엔진이 '대량 생산 글'로 볼 수 있어서,
// 검색에는 신커만의 글(봉사·기부·모임·동네 소식)만 보이게 하려는 것입니다.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POSTS_DIR = path.join(ROOT, 'src/content/posts');

/** 글 파일의 frontmatter에 external: true가 있는지 */
export function isExternalPostFile(file) {
  try {
    const content = readFileSync(file, 'utf8');
    const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content)?.[1] ?? '';
    return /^external\s*:\s*true\s*$/m.test(frontmatter);
  } catch {
    return false;
  }
}

/** 외부 행사 글의 사이트 주소 목록 (예: '/posts/2026-11-24-event-9d46f5e5/') */
export function externalPostPaths() {
  if (!existsSync(POSTS_DIR)) return new Set();
  return new Set(
    readdirSync(POSTS_DIR)
      .filter((f) => f.endsWith('.md') && isExternalPostFile(path.join(POSTS_DIR, f)))
      .map((f) => `/posts/${path.basename(f, '.md').toLowerCase()}/`),
  );
}
