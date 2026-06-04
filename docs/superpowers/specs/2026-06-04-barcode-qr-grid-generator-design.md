# 바코드 / QR 멀티 생성기 — 설계 문서

- 날짜: 2026-06-04
- 상태: 승인 대기 (사용자 리뷰)
- 저장소: `barcodegen` (사용자 `amebahead`)

## 1. 개요 / 목적

여러 개의 문자열 데이터를 한 번에 입력하면, 각 항목을 **CODE128 바코드** 또는 **QR 코드**로
변환해 **반응형 격자(grid)** 로 화면에 표시하는 정적 웹사이트.

- 별도 서버 없음 — 모든 코드 생성이 **브라우저(클라이언트)** 에서 동작
- GitHub Pages(`*.github.io`)로 무료 호스팅
- TypeScript 기반, 프레임워크 없이 가볍고 compact하게

## 2. 요구사항

### 기능 요구사항
- **입력**: textarea에 **한 줄당 데이터 1개** (빈 줄 무시, 앞뒤 공백 trim)
- **모드 토글**: `바코드(CODE128 auto)` ⇄ `QR` 라디오 선택. 토글 시 전체 코드가 즉시 해당 형식으로 다시 렌더
- **출력**: 입력된 각 항목을 코드(SVG)로 생성해 반응형 격자에 배치
- **텍스트 라벨**: 각 코드 **아래에 원본 데이터 문자열** 표시
- **자동 재생성**: 입력 변경 시 **debounce(250ms)** 후 자동 렌더 (별도 "생성" 버튼 없음). 모드 변경은 즉시 렌더
- **셀 단위 에러 처리**: 한 항목 생성이 실패해도 나머지는 정상 표시 (실패 셀만 에러 표시)

### 비기능 요구사항
- 배포 산출물은 순수 static (HTML/CSS/JS) — 런타임 서버/네트워크 의존 없음
- 가볍고 단순: 프레임워크(React/Vue 등) 미사용, 바닐라 TS + DOM
- 무료: GitHub 저장소 + Pages + Actions (공개 저장소 기준)

## 3. 기술 스택

| 영역 | 선택 | 비고 |
|---|---|---|
| 언어 | TypeScript | strict 모드 |
| 빌드/번들 | Vite | dev 서버 + static 빌드 |
| CODE128 | `jsbarcode` | SVG 출력, `format: 'CODE128'` (auto 서브셋 선택) |
| QR | `qrcode-generator` | **동기** SVG 출력 — 렌더 로직 단순화 |
| 테스트 | Vitest + happy-dom | `codes.ts` 단위 테스트 |
| 배포 | GitHub Actions → GitHub Pages | |

> 라이브러리 버전은 설치 시점의 **최신 안정판**을 사용한다(`npm install <pkg>`). 아래 코드의 import 형태만 계약으로 고정한다.

## 4. 파일 구조

```
barcodegen/
├─ index.html                 # 셸 (controls + #grid)
├─ src/
│  ├─ main.ts                 # UI 배선: 입력 파싱, 모드, debounce, 그리드 렌더
│  ├─ codes.ts                # 순수 생성 모듈 (테스트 대상)
│  ├─ codes.test.ts           # Vitest 단위 테스트
│  └─ style.css               # 반응형 CSS Grid 스타일
├─ vite.config.ts             # base 경로 + vitest 설정
├─ tsconfig.json
├─ package.json
├─ package-lock.json          # npm ci(CI)용 — 반드시 커밋
├─ .gitignore                 # node_modules, dist
├─ .github/workflows/deploy.yml
└─ README.md
```

## 5. 모듈 인터페이스 (계약 — 병렬 구현이 어긋나지 않도록 고정)

### `src/codes.ts` — 순수 생성 모듈
```ts
import JsBarcode from 'jsbarcode';
import qrcode from 'qrcode-generator';

export type CodeType = 'barcode' | 'qr';
const SVG_NS = 'http://www.w3.org/2000/svg';

/** value를 type 형식의 SVG 요소로 생성한다. 인코딩 불가/빈 값이면 throw. */
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
  const qr = qrcode(0, 'M');     // typeNumber 0 = 자동 크기, EC level M
  qr.addData(value);
  qr.make();
  const tag = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  const wrapper = document.createElement('div');
  wrapper.innerHTML = tag;
  return wrapper.querySelector('svg')!;
}
```

### `src/main.ts` — UI 배선 (계약: 아래 DOM id/name 사용)
```ts
import { generateCode, type CodeType } from './codes';
import './style.css';

const input = document.querySelector<HTMLTextAreaElement>('#data-input')!;
const grid  = document.querySelector<HTMLDivElement>('#grid')!;
const status = document.querySelector<HTMLElement>('#status');

const currentMode = (): CodeType =>
  (document.querySelector<HTMLInputElement>('input[name="mode"]:checked')?.value as CodeType) ?? 'barcode';

const parseValues = (raw: string): string[] =>
  raw.split('\n').map(s => s.trim()).filter(Boolean);

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
document.querySelectorAll('input[name="mode"]').forEach(el => el.addEventListener('change', render));
render();
```

### `index.html` — 고정 DOM 계약
- `#data-input` (textarea), `input[name="mode"]` 라디오 2개(value=`barcode`|`qr`, barcode가 `checked`), `#status`, `#grid`
- `style.css`는 `main.ts`에서 import (Vite 처리)
```html
<!doctype html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>바코드 / QR 멀티 생성기</title>
</head>
<body>
  <header>
    <h1>바코드 / QR 멀티 생성기</h1>
    <div class="controls">
      <label><input type="radio" name="mode" value="barcode" checked /> 바코드 (CODE128)</label>
      <label><input type="radio" name="mode" value="qr" /> QR</label>
      <span id="status"></span>
    </div>
    <textarea id="data-input" rows="6"
      placeholder="한 줄에 하나씩 입력하세요&#10;예:&#10;1234567890&#10;HELLO-WORLD"></textarea>
  </header>
  <main id="grid"></main>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

## 6. 스타일 (`src/style.css`)
- 반응형 그리드: `grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))`, `gap: 16px`
- `.cell`: 세로 정렬(코드 + 라벨), 가운데 정렬, 옅은 테두리/패딩
- `.cell svg`: `max-width: 100%; height: auto` (스케일러블)
- `.label`: 모노스페이스, `word-break: break-all`
- `.cell.error`: 점선 테두리 + 경고색
- 페이지 기본 레이아웃(헤더 controls 바 + 본문 그리드), 가독성 위주의 최소 스타일

## 7. 설정 파일

### `vite.config.ts`
```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/barcodegen/',          // Pages 프로젝트 경로 (repo명과 일치해야 함)
  test: { environment: 'happy-dom' },
});
```

### `tsconfig.json` (핵심)
- `target: ES2020`, `module: ESNext`, `moduleResolution: bundler`
- `lib: ["ES2020","DOM","DOM.Iterable"]`, `strict: true`
- `esModuleInterop: true` (jsbarcode / qrcode-generator default import)
- `skipLibCheck: true`, `noEmit: true`, `isolatedModules: true`, `include: ["src"]`

### `package.json` (scripts)
- `dev`: `vite`
- `build`: `tsc --noEmit && vite build`
- `preview`: `vite preview`
- `test`: `vitest run`
- deps: `jsbarcode`, `qrcode-generator`
- devDeps: `vite`, `typescript`, `vitest`, `happy-dom`, `@types/jsbarcode`, `@types/qrcode-generator`

### `.gitignore`
- `node_modules/`, `dist/`

## 8. 배포 (`.github/workflows/deploy.yml`)
- 트리거: `push`(main) + `workflow_dispatch`
- permissions: `contents: read`, `pages: write`, `id-token: write`
- concurrency: `pages` (cancel-in-progress)
- build job: checkout → setup-node(20, cache npm) → `npm ci` → `npm run build` → `actions/upload-pages-artifact@v3`(`./dist`)
- deploy job: `actions/deploy-pages@v4` (environment `github-pages`)

**수동 1회 설정 (사용자):**
1. GitHub에 **public** 저장소 `barcodegen` 생성 후 push
2. 저장소 **Settings → Pages → Source = "GitHub Actions"** 선택
3. 배포 후 `https://amebahead.github.io/barcodegen/` 에서 확인

## 9. 테스트 (`src/codes.test.ts`)
Vitest + happy-dom. `generateCode` 검증:
- `'ABC-123'`, `'barcode'` → `<svg>` 요소, 내부에 `rect|path` 1개 이상
- `'https://example.com'`, `'qr'` → `<svg>` 요소, 내부에 `rect|path` 1개 이상
- `''` (빈 값) → throw
> happy-dom에서 JsBarcode SVG 렌더에 문제가 있으면 jsdom으로 교체.

## 10. 범위 밖 (YAGNI)
- 인쇄, 이미지(PNG/ZIP) 다운로드, PDF 내보내기
- 프레임워크, 라우팅, 상태관리 라이브러리
- 백엔드/DB, 사용자 인증, 데이터 영속화
- 커스텀 도메인

## 11. 인수 조건 (Acceptance)
1. textarea에 N줄 입력 → N개 코드가 라벨과 함께 반응형 그리드로 표시
2. 모드 토글 → 전체 코드가 CODE128 ⇄ QR로 전환
3. 잘못된 항목은 해당 셀만 에러 표시, 나머지는 정상
4. `npm run build` 성공 → `dist/` static 산출물 생성
5. `npm test` 통과
6. Actions로 Pages 배포 → base 경로(`/barcodegen/`)에서 정상 로드

## 12. 구현 방식
사용자 선택에 따라 **Claude Workflow 도구로 멀티 에이전트 병렬 구현**:
- Phase 1 (병렬): ① 스캐폴드+인프라(config/html/.gitignore/README/deploy.yml) ② `codes.ts`+테스트(TDD) ③ `main.ts`+`style.css`
- Phase 2: 통합·검증 에이전트 — `npm install` → `npm run build` → `npm test` → 글루 수정
- 위 §5 계약(인터페이스/DOM id)을 모든 에이전트가 공유해 충돌 방지
