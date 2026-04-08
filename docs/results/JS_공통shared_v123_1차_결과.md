# JS 공통 shared v123 1차 결과
# JS Shared Cleanup v123 Phase 1 Result

## 이번 단계 목표
## Goal of This Phase

- `공통 shared 정리` 계획의 `0단계 + 1단계`를 실행합니다.
- Execute `Phase 0 + Phase 1` of the shared-cleanup plan.

- 구체적으로는:
  - 새 백업 생성
  - `v123` 기준선 파일 복제
  - 가장 안전한 공용 helper 묶음을 별도 파일로 이동
- Concretely:
  - create a fresh backup
  - clone a `v123` baseline
  - move the safest shared helper bundle into a dedicated file

## 이번 단계에서 한 일
## What Was Done

1. 새 백업 생성
1. Created a fresh backup

- 백업 위치:
  - [backups/2026-04-06_js-shared-prep_v122](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/backups/2026-04-06_js-shared-prep_v122)
- 포함 파일:
  - `index.html`
  - `v122` 기준 JS 묶음 전체

2. `v123` 기준선 파일 생성
2. Created the `v123` baseline files

- 새 파일:
  - [core_logic_new_design_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/core_logic_new_design_v123_codex.js)
  - [ui_app_shell_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_app_shell_v123_codex.js)
  - [ui_logic_new_design_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_logic_new_design_v123_codex.js)
  - [ui_situation_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_situation_v123_codex.js)
  - [ui_workreport_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_workreport_v123_codex.js)
  - [ui_permissions_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_permissions_v123_codex.js)
  - [ui_user_management_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_user_management_v123_codex.js)
  - [ui_calendar_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_calendar_v123_codex.js)
  - [ui_dashboard_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_dashboard_v123_codex.js)
  - [mobile_ui_new_design_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/mobile_ui_new_design_v123_codex.js)
  - [ui_bootstrap_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_bootstrap_v123_codex.js)

3. 공용 helper 파일 추가
3. Added a dedicated shared-helper file

- 새 파일:
  - [ui_shared_helpers_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_shared_helpers_v123_codex.js)

- 이 파일로 먼저 이동한 범위:
  - 날짜/시간 포맷
  - 역할/타이틀 라벨
  - 특별휴가 메타/선택 로직
  - 연차/잔업/특근 타입 분류
  - 근무시간/주52시간 계산
  - 권한 판정
  - employeeNo / request 연결
  - 관리 범위 계산

4. `ui_logic_v123` 축소
4. Slimmed down `ui_logic_v123`

- [ui_logic_new_design_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_logic_new_design_v123_codex.js) 에서
  - `fmtDate` ~ `canManageTargetUser`
  영역을 제거했습니다.
- 결과적으로 `ui_logic_v123`는 feature 사이의 연결층에 조금 더 가까워졌습니다.

5. `index.html` 로딩 순서 갱신
5. Updated `index.html` load order

- `v123` 스크립트 기준으로 교체
- `ui_shared_helpers_v123_codex.js`를 `shell` 뒤, `ui_logic_v123` 앞에 추가

## 이번 단계에서 건드리지 않은 것
## What Was Not Touched In This Phase

- shared modal 분리
- shared request 흐름 분리
- 서버 구조 변경
- feature 파일 내부 추가 정리

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

- 아래 `v123` 파일 문법 검사 통과
- Syntax check passed for the following `v123` files

  - [core_logic_new_design_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/core_logic_new_design_v123_codex.js)
  - [ui_app_shell_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_app_shell_v123_codex.js)
  - [ui_shared_helpers_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_shared_helpers_v123_codex.js)
  - [ui_logic_new_design_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_logic_new_design_v123_codex.js)
  - feature files 전체

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

- 확인한 흐름:
  - 마스터 홈/달력
  - 직원 잔업/특근 신청
  - 마스터 잔업/특근 현황/상세
  - 마스터 권한/설정
  - 마스터 구성원 관리
  - 마스터 전체 상황판/자리배치도

## 현재 판단
## Current Assessment

- `공통 shared 정리`의 가장 위험이 낮은 첫 단계는 성공입니다.
- The lowest-risk first phase of shared cleanup is successful.

- 즉:
  - `v123` 기준선 생성 성공
  - helper 공용층 추가 성공
  - helper 이동 후도 기존 흐름 유지 성공
- In short:
  - `v123` baseline created successfully
  - shared helper layer added successfully
  - behavior remained stable after helper extraction

## 다음 한 가지
## One Next Step

- 다음 단계는 `shared modal 분리`입니다.
- The next step is `shared modal extraction`.
