# employeeNo 기준키 v121 1차 결과
# employeeNo Primary Key v121 Phase 1 Result

## 작업 요약
## Summary

- `employeeNo` 누락/중복 검증을 프런트와 서버에 모두 추가했습니다.
- Added `employeeNo` required/duplicate validation in both frontend and server.

- 요청 소유자 판별 공통 함수에 `employeeNo 우선, legacy userId fallback` 규칙을 넣었습니다.
- Added a shared ownership matcher that prefers `employeeNo` and falls back to legacy `userId`.

- 신규 요청 저장 payload 에 `employeeNo`를 함께 저장하도록 보강했습니다.
- Updated new request payloads to persist `employeeNo` together with existing request fields.

## 반영 파일
## Updated Files

- [index.html](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/index.html)
- [core_logic_new_design_v121_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/core_logic_new_design_v121_codex.js)
- [ui_logic_new_design_v121_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_logic_new_design_v121_codex.js)
- [mobile_ui_new_design_v121_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/mobile_ui_new_design_v121_codex.js)
- [requestPolicy.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/functions/src/policies/requestPolicy.js)
- [userService.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/functions/src/services/userService.js)

## 이번 단계에서 막은 것
## What This Phase Now Blocks

- 사용자 추가 시 `employeeNo` 누락 저장
- Creating a user without `employeeNo`

- 사용자 추가 시 `employeeNo` 중복 저장
- Creating a user with a duplicate `employeeNo`

- 사용자 수정 시 `employeeNo`를 빈 값으로 저장
- Updating a user with an empty `employeeNo`

- 사용자 수정 시 다른 사용자와 같은 `employeeNo` 저장
- Updating a user to another user's `employeeNo`

- 서버 직접 호출로 `employeeNo` 누락/중복 저장 우회
- Bypassing frontend validation via direct server calls

## 공통 판별 규칙
## Shared Matching Rule

1. `request.employeeNo` 와 `user.employeeNo`가 모두 있으면 이것을 최우선으로 비교합니다.
1. If both `request.employeeNo` and `user.employeeNo` exist, compare these first.

2. `employeeNo`가 비어 있는 과거 요청만 `request.userId === user.id` fallback 을 사용합니다.
2. Only legacy requests without `employeeNo` use `request.userId === user.id` as a fallback.

## 남아 있는 다음 단계
## Next Remaining Step

- 과거 요청 데이터에 `employeeNo`를 실제로 backfill 해서 fallback 의존도를 줄여야 합니다.
- Historical requests still need `employeeNo` backfill so the system can rely less on legacy fallback.

- 잔여 연차/개인 달력/개인 요청 화면을 실제 계정으로 다시 확인해야 합니다.
- Leave balance, personal calendar, and personal request views should be rechecked with real accounts.

## 추가 보완
## Additional Follow-up

- `recalcUsedHours()` 와 요청 소유 판별에 `unique name fallback` 을 임시로 추가했습니다.
- Added a temporary `unique name fallback` to `recalcUsedHours()` and request ownership matching.

- 이 fallback 은 `employeeNo` 가 없는 과거 요청이 새 사용자 카드와 다시 연결될 때만 동작합니다.
- This fallback only applies when legacy requests do not yet carry `employeeNo`.
