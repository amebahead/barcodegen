import JSZip from 'jszip';

export type ExportItem = { value: string; svg: SVGElement };

/** 입력값을 안전한 파일명으로 변환한다(영숫자/._- 외엔 _). 비면 'code'. */
export function sanitizeFilename(value: string): string {
  const cleaned = value.replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64);
  return cleaned || 'code';
}

/** SVG의 픽셀 크기를 width/height 또는 viewBox에서 구한다. */
export function svgPixelSize(svg: SVGElement): { width: number; height: number } {
  const w = parseFloat(svg.getAttribute('width') ?? '');
  const h = parseFloat(svg.getAttribute('height') ?? '');
  if (w > 0 && h > 0) return { width: w, height: h };
  const vb = (svg.getAttribute('viewBox') ?? '').split(/[ ,]+/).map(Number);
  if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) return { width: vb[2], height: vb[3] };
  return { width: 300, height: 150 };
}

/** SVG를 흰 배경 PNG Blob으로 래스터화한다(scale배 확대로 선명하게). */
export function svgToPngBlob(svg: SVGElement, scale = 2): Promise<Blob> {
  const { width, height } = svgPixelSize(svg);
  const clone = svg.cloneNode(true) as SVGElement;
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  const data = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([data], { type: 'image/svg+xml;charset=utf-8' }));
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image load failed')); };
    img.src = url;
  });
}

/** Blob을 filename으로 다운로드시킨다. */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** 단일 코드를 PNG로 다운로드한다. */
export async function downloadPng(item: ExportItem): Promise<void> {
  triggerDownload(await svgToPngBlob(item.svg), `${sanitizeFilename(item.value)}.png`);
}

/** 모든 코드를 PNG로 만들어 하나의 ZIP으로 다운로드한다(파일명 중복 시 접미사). */
export async function downloadAllAsZip(items: ExportItem[]): Promise<void> {
  const zip = new JSZip();
  const used = new Map<string, number>();
  for (const item of items) {
    const base = sanitizeFilename(item.value);
    const n = used.get(base) ?? 0;
    used.set(base, n + 1);
    zip.file(`${n ? `${base}_${n}` : base}.png`, await svgToPngBlob(item.svg));
  }
  triggerDownload(await zip.generateAsync({ type: 'blob' }), 'codes.zip');
}
