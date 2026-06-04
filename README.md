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
