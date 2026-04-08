# JS 공통 shared v123 3차 결과
# JS Shared Cleanup v123 Phase 3 Result

## 이번 단계 목표
## Goal of This Phase

- `공통 shared 정리` 계획의 `3단계 request 흐름 분리`를 실행합니다.
- Execute `Phase 3 shared request flow extraction` from the shared-cleanup plan.

## 이번 단계에서 한 일
## What Was Done

1. 새 단계 백업 생성
1. Created a new phase backup

- 백업 위치:
  - [backups/2026-04-06_js-shared-phase3_v123](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/backups/2026-04-06_js-shared-phase3_v123)

2. 공용 request 파일 추가
2. Added the shared request file

- 새 파일:
  - [ui_shared_request_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_shared_request_v123_codex.js)

- 이동한 함수:
  - `openRequestModal`
  - `getConflictMessageByStatus`
  - `handleRequestConflict`
  - `handleDuplicateRequestConflict`
  - `approveAll`
  - `editReq`
  - `submitRequest`
  - `processReq`
  - `deleteReq`

3. `ui_logic_v123` 축소
3. Slimmed down `ui_logic_v123`

- [ui_logic_new_design_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_logic_new_design_v123_codex.js) 에서 request 공용 블록을 제거했습니다.
- Removed the shared request block from [ui_logic_new_design_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_logic_new_design_v123_codex.js).

4. 로딩 순서 반영
4. Updated load order

- [index.html](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/index.html) 에
  - `ui_shared_request_v123_codex.js`
를 `ui_shared_modal_v123_codex.js` 다음에 추가했습니다.

## 이번 단계에서 건드리지 않은 것
## What Was Not Touched In This Phase

- feature 파일 재분리
- 서버 함수 구조
- 남은 `ui_logic` 최종 축소 정리

## 상태 구분
## State Split

- 소스 파일 수정: 완료
- Source updated: done

- 현재 운영 웹 반영: 완료
- Live hosting applied: done

- 사용자 화면에서 확인: 완료
- User-visible confirmation: done

## 테스트 구분
## Test Split

### 단독 함수 테스트
### Single-Function / Syntax Validation

- [ui_shared_request_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_shared_request_v123_codex.js) 문법 검사 통과
- [ui_logic_new_design_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_logic_new_design_v123_codex.js) 문법 검사 통과

### 통합 경로 테스트
### Integrated Flow Validation

- [reports/playwright-ui-smoke-last.json](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/reports/playwright-ui-smoke-last.json)
  - `10 passed / 0 failed`
- [reports/real-simulation-test-last.json](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/reports/real-simulation-test-last.json)
  - `17 passed / 0 failed`

### 실제 사용자 실행 경로 테스트
### Real User Execution Path Validation

- [reports/manual-v122-browser-check-last.json](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/reports/manual-v122-browser-check-last.json)
  - `5 passed / 0 failed`

## 현재 판단
## Current Assessment

- 공용 request 흐름 분리까지 성공했습니다.
- Shared request flow extraction is successful.

- 이제 `v123`는
  - `ui_shared_helpers`
  - `ui_shared_modal`
  - `ui_shared_request`
세 개의 공용 층을 갖게 되었습니다.
- `v123` now has three shared layers:
  - `ui_shared_helpers`
  - `ui_shared_modal`
  - `ui_shared_request`

## 다음 한 가지
## One Next Step

- 다음 단계는 `남은 ui_logic 축소 정리`입니다.
- The next step is slimming down the remaining `ui_logic`.
