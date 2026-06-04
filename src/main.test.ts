import { describe, it, expect, beforeEach, vi } from 'vitest';

// index.html 의 body 구조(DOM 계약)와 동일한 최소 마크업
const BODY = `
  <header>
    <div class="controls">
      <label><input type="radio" name="mode" value="barcode" checked /> 바코드</label>
      <label><input type="radio" name="mode" value="qr" /> QR</label>
      <span id="status"></span>
    </div>
    <textarea id="data-input" rows="6"></textarea>
  </header>
  <main id="grid"></main>
`;

const tick = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('main UI 통합', () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = BODY;
  });

  it('여러 줄 입력이 debounce 후 그리드 셀로 렌더되고 빈 줄은 무시된다', async () => {
    await import('./main'); // 모듈 side-effect: 배선 + 초기 render
    const input = document.querySelector<HTMLTextAreaElement>('#data-input')!;
    input.value = 'AAA\nBBB\n\n  CCC  ';
    input.dispatchEvent(new Event('input'));
    await tick(300); // 250ms debounce 경과

    const cells = document.querySelectorAll('#grid .cell');
    expect(cells.length).toBe(3); // 빈 줄 제외
    expect(document.querySelectorAll('#grid .cell svg').length).toBe(3);
    expect(document.querySelectorAll('#grid .cell .label')[2].textContent).toBe('CCC'); // trim 확인
    expect(document.querySelector('#status')!.textContent).toBe('3개');
  });

  it('모드를 QR로 바꾸면 즉시 다시 렌더된다', async () => {
    await import('./main');
    const input = document.querySelector<HTMLTextAreaElement>('#data-input')!;
    input.value = 'https://example.com';
    input.dispatchEvent(new Event('input'));
    await tick(300);

    const qr = document.querySelector<HTMLInputElement>('input[value="qr"]')!;
    qr.checked = true;
    qr.dispatchEvent(new Event('change')); // change는 즉시 render

    const cells = document.querySelectorAll('#grid .cell');
    expect(cells.length).toBe(1);
    expect(cells[0].querySelector('svg')).toBeTruthy();
  });
});
