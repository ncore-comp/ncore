# 특별휴가 grant 구조 v141 1차 결과
# Special Leave Grant Structure v141 Phase 1 Result

## 1. 이번 단계 목적
## 1. Goal of This Phase

- 특별휴가를 `종류별 총량`이 아니라 `grant 단위`로 다룰 수 있도록 프런트/서버 구조를 먼저 바꾼다.
- Change the frontend/server structure so special leave can be handled per `grant`, not only as a per-type aggregate.

- 아직 운영 데이터를 강제로 마이그레이션하지 않고, 새 구조를 받을 수 있는 기반을 먼저 만든다.
- Do not force-migrate production data yet; build the foundation so the new structure can be accepted first.

## 2. 반영 범위
## 2. Implemented Scope

- 특별휴가 종류 설정
- Special leave type settings

  - `발생일 기준`
  - `소멸 방향`
  - `기한 일수`
  입력 UI 추가

- 사용자 수정 모달의 특별휴가 부여 UI
- User-edit modal special-leave grant UI

  - `grant 행 추가` 구조 도입
  - `발생일` 입력
  - `부여 일수`
  - `사용 가능 기간` 미리보기

- 요청 저장 구조
- Request save structure

  - `specialLeaveGrantId` 저장 경로 추가

- 서버 저장/검증 구조
- Server save/validation structure

  - `specialLeaveTypes`의 expiry rule 저장 허용
  - `userSpecialLeaves`의 `grantId / eventDate / grantedHours / usableFromDate / usableToDate` 저장 허용
  - 특별휴가 요청 시 선택된 grant 기준 검증 추가

- 로그인 팝업 준비
- Login popup groundwork

  - `grant` 기준 경고/소멸 판단 helper 추가

## 3. 수정 파일
## 3. Changed Files

- [index.html](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/index.html)
- [core_logic_new_design_v141_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/core_logic_new_design_v141_codex.js)
- [ui_shared_helpers_v141_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_shared_helpers_v141_codex.js)
- [ui_shared_request_v141_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_shared_request_v141_codex.js)
- [ui_logic_new_design_v141_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_logic_new_design_v141_codex.js)
- [ui_permissions_v141_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_permissions_v141_codex.js)
- [ui_user_management_v141_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_user_management_v141_codex.js)
- [common.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/functions/src/lib/common.js)
- [specialLeaveRepo.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/functions/src/repositories/firestore/specialLeaveRepo.js)
- [specialLeaveService.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/functions/src/services/specialLeaveService.js)
- [requestPolicy.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/functions/src/policies/requestPolicy.js)
- [requestService.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/functions/src/services/requestService.js)
- [loadService.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/functions/src/services/loadService.js)

## 4. 상태 구분
## 4. Status Breakdown

- 소스 파일 수정: 완료
- Source files updated: complete

- 현재 운영 웹 반영: 완료
- Deployed to current hosting: complete

- 사용자 화면에서 확인: 일부 확인
- Confirmed on user-visible screens: partially confirmed

## 5. 테스트 구분
## 5. Test Breakdown

- 단독 함수 테스트 성공
- Single-file syntax tests passed

  - 프런트 `v141` JS 문법 검사 통과
  - Backend modified JS syntax checks passed

- 통합 경로 테스트 성공
- Integrated-flow checks passed

  - [https://ncore.web.app](https://ncore.web.app) 배포 완료
  - Hosting HTML에서 `v141` 파일 로드 확인
  - `권한/설정 > 특별휴가 종류 설정`에 새 입력 DOM 확인
  - `구성원 관리 > 직원 수정 > 특별휴가`에 `grant 행 추가` DOM 확인

- 실제 사용자 실행 경로 성공
- Real user execution path passed

  - 아직 미완료
  - Not fully completed yet

## 6. 아직 남은 것
## 6. Remaining Work

- 실제 특별휴가 종류 저장 후 재조회 확인
- Verify save/reload after actually saving special leave type settings

- 실제 직원 특별휴가 grant 저장 후 재조회 확인
- Verify save/reload after actually saving user grant rows

- 실제 특별휴가 신청 경로에서 `specialLeaveGrantId` 저장/승인/취소 확인
- Verify `specialLeaveGrantId` save/approve/cancel on a real special leave request

- 로그인 팝업 실제 노출 확인
- Verify real login popup behavior

## 7. 한 줄 결론
## 7. One-Line Conclusion

- 특별휴가 `grant 단위` 구조는 v141에서 코드/배포 기준으로 1차 연결이 완료됐고, 이제 실제 데이터 저장과 신청 흐름의 실사용 검증이 다음 단계다.
- The special-leave `grant-based` structure is now wired in v141 at code/deployment level, and real data-save/request-flow validation is the next step.
