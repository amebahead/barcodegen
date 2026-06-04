# 바코드 / QR 멀티 생성기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 여러 문자열을 한 줄당 하나씩 입력하면 각 항목을 CODE128 바코드 또는 QR 코드로 변환해 반응형 격자로 표시하는 정적 웹사이트를 만들고 GitHub Pages로 배포한다.

**Architecture:** 프레임워크 없는 바닐라 TypeScript + Vite. `codes.ts`가 순수 SVG 생성 모듈(테스트 대상), `main.ts`가 DOM 배선(입력 파싱·debounce·렌더). 빌드 산출물은 순수 static이며 GitHub Actions가 Pages로 배포한다.

**Tech Stack:** TypeScript, Vite, jsbarcode(CODE128), qrcode-generator(QR), Vitest + happy-dom.

참고 스펙: `docs/superpowers/specs/2026-06-04-barcode-qr-grid-generator-design.md`

---

## File Structure

| 파일 | 책임 |
|---|---|
| `package.json` | 스크립트·의존성 |
| `tsconfig.json` | TS 컴파일러 설정(strict, DOM) |
| `vite.config.ts` | `base` 경로 + Vitest 환경(happy-dom) |
| `.gitignore` | `node_modules/`, `dist/` 제외 |
| `index.html` | 셸: controls + `#grid` (DOM 계약) |
| `src/codes.ts` | 순수 생성: `generateCode(value, type) → SVGElement` |
| `src/codes.test.ts` | `codes.ts` 단위 테스트 |
| `src/main.ts` | UI 배선: 파싱·모드·debounce·렌더 |
| `src/style.css` | 반응형 CSS Grid 스타일 |
| `.github/workflows/deploy.yml` | Actions → Pages 배포 |
| `README.md` | 사용/개발/배포 안내 |

**의존성 계약(모든 태스크 공유):**
- `generateCode(value: string, type: 'barcode' | 'qr'): SVGElement` — 빈 값/인코딩 불가 시 throw
- `index.html` DOM id/name: `#data-input`(textarea), `input[name="mode"]`(value `barcode`/`qr`, barcode가 checked), `#status`, `#grid`

---

## Task 1: 프로젝트 스캐폴드 + 의존성

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `.gitignore`

- [ ] **Step 1: package.json 생성**

```json
{
  "name": "barcodegen",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  }
}
```

- [ ] **Step 2: 의존성 설치 (최신 안정판)**

Run:
```bash
npm install jsbarcode qrcode-generator
npm install -D vite typescript vitest happy-dom @types/jsbarcode @types/qrcode-generator
```
Expected: 설치 성공, `package-lock.json` 생성, `node_modules/` 생성.

- [ ] **Step 3: tsconfig.json 생성**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "isolatedModules": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: vite.config.ts 생성**

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/barcodegen/',
  test: { environment: 'happy-dom' },
});
```

- [ ] **Step 5: .gitignore 생성**

```
node_modules/
dist/
```

- [ ] **Step 6: 설치 확인**

Run: `npm ls jsbarcode qrcode-generator vite typescript vitest happy-dom`
Expected: 6개 패키지가 버전과 함께 표시(에러 없음). `package-lock.json` 존재.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts .gitignore
git commit -m "chore: 프로젝트 스캐폴드 및 의존성 설정"
```

---

## Task 2: codes.ts — 순수 생성 모듈 (TDD)

**Files:**
- Create: `src/codes.ts`
- Test: `src/codes.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성 (`src/codes.test.ts`)**

```ts
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
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npx vitest run`
Expected: FAIL — `Failed to resolve import "./codes"` (모듈 없음).

- [ ] **Step 3: 최소 구현 (`src/codes.ts`)**

```ts
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
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npx vitest run`
Expected: PASS — 3 tests passed.
> happy-dom에서 JsBarcode/QR SVG 파싱이 실패하면 `npm i -D jsdom` 후 `vite.config.ts`의 `test.environment`를 `'jsdom'`으로 교체.

- [ ] **Step 5: Commit**

```bash
git add src/codes.ts src/codes.test.ts
git commit -m "feat: CODE128/QR SVG 생성 모듈(codes.ts) + 테스트"
```

---

## Task 3: UI 셸 — index.html + main.ts + style.css

**Files:**
- Create: `src/style.css`, `index.html`, `src/main.ts`

- [ ] **Step 1: 스타일 작성 (`src/style.css`)**

```css
:root { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
* { box-sizing: border-box; }
body { margin: 0; padding: 24px; color: #1a1a1a; background: #fafafa; }
h1 { font-size: 1.25rem; margin: 0 0 12px; }

.controls { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; flex-wrap: wrap; }
.controls label { display: inline-flex; align-items: center; gap: 4px; cursor: pointer; }
#status { color: #888; font-size: 0.9rem; margin-left: auto; }

#data-input {
  width: 100%; padding: 10px;
  font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 0.9rem;
  border: 1px solid #ccc; border-radius: 6px; resize: vertical;
}

#grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px; margin-top: 20px;
}
.cell {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; padding: 16px;
  background: #fff; border: 1px solid #e2e2e2; border-radius: 8px;
}
.cell svg { max-width: 100%; height: auto; }
.cell .label {
  font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 0.8rem;
  text-align: center; word-break: break-all; color: #333;
}
.cell.error { border-color: #e57373; border-style: dashed; }
.cell.error .error-msg { color: #c62828; font-size: 0.85rem; }
```

- [ ] **Step 2: 셸 작성 (`index.html`)**

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

- [ ] **Step 3: UI 배선 작성 (`src/main.ts`)**

```ts
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
```

- [ ] **Step 4: 빌드 확인**

Run: `npm run build`
Expected: `tsc --noEmit` 타입 에러 없음 → `vite build` 성공 → `dist/` 생성(`dist/index.html`, `dist/assets/*.js`).

- [ ] **Step 5: 수동 동작 확인**

Run: `npm run preview` 후 표시된 URL을 브라우저로 열기.
Expected:
- textarea에 여러 줄 입력 → 약 250ms 후 격자에 코드가 라벨과 함께 생성
- "바코드 ⇄ QR" 토글 → 전체 코드 형식 전환
- 빈 줄은 무시됨

- [ ] **Step 6: Commit**

```bash
git add index.html src/main.ts src/style.css
git commit -m "feat: UI 셸/그리드 렌더링/모드 토글(main.ts, style.css, index.html)"
```

---

## Task 4: 배포 워크플로 + README

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`

- [ ] **Step 1: 배포 워크플로 작성 (`.github/workflows/deploy.yml`)**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: README 작성 (`README.md`)**

````markdown
# 바코드 / QR 멀티 생성기

문자열을 한 줄당 하나씩 입력하면 CODE128 바코드 또는 QR 코드를 격자로 생성하는 정적 웹앱.
모든 처리는 브라우저에서 동작하며 서버가 없습니다.

## 개발

```bash
npm install
npm run dev      # 개발 서버
npm test         # 단위 테스트
npm run build    # dist/ 정적 빌드
npm run preview  # 빌드 결과 미리보기
```

## 배포 (GitHub Pages)

1. **public** 저장소 `barcodegen`에 push
2. 저장소 **Settings → Pages → Source = "GitHub Actions"** 선택
3. main에 push되면 자동 배포 → `https://<사용자>.github.io/barcodegen/`

> 저장소 이름이 `barcodegen`이 아니면 `vite.config.ts`의 `base`를 `'/<저장소명>/'`로 변경하세요.
````

- [ ] **Step 3: 빌드 재확인**

Run: `npm run build`
Expected: 성공(이전과 동일하게 `dist/` 생성).

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy.yml README.md
git commit -m "ci: GitHub Pages 배포 워크플로 + README"
```

---

## Task 5: 최종 통합 검증

**Files:** (수정 없음 — 검증 전용. 글루 이슈 발견 시 해당 파일 수정)

- [ ] **Step 1: 테스트 전체 통과**

Run: `npm test`
Expected: PASS — 3 tests.

- [ ] **Step 2: 빌드 성공**

Run: `npm run build`
Expected: 타입 에러 없음, `dist/` 생성.

- [ ] **Step 3: 수동 최종 확인**

Run: `npm run preview`
Expected: 다중 입력 → 격자 생성, 바코드/QR 토글 정상, 라벨 표시, 잘못된 입력 시 해당 셀만 에러 표시.

- [ ] **Step 4: (글루 수정이 있었다면) Commit**

```bash
git add -A
git commit -m "fix: 통합 검증 후 보정"
```

- [ ] **Step 5: 사용자 GitHub 설정 안내**
  - public 저장소 생성 + remote 연결 + push
  - Settings → Pages → Source = GitHub Actions
  - 배포 URL 확인

---

## 실행 시 병렬화 매핑 (Workflow 도구용)

- **Phase 1 (선행, 단일):** Task 1 (스캐폴드 + `npm install`) — 공유 상태(package.json/node_modules) 생성
- **Phase 2 (병렬):** Task 2(codes+test) · Task 3(UI) · Task 4(배포+README) — 서로 다른 파일, §의존성 계약 공유
- **Phase 3 (검증):** Task 5 — 통합 빌드·테스트·보정
