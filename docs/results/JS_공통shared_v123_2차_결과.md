# JS 공통 shared v123 2차 결과
# JS Shared Cleanup v123 Phase 2 Result

## 이번 단계 목표
## Goal of This Phase

- `공통 shared 정리` 계획의 `2단계 modal 분리`를 실행합니다.
- Execute `Phase 2 modal extraction` from the shared-cleanup plan.

- 구체적으로는:
  - 공용 reason modal 계열 함수를 별도 파일로 이동
  - `v123` 로딩 순서에 새 modal shared 파일 연결
- Concretely:
  - move the shared reason-modal functions into a dedicated file
  - wire the new shared modal file into the `v123` load order

## 이번 단계에서 한 일
## What Was Done

1. 새 단계 백업 생성
1. Created a new phase backup

- 백업 위치:
  - [backups/2026-04-06_js-shared-phase2_v123](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/backups/2026-04-06_js-shared-phase2_v123)

2. 공용 modal 파일 추가
2. Added the shared modal file

- 새 파일:
  - [ui_shared_modal_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_shared_modal_v123_codex.js)

- 이동한 함수:
  - `updateRejectReasonCounter`
  - `openReasonModal`
  - `promptRejectReason`
  - `promptRetroDetailReason`
  - `buildRetroactiveRequestContext`
  - `closeRejectReasonModal`
  - `confirmRejectReasonModal`

3. `ui_logic_v123` 정리
3. Slimmed down `ui_logic_v123`

- [ui_logic_new_design_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_logic_new_design_v123_codex.js) 에서 위 modal 블록을 제거했습니다.
- Removed the modal block above from [ui_logic_new_design_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_logic_new_design_v123_codex.js).

4. 로딩 순서 반영
4. Updated load order

- [index.html](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/index.html) 에
  - `ui_shared_modal_v123_codex.js`
를 `ui_shared_helpers_v123_codex.js` 다음에 추가했습니다.

## 이번 단계에서 건드리지 않은 것
## What Was Not Touched In This Phase

- `openRequestModal`
- `submitRequest`
- `processReq`
- `approveAll`
- 요청 저장 전 공통 충돌/상태 처리

- 즉 `shared request` 축은 다음 단계로 남겼습니다.
- The `shared request` layer is intentionally left for the next phase.

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

- [ui_shared_modal_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_shared_modal_v123_codex.js) 문법 검사 통과
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

- 공용 modal 분리는 성공입니다.
- Shared modal extraction is successful.

- 특히 `반려 사유`, `지난 날짜 상세사유` 같은 민감한 흐름이 그대로 살아 있는지 다시 검증을 통과했습니다.
- In particular, the sensitive flows around reject reasons and retro-detail reasons still pass validation.

## 다음 한 가지
## One Next Step

- 다음 단계는 `shared request 흐름 분리`입니다.
- The next step is `shared request flow extraction`.
