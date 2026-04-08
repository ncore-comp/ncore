# JS 공통 shared 정리 v123 4차 결과
# JS Shared Cleanup v123 Phase 4 Result

## 요약
## Summary

- `ui_logic_new_design_v123_codex.js`에 남아 있던 공용 helper / 메일 / 권한 저장 축을 추가로 분리했습니다.
- `ui_shared_helpers_v123_codex.js`로 요청 소유자 판별, 메일 수신자 계산, 시간차 충돌 계산, 부재 상태 계산, 공용 로그 저장을 이동했습니다.
- `ui_shared_request_v123_codex.js`로 `togglePastDates()`를 이동했습니다.
- `ui_permissions_v123_codex.js`로 메일 설정 저장, 특별휴가 삭제 가능 판정, 권한 저장, 운영실 공용 메서드 일부를 이동했습니다.
- `ui_logic_new_design_v123_codex.js`는 `2544줄 -> 1813줄`로 감소했습니다.

## 이번 단계에서 남겨둔 것
## Intentionally Left in ui_logic

- `getModal()`
- `initModal()`
- `editAdminManagedRequest()`
- 로그인/세션/내비게이션
- 게시판/대시보드 잔여 축

위 항목은 현재 `toggleInputs()`, `updateOutPreview()` 같은 로컬 함수 의존성이 남아 있어서, 이번 단계에서는 무리해서 옮기지 않았습니다.
These items still depend on local helpers such as `toggleInputs()` and `updateOutPreview()`, so they were intentionally left in place for this phase.

## 변경 파일
## Changed Files

- [index.html](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/index.html)
- [ui_logic_new_design_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_logic_new_design_v123_codex.js)
- [ui_shared_helpers_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_shared_helpers_v123_codex.js)
- [ui_shared_request_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_shared_request_v123_codex.js)
- [ui_permissions_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_permissions_v123_codex.js)

## 백업
## Backup

- [2026-04-06_js-shared-phase4_v123](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/backups/2026-04-06_js-shared-phase4_v123)

## 검증
## Verification

### 소스 파일 수정
### Source Updated

- 완료

### 운영 웹 반영
### Deployed to Live App

- 완료
- [https://ncore.web.app](https://ncore.web.app)

### 사용자 화면 확인
### Visible Screen Check

- 브라우저 직접 조작 검증 완료

### 단독 함수 테스트
### Single-file Checks

- `node --check`
  - [ui_logic_new_design_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_logic_new_design_v123_codex.js)
  - [ui_shared_helpers_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_shared_helpers_v123_codex.js)
  - [ui_shared_request_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_shared_request_v123_codex.js)
  - [ui_permissions_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_permissions_v123_codex.js)

### 통합 경로 테스트
### Integrated Flow Checks

- [playwright-ui-smoke-last.json](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/reports/playwright-ui-smoke-last.json): `10 passed / 0 failed`
- [real-simulation-test-last.json](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/reports/real-simulation-test-last.json): `17 passed / 0 failed`

### 실제 사용자 실행 경로
### Real Browser Path Check

- [manual-v122-browser-check-last.json](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/reports/manual-v122-browser-check-last.json): `5 passed / 0 failed`

## 다음 한 가지
## One Next Step

- `v124`에서 `getModal()/initModal()`이 의존하는 로컬 함수(`toggleInputs`, `updateOutPreview`)를 `app` 메서드로 승격한 뒤, 남은 `ui_logic` 축소를 마무리하는 것이 가장 자연스럽습니다.
