import { generateCode, type CodeType } from './codes';
import { downloadPng, downloadAllAsZip, type ExportItem } from './export';
import './style.css';

const input = document.querySelector<HTMLTextAreaElement>('#data-input')!;
const grid = document.querySelector<HTMLDivElement>('#grid')!;
const status = document.querySelector<HTMLElement>('#status');
const printBtn = document.querySelector<HTMLButtonElement>('#print')!;
const zipBtn = document.querySelector<HTMLButtonElement>('#download-all')!;

const currentMode = (): CodeType =>
  (document.querySelector<HTMLInputElement>('input[name="mode"]:checked')?.value as CodeType) ?? 'barcode';

const parseValues = (raw: string): string[] =>
  raw.split('\n').map((s) => s.trim()).filter(Boolean);

let items: ExportItem[] = [];

function buildCell(value: string, type: CodeType): HTMLDivElement {
  const cell = document.createElement('div');
  cell.className = 'cell';
  let item: ExportItem | null = null;
  try {
    const svg = generateCode(value, type);
    cell.appendChild(svg);
    item = { value, svg };
  } catch {
    cell.classList.add('error');
    const msg = document.createElement('div');
    msg.className = 'error-msg';
    msg.textContent = "⚠ Can't encode";
    cell.appendChild(msg);
  }
  const label = document.createElement('div');
  label.className = 'label';
  label.textContent = value;
  cell.appendChild(label);
  if (item) {
    items.push(item);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'png-btn';
    btn.textContent = 'PNG';
    btn.addEventListener('click', () => downloadPng(item));
    cell.appendChild(btn);
  }
  return cell;
}

function render(): void {
  const values = parseValues(input.value);
  const type = currentMode();
  items = [];
  grid.replaceChildren(...values.map((v) => buildCell(v, type)));
  if (status) status.textContent = values.length ? `${values.length} codes` : '';
  printBtn.disabled = zipBtn.disabled = items.length === 0;
}

let timer: number | undefined;
const scheduleRender = (): void => {
  window.clearTimeout(timer);
  timer = window.setTimeout(render, 250);
};

input.addEventListener('input', scheduleRender);
document.querySelectorAll('input[name="mode"]').forEach((el) => el.addEventListener('change', render));
printBtn.addEventListener('click', () => window.print());
zipBtn.addEventListener('click', () => downloadAllAsZip(items));
render();
