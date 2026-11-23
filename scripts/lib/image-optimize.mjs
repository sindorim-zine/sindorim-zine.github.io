// 사진 자동 압축: 폭 최대 1600px, 불투명 사진은 JPEG(mozjpeg), 투명 배경 이미지는 WebP로 저장합니다.
// - JPEG를 기본으로 쓰는 이유: 카카오톡·SNS 공유 미리보기까지 가장 넓게 호환되기 때문
// - 움직이는 GIF와 SVG는 그대로 둡니다.
// - 압축 결과가 원본보다 크면 원본을 유지합니다.

import sharp from 'sharp';

export const MAX_WIDTH = 1600;
const JPEG_QUALITY = 80;
const WEBP_QUALITY = 82;
/** 이 크기 이하이고 폭이 1600px 이하인 JPEG/WebP는 이미 충분히 가벼우므로 건드리지 않습니다. */
export const SMALL_ENOUGH = 350 * 1024;

/**
 * @param {Buffer} input
 * @returns {Promise<{ buffer: Buffer, ext: string, changed: boolean, width?: number }>}
 */
export async function optimizeImage(input, originalExt = '') {
  let meta;
  try {
    meta = await sharp(input, { failOn: 'none' }).metadata();
  } catch {
    return { buffer: input, ext: originalExt, changed: false };
  }
  const format = meta.format;
  if (format === 'svg' || (format === 'gif' && (meta.pages ?? 1) > 1)) return { buffer: input, ext: originalExt, changed: false };

  const width = meta.width ?? 0;
  if ((format === 'jpeg' || format === 'webp') && input.length <= SMALL_ENOUGH && width <= MAX_WIDTH) {
    const ext = format === 'jpeg' ? 'jpg' : 'webp';
    // 이미 가벼워도 촬영 정보(EXIF·GPS 위치)가 있으면 지웁니다(개인정보 보호). 방향은 미리 바로잡음.
    if (meta.exif || meta.xmp || meta.iptc) {
      const stripped = await sharp(input, { failOn: 'none' }).rotate().toFormat(format, format === 'jpeg' ? { quality: 90, mozjpeg: true } : { quality: 90 }).toBuffer();
      return { buffer: stripped, ext, changed: true, width };
    }
    return { buffer: input, ext, changed: false, width };
  }

  let opaque = true;
  if (meta.hasAlpha) {
    try {
      opaque = (await sharp(input, { failOn: 'none' }).stats()).isOpaque;
    } catch {
      opaque = false;
    }
  }

  const pipeline = sharp(input, { failOn: 'none' }).rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true });
  const output = opaque
    ? await pipeline.flatten({ background: '#ffffff' }).jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer()
    : await pipeline.webp({ quality: WEBP_QUALITY }).toBuffer();
  const ext = opaque ? 'jpg' : 'webp';

  if (output.length >= input.length && ext === normalizeExt(originalExt)) {
    return { buffer: input, ext: normalizeExt(originalExt), changed: false, width };
  }
  return { buffer: output, ext, changed: true, width: Math.min(width, MAX_WIDTH) };
}

export function normalizeExt(ext) {
  const e = String(ext || '').toLowerCase().replace(/^\./, '');
  return e === 'jpeg' ? 'jpg' : e;
}
