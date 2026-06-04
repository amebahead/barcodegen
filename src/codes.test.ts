import { describe, it, expect } from 'vitest';
import { generateCode } from './codes';

describe('generateCode', () => {
  it('CODE128 바코드를 svg로 생성한다', () => {
    const el = generateCode('ABC-123', 'barcode');
    expect(el.tagName.toLowerCase()).toBe('svg');
    expect(el.querySelectorAll('rect, path').length).toBeGreaterThan(0);
  });

  it('QR을 svg로 생성한다', () => {
    const el = generateCode('https://example.com', 'qr');
    expect(el.tagName.toLowerCase()).toBe('svg');
    expect(el.querySelectorAll('rect, path').length).toBeGreaterThan(0);
  });

  it('빈 값이면 throw한다', () => {
    expect(() => generateCode('', 'barcode')).toThrow();
  });
});
