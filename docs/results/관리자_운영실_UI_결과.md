> 시간 기록 기준: Asia/Seoul
> 문서 최초 작성 시각(파일 기준): 2026-03-24 16:47:11
> 문서 최근 수정 시각(파일 기준): 2026-03-25 10:13:44
# 관리자 운영실 UI 결과

업데이트: 2026-03-24

## 1. 구현 완료 범위

`권한/설정` 화면 안에 `운영실` 탭을 추가했고, 아래 3가지 기능을 연결했습니다.

1. 최근 접속 로그 조회
2. 달력 기반 관리자 대리 등록/삭제
3. 수동 휴일 설정

## 2. 구현 방식

쉽게 비유하면:

- 기존 `권한/설정`은 관리실
- 이번 작업은 그 안에 `운영실 관제판`을 추가한 것

즉 새 페이지를 따로 만든 것이 아니라, 기존 관리자 화면 안에 운영 기능을 붙였습니다.

## 3. 서버 반영 내용

추가/반영된 서버 액션:

- `load_admin_ops_data`
- `upsert_manual_holiday`
- `delete_manual_holiday`

관련 파일:

- [functions/index.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/functions/index.js)
- [functions/src/services/adminOpsService.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/functions/src/services/adminOpsService.js)
- [functions/src/handlers/adminOpsHandlers.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/functions/src/handlers/adminOpsHandlers.js)
- [functions/src/policies/permissionPolicy.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/functions/src/policies/permissionPolicy.js)
- [functions/src/policies/requestPolicy.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/functions/src/policies/requestPolicy.js)
- [functions/src/services/requestService.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/functions/src/services/requestService.js)

## 4. 프런트 반영 내용

운영실 탭 UI 추가:

- [js/ui_logic_new_design_v114_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_logic_new_design_v114_codex.js)

운영실 데이터 로드/수동 휴일 API 연결:

- [js/core_logic_new_design_v114_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/core_logic_new_design_v114_codex.js)

핵심 추가 기능:

- `renderAdminOpsPanel()`
- `renderAdminOpsLogPanel()`
- `renderAdminOpsProxyPanel()`
- `renderAdminOpsHolidayPanel()`
- `saveAdminManualHoliday()`
- `deleteAdminManualHoliday()`
- `deleteAdminManagedRequest()`

## 5. 실제 검증 결과

### 5-1. 문법 검사

통과:

- [js/ui_logic_new_design_v114_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_logic_new_design_v114_codex.js)
- [js/core_logic_new_design_v114_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/core_logic_new_design_v114_codex.js)
- [functions/index.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/functions/index.js)
- [functions/src/services/adminOpsService.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/functions/src/services/adminOpsService.js)

### 5-2. 배포

실제 운영 배포 완료:

- `functions`
- `hosting`

운영 주소:

- [https://ncore.web.app](https://ncore.web.app)

### 5-3. 실제 동작 확인

운영 사이트 기준 확인 완료:

1. 마스터 로그인
2. `권한/설정 -> 운영실` 진입
3. 운영실 데이터 로드
4. 수동 휴일 저장
5. 수동 휴일 삭제
6. 다른 직원 대상 관리자 대리 등록
7. 등록된 연차 내역 삭제

확인된 알림:

- `수동 휴일 저장 완료`
- `수동 휴일 삭제 완료`
- `관리자 대리 등록이 완료되었습니다.`
- `연차 내역 삭제 완료`

## 6. 현재 동작 원칙

### 접속 로그

- 최근 로그를 운영실에서 조회 가능

### 대리 등록/삭제

- 관리자 권한 범위 안의 직원만 대상 선택 가능
- 달력 기준으로 날짜를 선택하고 대리 등록 가능
- 선택 날짜에 걸친 요청을 바로 삭제 가능

### 수동 휴일

- `manual` 소스만 수정/삭제 가능
- 자동 공휴일(`auto`)과 창립기념일(`company_fixed`)은 운영실에서 직접 수정하지 않음

## 7. 결론

관리자 운영실 UI는 현재 운영본에 구현/배포/실검증까지 완료된 상태입니다.

## 8. 최근 접속 로그 정렬 개선

추가 개선 완료:

- 기존 `accessLogs.timestamp` 값은
  - `2026-03-25 07:09:35` 같은 문자열 형식
  - `46100.67802083334` 같은 엑셀 serial 형식
  이 섞여 있었습니다.
- 이 때문에 `최근 접속 로그`가 실제 최근순처럼 보이지 않는 문제가 있었습니다.

이번 조치:

1. 로그마다 `sortTimestamp` 필드 추가
2. 기존 `accessLogs` 전체 backfill 실행
3. 서버 조회는 `sortTimestamp desc` 기준으로 변경
4. 화면 표시는 사람이 읽는 `YYYY-MM-DD HH:mm:ss` 형식으로 통일

반영 파일:

- [functions/src/lib/common.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/functions/src/lib/common.js)
- [functions/src/services/logService.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/functions/src/services/logService.js)
- [functions/src/repositories/firestore/accessLogRepo.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/functions/src/repositories/firestore/accessLogRepo.js)
- [js/core_logic_new_design_v114_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/core_logic_new_design_v114_codex.js)
- [scripts/backfill-access-log-sort-timestamp.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/scripts/backfill-access-log-sort-timestamp.js)

실행 결과:

- backfill 대상: `1892건`
- `updated: 1892`
- `invalid: 0`

운영 서버 확인:

- 최상단 로그가 실제 최신 시각 기준으로 정렬됨
- 예:
  - `2026-03-25 07:09:35 Web관리자 Login`
  - `2026-03-25 07:09:27 김유진 Login`
  - `2026-03-25 07:09:17 Web관리자 Logout`
# 9. 운영실 대리수정 기능 추가

업데이트: 2026-03-25

- 운영실 하단 요청 카드 `수정` 버튼 동작을 완성했다.
- 관리자 대리수정은 `결재`가 아니라 `DB 직접 정정`으로 분리했다.
- status는 그대로 유지하고, 메일은 보내지 않도록 했다.
- 관리자 수정 로그는 `AdminRequestEdit`로 분리했다.

핵심 규칙:

- 시간차(퇴근) 수정 시 퇴근시간은 로그인한 관리자 기준이 아니라
- 대상 직원의 현재 분기/날짜 기준 근무시간을 사용한다.

김효창 검증:

- 대상 직원: 김효창
- 테스트 날짜: `2026-03-27`
- 현재 퇴근시간 기준: `16:00`
- 수정 후 저장 결과:
  - `status: approved` 유지
  - `reason: 여행`
  - `timeRange: 13:00~16:00`
  - `AdminRequestEdit` 로그 확인

검증 스크립트:

- [scripts/verify-admin-proxy-edit.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/scripts/verify-admin-proxy-edit.js)

상세 결과:

- [관리자_운영실_대리수정_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/관리자_운영실_대리수정_결과.md)

# 10. 운영실 대리등록 직행 반영

업데이트: 2026-03-25

- 운영실 신규 등록은 더 이상 `결재 대기 신청`으로 저장되지 않는다.
- 현재는 `관리자 직행 입력`으로 처리된다.

적용 규칙:

- 운영실 등록 시 `approved`로 바로 저장
- 결재 대기 미노출
- 메일 미발송
- 로그는 `AdminRequestCreate`

실검증:

- 대상 직원: 김효창
- 날짜: `2026-04-02`
- 종류: `시간차(퇴근)`
- 결과:
  - 저장 상태 `approved`
  - `결재 대기` 미노출
  - `AdminRequestCreate` 로그 확인

상세 결과:

- [운영실_대리등록_직행_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/운영실_대리등록_직행_결과.md)
## 2026-03-26 07:19 추가 점검

- 공휴일 동기화: 이상 없음
- 로그 CSV 다운로드: 정상 동작
- 수동 휴일 설정: 정상 동작
- 오늘 기준 운영실 급한 수정 필요 항목 없음

- 관련 문서:
  - [D:\MYDOC\Desktop\vscode\Web\firebase\ncore_web\ncore-main\운영실_최종점검_결과_2026-03-26.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/운영실_최종점검_결과_2026-03-26.md)

