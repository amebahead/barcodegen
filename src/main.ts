import { generateCode, type CodeType } from './codes';
import './style.css';

const input = document.querySelector<HTMLTextAreaElement>('#data-input')!;
const grid = document.querySelector<HTMLDivElement>('#grid')!;
const status = document.querySelector<HTMLElement>('#status');

const currentMode = (): CodeType =>
  (document.querySelector<HTMLInputElement>('input[name="mode"]:checked')?.value as CodeType) ?? 'barcode';

const parseValues = (raw: string): string[] =>
  raw.split('\n').map((s) => s.trim()).filter(Boolean);

function render(): void {
  const values = parseValues(input.value);
  const type = currentMode();
  grid.replaceChildren();
  for (const value of values) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    try {
      cell.appendChild(generateCode(value, type));
    } catch {
      cell.classList.add('error');
      const msg = document.createElement('div');
      msg.className = 'error-msg';
      msg.textContent = '⚠ 생성 실패';
      cell.appendChild(msg);
    }
    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = value;
    cell.appendChild(label);
    grid.appendChild(cell);
  }
  if (status) status.textContent = values.length ? `${values.length}개` : '';
}

let timer: number | undefined;
const scheduleRender = (): void => {
  window.clearTimeout(timer);
  timer = window.setTimeout(render, 250);
};

input.addEventListener('input', scheduleRender);
document.querySelectorAll('input[name="mode"]').forEach((el) => el.addEventListener('change', render));
render();
