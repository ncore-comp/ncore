# JS 공통 shared 정리 계획
# JS Shared Layer Cleanup Plan

## 목적
## Goal

- `v122` 기능군 분할이 끝난 뒤에도 아직 [ui_logic_new_design_v122_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_logic_new_design_v122_codex.js) 안에 남아 있는 공용 함수들을 별도 `shared` 층으로 정리합니다.
- After the `v122` feature split, reorganize the shared helpers still left in [ui_logic_new_design_v122_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_logic_new_design_v122_codex.js) into dedicated `shared` layers.

- 목표는 기능 추가가 아니라, `공통 함수의 위치와 책임을 명확히 하는 것`입니다.
- The goal is not to add features, but to make shared-function ownership and boundaries explicit.

## 현재 상태
## Current State

- `v122`는 아래 구조까지 분리 완료되었습니다.
- `v122` has already been split into these feature files.

  - [ui_app_shell_v122_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_app_shell_v122_codex.js)
  - [ui_situation_v122_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_situation_v122_codex.js)
  - [ui_workreport_v122_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_workreport_v122_codex.js)
  - [ui_permissions_v122_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_permissions_v122_codex.js)
  - [ui_user_management_v122_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_user_management_v122_codex.js)
  - [ui_calendar_v122_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_calendar_v122_codex.js)
  - [ui_dashboard_v122_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_dashboard_v122_codex.js)
  - [ui_bootstrap_v122_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_bootstrap_v122_codex.js)

- 하지만 공용 요청 처리, 공용 모달, 공통 포맷/권한/근무시간 계산 함수는 아직 [ui_logic_new_design_v122_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_logic_new_design_v122_codex.js) 에 남아 있습니다.
- However, shared request flows, shared modals, common formatting/permission/work-hour helpers still remain in [ui_logic_new_design_v122_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_logic_new_design_v122_codex.js).

- 현재 이 파일 줄 수:
  - `ui_logic_new_design_v122_codex.js` ≈ 4102줄
- Current size:
  - `ui_logic_new_design_v122_codex.js` ≈ 4102 lines

쉽게 비유하면:
- 방별 짐 정리는 끝났지만, 거실 공용 서랍에 여러 방이 같이 쓰는 물건이 아직 많이 남아 있는 상태입니다.
- In simple terms: room-by-room organization is done, but the living-room shared cabinet still contains many cross-room items.

## 왜 지금 shared 정리가 필요한가
## Why Shared Cleanup Is Needed Now

1. 공용 함수가 다시 `ui_logic` 한 곳에 몰리면, 다음 기능 작업 때 이 파일이 다시 커집니다.
1. If shared helpers keep accumulating in `ui_logic`, the file will grow again during future feature work.

2. 현재는 `어느 함수가 공용인지`, `어느 함수가 특정 기능 전용인지` 찾는 비용이 큽니다.
2. Right now it is still expensive to determine which helper is truly shared versus feature-specific.

3. 요청 처리 흐름은 여러 화면이 함께 사용합니다.
3. The request flow is reused across multiple screens.

- 연차 신청
- Leave request
- 운영실 대리등록
- Admin proxy registration
- 승인/반려
- Approve / reject
- 잔업/특근과 충돌 검사
- Work-report and conflict checks

4. 공통 계층을 분리해 두면 이후 `v123+`에서 기능 추가 시 영향 범위가 줄어듭니다.
4. Separating the common layer now reduces blast radius for future `v123+` changes.

## 이번 shared 정리에서 다루는 범위
## Scope of This Shared Cleanup

### 포함
### Included

- 공용 요청 모달 흐름
- Shared request-modal flow
- 공용 승인/반려 흐름
- Shared approval/rejection flow
- 공용 모달/알림/사유 입력 모달
- Shared modal/alert/reason-entry modals
- 포맷/권한/중복 충돌/근무시간 계산 등 공용 헬퍼
- Shared helpers such as formatting, permissions, duplicate-conflict handling, and work-hour calculations

### 제외
### Excluded

- 서버 함수 구조 변경
- Server-side restructuring
- 데이터 모델 변경
- Data model changes
- feature 파일 재분리
- Re-splitting feature modules again
- UI/UX 변경
- UI/UX changes

## 목표 구조
## Target Structure

### 유지
### Keep

- [ui_app_shell_v122_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_app_shell_v122_codex.js)
  - 상태값, 초기 shell, `window.app`
- [ui_bootstrap_v122_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_bootstrap_v122_codex.js)
  - 최종 `app.init()` 호출

### 새 shared 파일 제안
### Proposed Shared Files

1. `ui_shared_helpers_v123_codex.js`
1. `ui_shared_helpers_v123_codex.js`

- 날짜/시간 포맷
- Date/time formatting
- 텍스트/상태 라벨 변환
- Text/status label conversion
- 권한 판정 공통 함수
- Shared permission checks
- employeeNo / request 소유 판별 공통 함수
- Shared employeeNo / request ownership helpers
- 근무시간 / 주52시간 / timeoff 계산 공통 함수
- Shared work-time / 52-hour / timeoff calculations

2. `ui_shared_modal_v123_codex.js`
2. `ui_shared_modal_v123_codex.js`

- 공통 모달 열기/닫기
- Shared modal open/close
- 반려 사유 입력
- Reject-reason input
- 지난 날짜 상세사유 입력
- Retro detail-reason input
- 공용 alert / confirm 대체 유틸이 있다면 여기에 모음
- Any shared alert/confirm helpers if kept in JS

3. `ui_shared_request_v123_codex.js`
3. `ui_shared_request_v123_codex.js`

- `openRequestModal`
- `submitRequest`
- `processReq`
- `approveAll`
- `editReq`
- `handleDuplicateRequestConflict`
- `findTimeOffConflictRequest`
- 요청 저장 전 공통 검증/분기
- Common pre-save request validation/branching

## 기능별 경계
## Feature Boundaries

### feature에 남길 것
### Keep Inside Feature Modules

- 상황판 렌더/좌석배치도
- Situation rendering / seat map
- 잔업/특근 신청/현황/정산 UI
- Work-report apply/status/settlement UI
- 권한/설정 화면 렌더
- Permissions/settings screen rendering
- 구성원 관리 표/사용자 편집
- User-management table / edit flows
- 달력 렌더/달력 상세/대시보드 카드
- Calendar rendering / calendar detail / dashboard cards

### shared로 옮길 것
### Move Into Shared

- 여러 feature가 2곳 이상 직접 호출하는 함수
- Functions directly called from 2+ features
- DOM id는 다르더라도 의미가 같은 공통 모달 함수
- Shared modal handlers even if DOM ids differ by screen
- 요청 저장 로직처럼 `연차/운영실/잔업특근`이 함께 기대는 공용 처리
- Common request processing used by leave/admin/workreport flows

### 이번에도 그대로 둘 것
### Leave As-Is For Now

- `core_logic_new_design_v122_codex.js`
- `mobile_ui_new_design_v122_codex.js`
- 이미 분리된 feature 파일의 내부 함수
- Internal feature-only helpers already extracted

## 리스크
## Risks

1. 요청 모달 공용화 과정에서 연차/잔업특근/운영실 대리등록이 함께 깨질 수 있습니다.
1. While extracting request-shared code, leave/workreport/admin-proxy paths may break together.

2. `shared`로 빼면서 오히려 의존성이 더 숨을 수 있습니다.
2. A bad shared extraction can hide dependencies instead of clarifying them.

3. 로딩 순서가 바뀌면 `app` 메서드가 아직 붙기 전에 호출될 수 있습니다.
3. If load order changes incorrectly, methods may run before being attached to `app`.

## 안전 원칙
## Safety Rules

1. 백업은 단계마다 다시 만듭니다.
1. Create a fresh backup before each shared-cleanup phase.

2. 한 번에 한 shared 축만 옮깁니다.
2. Move only one shared domain at a time.

3. 함수 내용 변경보다 위치 이동을 우선합니다.
3. Prioritize relocation over behavioral rewrites.

4. 매 단계 끝에 동작 동일성 검증을 다시 돌립니다.
4. Re-run behavior parity checks after every phase.

## 백업 계획
## Backup Plan

- 시작 전 새 백업 폴더 생성:
  - `backups/2026-04-06_js-shared-prep_v122`
- Create a fresh backup folder before starting:
  - `backups/2026-04-06_js-shared-prep_v122`

- 포함 파일:
  - `index.html`
  - `js/core_logic_new_design_v122_codex.js`
  - `js/ui_app_shell_v122_codex.js`
  - `js/ui_logic_new_design_v122_codex.js`
  - `js/ui_situation_v122_codex.js`
  - `js/ui_workreport_v122_codex.js`
  - `js/ui_permissions_v122_codex.js`
  - `js/ui_user_management_v122_codex.js`
  - `js/ui_calendar_v122_codex.js`
  - `js/ui_dashboard_v122_codex.js`
  - `js/mobile_ui_new_design_v122_codex.js`
  - `js/ui_bootstrap_v122_codex.js`

## 실행 순서
## Execution Order

### 0단계. shared 후보 목록 확정
### Phase 0. Freeze Shared Candidate List

- `ui_logic_new_design_v122_codex.js` 안 남은 메서드를 다시 분류
- Reclassify the remaining methods in `ui_logic_new_design_v122_codex.js`
- 결과물을 `shared/helper/modal/request` 네 축으로 나눔
- Split the result into four groups: `shared/helper/modal/request`

### 1단계. helpers 분리
### Phase 1. Extract Helpers

- `ui_shared_helpers_v123_codex.js`
- 가장 안전한 축부터 이동
- Start with the safest helper-only group

검증:
- 날짜/시간 포맷
- 권한 판정
- 주52시간/근무시간 계산
- 연차 차감 계산

### 2단계. modal 분리
### Phase 2. Extract Shared Modals

- `ui_shared_modal_v123_codex.js`
- 반려 사유
- 지난 날짜 상세사유
- 공용 overlay/modal helper

검증:
- 반려 사유 입력
- 지난 날짜 연차 입력
- 잔업/특근 상세/수정 모달 열기

### 3단계. request 흐름 분리
### Phase 3. Extract Shared Request Flow

- `ui_shared_request_v123_codex.js`
- `openRequestModal`
- `submitRequest`
- `processReq`
- `approveAll`

검증:
- 연차 신청
- 운영실 대리등록
- 승인/반려
- 취소요청
- 잔업/특근 제출과 공존 여부

### 4단계. 남은 ui_logic 축소 정리
### Phase 4. Slim Down Remaining ui_logic

- `ui_logic_new_design_v123_codex.js` 는
  - shell과 feature 사이의 얇은 연결층만 남기는 방향
- Make `ui_logic_new_design_v123_codex.js` a much thinner bridge layer

## 로딩 순서
## Script Load Order

예상 순서:
1. [core_logic_new_design_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/core_logic_new_design_v122_codex.js) 기반 유지
2. `ui_app_shell_v123_codex.js`
3. `ui_shared_helpers_v123_codex.js`
4. `ui_shared_modal_v123_codex.js`
5. `ui_shared_request_v123_codex.js`
6. feature files
   - `ui_situation`
   - `ui_workreport`
   - `ui_permissions`
   - `ui_user_management`
   - `ui_calendar`
   - `ui_dashboard`
7. `mobile_ui_new_design_v123_codex.js`
8. `ui_bootstrap_v123_codex.js`

주의:
- 실제 시작 전에는 파일명을 `v123`로 올릴지, `v122` 유지 후 내부 shared만 추가할지 먼저 결정해야 합니다.
- Before implementation, decide whether to bump filenames to `v123` or keep `v122` and only add shared files.

## 롤백 기준
## Rollback Rule

- 아래 중 하나라도 깨지면 즉시 이전 단계 백업으로 되돌립니다.
- If any of these break, immediately roll back to the previous backup.

1. 로그인 후 홈 초기 렌더 실패
2. 연차 신청/승인 흐름 실패
3. 잔업/특근 신청/현황 실패
4. 권한/설정 저장 실패
5. 전체 상황판 또는 자리배치도 실패

## 성공 기준
## Success Criteria

1. `ui_logic_new_design_v122_codex.js` 줄 수가 의미 있게 줄어듭니다.
1. `ui_logic_new_design_v122_codex.js` becomes meaningfully smaller.

2. 공용 함수의 위치를 문서 없이도 예측할 수 있습니다.
2. Shared helper locations become predictable without hunting through the file.

3. 자동 검증
3. Automated checks

- `playwright-ui-smoke`
- `real-simulation-test`

4. 브라우저 직접 검증
4. Direct browser validation

- 홈/달력
- 잔업/특근 신청/현황
- 권한/설정
- 구성원 관리
- 전체 상황판

## 한 줄 결론
## One-Line Conclusion

- 공통 shared 정리는 `v122 기능 분할 성공` 이후의 후속 정리 작업이며, 가장 안전한 순서는 `helpers -> modals -> request flow -> 남은 ui_logic 축소`입니다.
- Shared cleanup is a follow-up refactor after the successful `v122` split, and the safest order is `helpers -> modals -> request flow -> shrink the remaining ui_logic`.
