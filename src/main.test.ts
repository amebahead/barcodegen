import { describe, it, expect, beforeEach, vi } from 'vitest';

// index.html 의 body 구조(DOM 계약)와 동일한 최소 마크업
const BODY = `
  <header>
    <div class="controls">
      <label><input type="radio" name="mode" value="barcode" checked /> Barcode</label>
      <label><input type="radio" name="mode" value="qr" /> QR</label>
      <button id="print" type="button"></button>
      <button id="download-all" type="button"></button>
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
    expect(document.querySelectorAll('#grid .png-btn').length).toBe(3); // 셀마다 PNG 버튼
    expect(document.querySelector('#status')!.textContent).toBe('3 codes');
  });

  it('입력이 있으면 Print/ZIP 버튼이 활성화되고, 비우면 비활성화된다', async () => {
    await import('./main');
    const input = document.querySelector<HTMLTextAreaElement>('#data-input')!;
    const printBtn = document.querySelector<HTMLButtonElement>('#print')!;
    const zipBtn = document.querySelector<HTMLButtonElement>('#download-all')!;
    expect(printBtn.disabled).toBe(true); // 초기 빈 입력

    input.value = 'AAA';
    input.dispatchEvent(new Event('input'));
    await tick(300);
    expect(printBtn.disabled).toBe(false);
    expect(zipBtn.disabled).toBe(false);

    input.value = '';
    input.dispatchEvent(new Event('input'));
    await tick(300);
    expect(printBtn.disabled).toBe(true);
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
