import JsBarcode from 'jsbarcode';
import qrcode from 'qrcode-generator';

export type CodeType = 'barcode' | 'qr';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** value를 type 형식의 SVG 요소로 생성한다. 빈 값/인코딩 불가 시 throw. */
export function generateCode(value: string, type: CodeType): SVGElement {
  if (!value) throw new Error('empty value');
  return type === 'qr' ? renderQR(value) : renderBarcode(value);
}

function renderBarcode(value: string): SVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  // displayValue:false — 라벨은 main.ts가 별도로 렌더(중복 방지)
  JsBarcode(svg, value, { format: 'CODE128', displayValue: false, margin: 0 });
  return svg;
}

function renderQR(value: string): SVGElement {
  const qr = qrcode(0, 'M'); // typeNumber 0 = 자동 크기, EC level M
  qr.addData(value);
  qr.make();
  const tag = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  const wrapper = document.createElement('div');
  wrapper.innerHTML = tag;
  const svg = wrapper.querySelector('svg');
  if (!svg) throw new Error('QR svg generation failed');
  return svg;
}
