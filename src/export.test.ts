import { describe, it, expect } from 'vitest';
import { sanitizeFilename, svgPixelSize } from './export';

describe('sanitizeFilename', () => {
  it('영숫자/._-는 유지하고 나머지는 _로 바꾼다', () => {
    expect(sanitizeFilename('ORDER 2026/06')).toBe('ORDER_2026_06');
  });

  it('연속 기호는 하나의 _로, URL의 점은 유지한다', () => {
    expect(sanitizeFilename('https://example.com')).toBe('https_example.com');
  });

  it('기호만이거나 빈 값이면 fallback("code")', () => {
    expect(sanitizeFilename('!!!')).toBe('code');
    expect(sanitizeFilename('')).toBe('code');
  });
});

describe('svgPixelSize', () => {
  const NS = 'http://www.w3.org/2000/svg';

  it('width/height 속성을 읽는다', () => {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '200');
    svg.setAttribute('height', '100');
    expect(svgPixelSize(svg)).toEqual({ width: 200, height: 100 });
  });

  it('width/height가 없으면 viewBox에서 구한다', () => {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 33 33');
    expect(svgPixelSize(svg)).toEqual({ width: 33, height: 33 });
  });
});
