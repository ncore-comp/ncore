> 시간 기록 기준: Asia/Seoul
> 문서 최초 작성 시각(파일 기준): 2026-03-23 07:09:56
> 문서 최근 수정 시각(기록 기준): 2026-03-30 07:43:00
# NCORE Firebase Handoff

마지막 업데이트: 2026-03-27

## 최근 추가 반영 메모

- 2026-04-07
  - 전체상황판 우측 요약 카드 제거
  - `situation-board-panel` 숨김, 메인 레이아웃 1열화로 달력 영역 확장
  - `ui_situation_v133_codex.js` 연결 및 hosting 재배포 완료
  - 브라우저 자동 검증 기준:
    - `panelDisplay: none`
    - `contentColumns: 1408px`
  - 관련 문서:
    - [전체상황판_우측요약제거_v133_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/전체상황판_우측요약제거_v133_결과.md)

- 2026-04-07
  - 전체상황판 달력 셀 폰트 확대 조정
  - `표준 / 크게 / 아주 크게` 버튼과 연동해 날짜, 칩, `연차 인원 : n명` 문구가 함께 커지도록 보정
  - `ui_situation_v132_codex.js` 추가 및 hosting 재배포 완료
  - 관련 문서:
    - [전체상황판_폰트확대_v132_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/전체상황판_폰트확대_v132_결과.md)

- 2026-04-07
  - 전체상황판 날짜 칸 우측 숫자 표기를 문구형으로 변경
  - 기존 단독 숫자 대신 날짜 칸 오른쪽 아래에 `연차 인원 : n명` 표시
  - `ui_situation_v131_codex.js` 추가 및 hosting 재배포 완료
  - 관련 문서:
    - [전체상황판_부재인원표기_v131_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/전체상황판_부재인원표기_v131_결과.md)

- 2026-04-07
  - `시간차(외출)`이 직원 근무시간과 맞지 않게 등록되는 원인 분석 완료
  - 원인:
    - 외출 시작시간 옵션이 직원별 근무시간 기준으로 생성되지 않음
    - 종료시간 계산이 고정 `18:00` 기준
    - 서버 최종 차단 없음
  - 후속 계획 문서 작성:
    - [시간차외출_근무시간기반_3단차단_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/시간차외출_근무시간기반_3단차단_계획.md)
  - 정책 보강:
    - `시간차(외출)`은 퇴근용으로 사용할 수 없으며, 퇴근 1시간 전에는 복귀해야 하는 기준으로 계획 업데이트
  - `v130`에서 1단 UI 옵션 제한 완료
  - 박서진(`09:00 ~ 18:00`) 기준 브라우저 검증:
    - 1시간 외출 시작시간 `09:00 ~ 16:00`
    - 2시간 외출 시작시간 `09:00 ~ 15:00`
  - 관련 문서:
    - [시간차외출_UI옵션제한_v130_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/시간차외출_UI옵션제한_v130_결과.md)

- 2026-04-07
  - 운영실 달력 날짜 클릭 시 `권한/설정` 전체 재렌더로 깜빡이던 현상 보정
  - `ui_logic_new_design_v129_codex.js`, `ui_permissions_v129_codex.js` 추가
  - 날짜 선택 / 대상 직원 변경 / 월 이동 / 로그 새로고침은 `admin-ops-panel-root`만 부분 갱신하도록 변경
  - hosting 재배포 완료
  - 브라우저 자동 검증 기준:
    - `appContainerMutations: 0`
    - `panelRootMutations: 1`
  - 관련 문서:
    - [운영실_달력부분갱신_v129_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/운영실_달력부분갱신_v129_결과.md)

- 2026-04-07
  - 현재 기준 전체 백업 `v128` 생성 완료
  - 소스 전체 스냅샷 + Firestore 스냅샷을 함께 백업
  - 백업 루트:
    - [2026-04-07_full-backup_v128](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/backups/2026-04-07_full-backup_v128)
  - 결과 문서:
    - [전체백업_v128_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/전체백업_v128_결과.md)

- 2026-04-07
  - 로그 읽기 절감 1차 착수
  - 운영실 진입 시 `접속 로그 / 보안 로그` 자동 로드 제거
  - 로그는 `불러오기` 버튼을 눌렀을 때만 최근 20건을 읽도록 변경
  - `ui_permissions_v123_codex.js` 한글 깨짐 복구
  - phase4 백업본 기준으로 권한/설정 화면 문자열을 복원하고, 로그 읽기 절감 1차 변경만 최소 범위로 재적용
  - hosting 재배포 완료
  - 배포된 `ui_permissions_v123_codex.js` 응답 본문에서 한글 문자열(`홈페이지 기능`, `게시판 기능`) 정상 확인
  - 로그인 오류 `app.getRequestModalTargetUser is not a function` 복구
  - shared 정리 과정에서 누락된 `관리자 대리등록 대상 사용자` 함수 묶음(`getAdminOpsTargetUsers`, `getRequestModalTargetUser`, `syncRequestTargetField` 등)을 `ui_logic_new_design_v123_codex.js`에 복원
  - hosting 재배포 후 자동 로그인 검증에서 오류 메시지 사라지고 본문 대시보드 정상 렌더 확인
  - `권한/설정` 전환 불능 원인 확인 및 복구
  - `renderMasterPermissionPage()` 내부에서 `app.getMailRouteTargets is not a function`으로 중단되던 문제였고, shared 정리 과정에서 누락된 메일 설정 함수 묶음(`getMailRouteTargets`, `renderMailRouteSection`, `saveMailSettings` 등)을 `ui_permissions_v123_codex.js`에 복원
  - hosting 재배포 후 `currentView = master-permissions` 전환 및 `마스터 권한 관리` 본문 렌더를 자동 경로 기준 확인
  - `운영실` 탭 전환 불능 원인 확인 및 복구
  - `renderAdminOpsPanel()` 내부에서 `app.buildAdminOpsCalendarData is not a function`으로 중단되던 문제였고, shared 정리 과정에서 누락된 운영실 달력 보조 함수(`buildAdminOpsCalendarData`, `getAdminOpsRequestsForDate`)를 `ui_logic_new_design_v123_codex.js`에 복원
  - hosting 재배포 후 자동 경로 기준 `masterTab = ops`, `운영실`, `접속 로그 불러오기`, `보안 로그 불러오기` 본문 렌더 확인
  - `전수 테스트 v123` 계획 문서 작성
  - 로그인/달력/연차/잔업특근/권한설정/운영실/구성원관리/게시판/전체상황판/모바일까지 포함한 전수 체크리스트와 실행 순서를 고정
  - `전수 테스트 v123` 실행 완료
  - 자동 테스트 3축 합계 `35 passed / 0 failed`
  - 관련 문서:
    - [전수테스트_v123_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/전수테스트_v123_계획.md)
    - [전수테스트_v123_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/전수테스트_v123_결과.md)
  - 점검 중 발견사항:
    - 운영실 `회사 휴일 설정` 목록에서 `창립기념일` 중복 노출
  - 관련 문서:
    - [로그_읽기절감_1차_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/로그_읽기절감_1차_계획.md)
    - [로그_읽기절감_1차_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/로그_읽기절감_1차_결과.md)

- 2026-04-07
  - `company_fixed`로 분리돼 있던 `노동절/창립기념일`을 `manual` 휴일로 통합
  - 운영실 휴일 패널 집계를 `창립` 분리 카운트에서 `회사휴일` 통합 카운트로 변경
  - 공휴일 동기화 완료 팝업도 `회사 고정휴일(수동 통합)` 기준으로 수정
  - 기존 `company_fixed` 10건은 백업 후 `manual`로 이관
  - 관련 문서: [공휴일_고정분_수동통합_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/공휴일_고정분_수동통합_결과.md)

- 2026-04-06
  - JS 메인 버전 `v118` 연결
  - `잔업/특근 신청` 모달에 `주 52시간 잔여 가능시간` 실시간 안내 추가
  - 저장 직전 `52시간 초과` 시 프런트 차단 1차 반영
  - 관련 문서: [잔업특근_주52시간_v118_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/잔업특근_주52시간_v118_결과.md)

- 2026-04-06
  - 잔업/특근 `주52시간` 적용 계획 문서 추가
  - 기준:
    - 기본근로시간 + 잔업 + 특근 합산
    - 주간 총합 52시간 초과 시 저장 차단
  - 관련 문서: [잔업특근_주52시간_적용계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/잔업특근_주52시간_적용계획.md)

- 2026-04-03
  - 홈 `잔업/특근 제출 대기`를 현재 달 기준에서 `미승인 제출 묶음 전체` 기준으로 변경
  - 이전달 승인 요청 건도 홈 결재함에 표시되도록 보정
  - `상세확인` 클릭 시 해당 정산월 상세 화면으로 직접 진입
  - 관련 문서: [잔업특근_결재대기_월무관_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/잔업특근_결재대기_월무관_결과.md)

- 2026-04-03
  - 관리자용 `월별 잔업/특근 현황` 상단 요약을 시간/일수 기준에서 인원 기준으로 변경
  - `총 잔업시간` -> `총 잔업 인원`
  - `총 특근일수` -> `총 특근 인원`
  - 개인 신청 화면의 `내 총 잔업시간 / 내 총 특근일수`는 그대로 유지
  - 관련 문서: [잔업특근_현황인원요약_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/잔업특근_현황인원요약_결과.md)

- 2026-04-01
  - JS 메인 버전 `v117` 연결
  - 잔업/특근 정산 상태값(`submitted / approved / rejected`) 추가
  - 홈 결재 대기 카드 안에 `잔업/특근 제출 대기` 섹션 추가
  - `상세확인` 화면 상단에 `승인 / 반려` 버튼 추가
  - 서버에 `approve_work_report_settlement`, `reject_work_report_settlement` 액션 추가
  - 관련 문서: [잔업특근_v117_승인흐름_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/잔업특근_v117_승인흐름_결과.md)

- 2026-04-01
  - JS 메인 버전 `v116` 연결
  - 권한 탭 `잔업/특근` 무반응 수정
  - `설정 테이블`의 잔업/특근 중복 토글 제거
  - 잔업/특근 수정 시 현황 모달을 닫고 수정 모달로 전환되게 보정
  - 특근은 `종일` 기준으로 입력되도록 수정
  - `메일 초안` 버튼 제거, `승인 요청` 시 요약 메일 작성창 자동 오픈으로 변경
  - 관련 문서: [잔업특근_v116_보완계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/잔업특근_v116_보완계획.md), [잔업특근_v116_보완결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/잔업특근_v116_보완결과.md)

- 2026-04-01
  - `월별 잔업/특근 현황 > 상세보기` 모달 확장 완료
  - 모달 폭 확대, 내부 세로 스크롤 추가, 비고 열 줄바꿈 강화
  - 로그인 후 다른 화면 구조는 건드리지 않고 상세 모달만 조정
  - `잔업/특근 제출 -> 메일 발송 -> 승인권자 승인` 흐름 계획 문서 추가
  - `잔업/특근 신청/현황 분리`, `개인탭 달력 통합`, `운영실 왼쪽 설정 탭 추가` 방향까지 계획 문서에 반영

## 1. 한 줄 요약

- 현재 운영 기준은 `Firebase Hosting + Cloud Functions + Firestore` 입니다.
- 메인 운영 주소는 `https://ncore.web.app` 입니다.
- 프런트 메인 진입 파일은 `index.html`, 현재 연결된 메인 스크립트는 `v117` 입니다.
- 공개 `GET load` 차단, 세션 없는 읽기 차단, `firestore.rules` 배포까지 완료됐습니다.

쉽게 비유하면:

- GitHub = 설계도 창고
- Firebase Hosting = 실제 매장
- Firestore = 운영 장부
- Functions = 규칙을 지키는 직원

## 2. 현재 운영 주소

- Firebase 프로젝트 ID: `ncore-vacation-system`
- 메인 주소: `https://ncore.web.app`
- 기본 주소: `https://ncore-vacation-system.web.app`
- API 경로: `/api`
- Firestore DB: `(default)`
- 리전: `asia-northeast3`

## 3. 현재 기준 폴더

- 실제 작업 폴더: `D:\MYDOC\Desktop\vscode\Web\firebase\ncore_web\ncore-main`
- GitHub 업로드용 정리 폴더: `D:\MYDOC\Desktop\vscode\Web\firebase\ncore_web\github_upload_ready_2026-03-20_v114_codex`

중요:

- 이 폴더는 현재 작업 기준이며, 예전 `C:\Users\kei85\...` 경로 문서는 더 이상 기준이 아닙니다.

## 4. GitHub에 올리면 안 되는 것

- Firebase 관리자 키 JSON
- 엑셀 원본 파일
- `node_modules`
- 테스트 결과 JSON

참고:

- 아래 두 파일은 현재 로컬 작업/검증 공유용으로 프로젝트 루트에 존재합니다.
- 현재 GitHub에는 올라가 있지 않은 상태로 관리합니다.
  - `Ncore_DB.xlsx`
  - `ncore-vacation-system-firebase-adminsdk-fbsvc-ddef59ca56.json`

## 5. 현재 구조

이전 구조:

- GitHub + Google Sheets + Apps Script

현재 구조:

- 화면 파일 -> Firebase Hosting
- 운영 데이터 -> Firestore
- 서버 처리 -> Firebase Functions

프런트는 더 이상 Apps Script URL을 직접 호출하지 않고 `/api` 를 호출합니다.

## 6. 현재 메인 코드 기준

- 메인 HTML: `index.html`
- 메인 로직:
  - `js/core_logic_new_design_v117_codex.js`
  - `js/ui_logic_new_design_v117_codex.js`
  - `js/mobile_ui_new_design_v117_codex.js`
- 배치도 원본: `gemini-svg.svg`

현재 `index.html` 은 위 `v117` 스크립트를 직접 참조합니다.

## 7. Firestore 이관 상태

컬렉션:

- `users`
- `requests`
- `boardPosts`
- `holidays`
- `specialLeaveTypes`
- `userSpecialLeaves`
- `mailRoutes`
- `accessLogs`

현재 해석:

- Firestore 데이터가 운영 최신본입니다.
- 엑셀은 비교 기준/백업 기준으로 보되, 수량이 더 적다고 해서 Firestore가 틀린 것으로 보지 않습니다.

예:

- `users`
  - 엑셀 36 / Firestore 37
  - Firestore 최신 운영 데이터 기준 통과
- `requests`
  - 엑셀 192 / Firestore 194
  - Firestore 최신 운영 데이터 기준 통과

### Requests 날짜 이슈

이전 문제:

- 엑셀 날짜가 serial number로 들어가면서 날짜가 깨졌음

조치:

- `scripts/import-firestore.js` 에서 Excel 숫자 날짜를 ISO 문자열로 변환하도록 수정

현재:

- Requests 날짜 정합성 정상
- 날짜 깨짐 이슈는 복구 완료

## 8. 로그인 / 인증 정책

현재 정책:

- 로그인 ID는 기존 값 유지
- 비밀번호는 평문이 아니라 `scrypt` 해시로 저장
- 테스트 기간 정책상 전 계정 초기 비밀번호는 공통 `0`
- 로그인 성공 후 서버 세션 토큰 발급
- 비밀번호 변경 시 현재 비밀번호 재인증 필수
- 로그인 실패 5회 시 5분 차단

즉:

- 겉으로는 예전처럼 로그인
- 내부적으로는 서버 세션 기반 인증 + 해시 비밀번호 + 로그인 차단 정책 적용

## 9. 이번 줄기에서 실제 완료된 핵심 개선

### 9-1. 쓰기 API 인증

- 세션 토큰 없는 쓰기 요청 차단
- 로그아웃 시 세션 무효화

### 9-2. 읽기 API 보호

- `GET /api?action=load...` 공개 읽기 차단
- 세션 기반 `load_data` 액션으로 전환

현재 운영 확인:

- `GET /api?action=load&scope=boot` -> `403 AUTH_REQUIRED`
- 세션 없는 `POST load_data` -> `SESSION_REQUIRED`
- 세션 있는 `POST load_data` -> `success`

### 9-3. Firestore rules

- `firestore.rules` 추가
- 클라이언트 직접 Firestore read/write 차단
- Functions 전용 구조 유지

### 9-4. 연차 저장 transaction

- Firestore transaction 기반으로 저장 처리
- 같은 날짜 동시 저장 시 1건만 성공, 나머지 중복 차단

## 10. 전체 상황판 / 자리배치도 상태

현재 판단:

- 전체 상황판 UI 마감 완료
- 자리배치도 UI 마감 완료
- 닫기 버튼 / 우측 당일 부재 인원 리스트 포함 현재 운영 기준으로 마감 완료

배치도 기준:

- 원본 파일은 `gemini-svg.svg`
- 현재 색상 규칙:
  - 출근 = 초록
  - 연차 / 특별연차 = 빨강
  - 반차 / 시간차 = 노랑

## 11. 테스트 상태

핵심 결과:

- E2E 5회 반복 통과
- 동시 로그인 / 동시 저장 / 중복 차단 확인
- 전체 상황판 / 자리배치도 / SVG 로드 확인
- 공개 읽기 차단, 세션 없는 읽기 차단, `firestore.rules` 반영 확인
- Playwright UI smoke 최신 기준 `10/10 통과`
- `compare-firestore` 정상 실행 확인
- 백업/복구 리허설 통과
  - 운영 Firestore 로컬 백업 생성
  - 에뮬레이터 import 성공
  - Functions E2E smoke 통과
  - compare 재확인 통과

기준 문서:

- `운영_전수테스트_체크리스트.md`

## 12. 현재 남은 큰 작업

실질적으로 남은 건 새 기능보다 장기 개선 과제입니다.

현재 남은 주요 항목:

- 세션 정책 강화
- 보안 로그 체계화
- 비밀번호 verify fallback 제거
- `load_data` 3차 잔여 분리
- Firestore rules 세분화 검토
- 자동 배포/GitHub Actions 검토
- 백업/복구 자동화 2차 확장
  - 1차는 완료
  - 남은 것은 보관정책/주간 compare/알림/외부 저장소 복제

정책상 정리된 항목:

- 네트워크 끊김 후 복구는 `자동 복구` 대신 `재로그인 허용`으로 봄
- 테스트 기간에도 비밀번호 저장 방식은 해시 유지
- 테스트 기간 정책은 `초기 비밀번호 0` 공통 적용

## 13. 배포 명령어

### 화면만 수정했을 때

```powershell
cd D:\MYDOC\Desktop\vscode\Web\firebase\ncore_web\ncore-main
firebase deploy --only hosting --project ncore-vacation-system
```

### 서버 / 화면 / rules 같이 수정했을 때

```powershell
cd D:\MYDOC\Desktop\vscode\Web\firebase\ncore_web\ncore-main
firebase deploy --only functions,hosting,firestore --project ncore-vacation-system
```

### 데이터 다시 넣을 때

```powershell
cd D:\MYDOC\Desktop\vscode\Web\firebase\ncore_web\ncore-main
node .\scripts\import-firestore.js
```

### 데이터 비교할 때

```powershell
cd D:\MYDOC\Desktop\vscode\Web\firebase\ncore_web\ncore-main
node .\scripts\compare-firestore.js
```

## 14. Functions v1 상태

- 별도 정리 폴더: `D:\MYDOC\Desktop\vscode\Web\firebase\ncore_web\ncore-main\functions_v1`
- 구조 분리 완료
  - `handler / service / repository / policy / lib / config`
- 종합점검 결과:
  - 27항목 통과
  - 결과 문서: `functions_v1_종합점검_결과.md`
- 루트 운영본 연동:
  - `functions_v1/functions/index.js` -> 루트 `functions/index.js` local merge 완료
  - `functions_v1/functions/src` -> 루트 `functions/src` local merge 완료
  - 루트 smoke 검증 통과
  - Firebase Functions 실제 배포 완료
  - 운영 서버에서 `GET load -> 403`, `login_boot -> success`, `load_data -> success` 재확인 완료

현재 해석:

- `functions_v1`는 구조 분리와 종합점검까지 끝난 준비된 기준본입니다.
- 루트 백엔드와의 merge 및 운영 Functions 배포까지 완료됐습니다.
- 현재 운영 백엔드 기준은 `functions_v1` 구조가 반영된 루트 `functions` 입니다.

## 15. GitHub와 Firebase 관계

- GitHub 업로드 = 설계도 보관
- Firebase deploy = 실제 서비스 반영

즉:

- GitHub에 올렸다고 운영 사이트가 바로 바뀌지 않음
- `firebase deploy` 를 해야 실제 사이트가 바뀜

## 16. 새 대화에서 바로 이어갈 문장

```text
이 프로젝트는 Firebase 이관본 기준으로 이어서 작업해줘.
현재 운영 주소는 https://ncore.web.app 이고, 메인 코드는 ncore-main/index.html + v117 JS 기준이다.
공개 GET load 차단, 세션 없는 읽기 차단, firestore.rules 추가와 배포까지 완료됐다.
functions_v1 구조 분리와 종합점검 27항목 통과까지 끝났다.
전체 상황판/자리배치도 UI는 마감 완료 상태로 보고, 남은 건 백업/복구 실제 리허설이다.
기준 문서는 handoff.md, 운영_전수테스트_체크리스트.md, 이후_작업_정리.md 이다.
```

## 17. 2026-03-23 실제 시뮬레이션 테스트 완료

- 기준 계획서: [실제_시뮬레이션_테스트_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/실제_시뮬레이션_테스트_계획.md)
- 결과 문서: [실제_시뮬레이션_테스트_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/실제_시뮬레이션_테스트_결과.md)
- 결과: 17 / 17 통과

확인한 범위:
- 일반직원 신청/게시판/특별휴가
- 팀장 승인/반려/취소 승인
- 대표 전체 상황판/자리배치도
- 마스터 구성원 관리/메일 라우트
- 동시 로그인, 동시 신청, 동시 승인/반려 충돌, 동시 구성원 등록
- Firestore 및 accessLogs 반영

현재 운영 판단:
- Firebase 운영본은 실제 역할 기반 모의 영업 테스트까지 통과한 상태이다.

## 18. 2026-03-25 접속 로그 정렬 보정 완료

운영 중 확인된 문제:

- 관리자 운영실의 `최근 접속 로그`가 실제 최근순처럼 보이지 않음

원인:

- `accessLogs.timestamp` 값 형식이 섞여 있었음
  - 문자열 시각: `2026-03-25 07:09:35`
  - 엑셀 serial 문자열: `46100.67802083334`
- Firestore 정렬 기준이 `timestamp` 하나라서 형식 혼재 시 최근순이 깨짐

조치:

1. `sortTimestamp` 필드 도입
2. 새 로그 저장 시 `sortTimestamp` 같이 저장
3. 서버 조회는 `sortTimestamp desc` 기준으로 변경
4. 기존 `accessLogs` 전체 backfill 실행
5. 화면에서는 엑셀 serial 형식도 사람이 읽는 시각 문자열로 변환해서 표시

반영 파일:

- [functions/src/lib/common.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/functions/src/lib/common.js)
- [functions/src/services/logService.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/functions/src/services/logService.js)
- [functions/src/repositories/firestore/accessLogRepo.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/functions/src/repositories/firestore/accessLogRepo.js)
- [js/core_logic_new_design_v114_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/core_logic_new_design_v114_codex.js)
- [scripts/backfill-access-log-sort-timestamp.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/scripts/backfill-access-log-sort-timestamp.js)

결과:

- backfill 대상 `1892건` 전부 보정 완료
- 운영 서버 `functions + hosting` 재배포 완료
- `최근 접속 로그`는 이제 실제 최근 시각 기준으로 정렬됨
# 2026-03-25 추가 반영

- 운영실 대리수정 기능 구현/배포/검증 완료
- 운영실 `수정`은 결재가 아니라 `DB 직접 정정` 개념으로 분리
- status는 그대로 유지
- 메일은 보내지 않음
- 관리자 수정 로그는 `AdminRequestEdit`로 기록
- 시간차(퇴근) 수정 시 대상 직원의 현재 분기/날짜 기준 근무시간을 사용

실검증:

- 김효창 대상 `시간차(퇴근)` 임시 승인건 생성
- 운영실에서 수정 실행
- 저장 후 `approved` 유지, `여행`, `13:00~16:00` 확인
- 로그 `AdminRequestEdit` 확인

관련 문서:

- [관리자_운영실_대리수정_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/관리자_운영실_대리수정_계획.md)
- [관리자_운영실_대리수정_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/관리자_운영실_대리수정_결과.md)
# 2026-03-25 추가 반영 - 분기별 출퇴근시간 연동 점검

- 분기별 근무시간(`workQ1~workQ4`) 연동 점검 완료
- 분기 경계 판정 정상
- 시간차(퇴근), 반차, 운영실 대리수정 모두 대상 직원의 분기 근무시간 기준으로 계산됨
- 운영 서버 기준 김효창 사례 확인
  - 현재 `Q1/Q2 = 07:00 ~ 16:00`
  - 운영실 수정 모달 퇴근시간 `16:00`
  - 저장 후 `timeRange = 13:00~16:00`

주의:

- 특정 분기 값이 비어 있으면 다른 분기 값으로 fallback 되는 구조
- 운영 혼선을 줄이려면 각 직원의 `workQ1~workQ4`를 모두 채워두는 것이 권장됨

관련 문서:

- [분기별_출퇴근시간_연동점검_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/분기별_출퇴근시간_연동점검_결과.md)
# 2026-03-25 추가 반영 - Q3/Q4 보정

- `workQ2`는 있고 `workQ3`, `workQ4`가 비어 있던 직원 데이터를 일괄 보정
- 규칙:
  - `workQ3 = workQ2`
  - `workQ4 = workQ2`
  - 단, 비어 있는 경우에만 적용
- 보정 전 Firestore 백업 생성 완료
- 보정 결과:
  - `updatedCount: 36`
  - `remainingBlankTargets: 0`
- 현재 운영 데이터 기준으로 하반기 분기값 공란 문제는 해소됨

관련 문서:

- [분기별_근무시간_Q3Q4_보정_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/분기별_근무시간_Q3Q4_보정_계획.md)
- [분기별_근무시간_Q3Q4_보정_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/분기별_근무시간_Q3Q4_보정_결과.md)

# 2026-03-25 추가 반영 - 운영실 대리등록 직행

- 운영실 신규 등록이 `pending 신청`으로 들어가던 문제 수정
- 프런트:
  - 운영실 등록 시 `status: approved`
- 서버:
  - `admin_create` 분기 추가
  - 관리자 직행 입력은 `approved`로 저장
  - `AdminRequestCreate` 로그 기록
- 운영 서버 배포 완료
- 실검증 완료:
  - 김효창 / 2026-04-02 / 시간차(퇴근)
  - DB 상태 `approved`
  - 결재 대기 미노출
  - `AdminRequestCreate` 로그 확인

관련 문서:

- [운영실_대리등록_직행_원인및조치.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/reference/운영실_대리등록_직행_원인및조치.md)
- [운영실_대리등록_직행_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/운영실_대리등록_직행_결과.md)
# 2026-03-25 추가 반영 - 지난 신청 상세사유 필수화

- 적용 대상:
  - 지난 날짜 신청
  - 오늘 날짜 기준 이미 지난 시간의 `시간차(퇴근)` / `시간차(외출)`
- 동작 방식:
  - 기존 반려 사유 팝업 UI를 재사용
  - 저장 필드는 `detailReason`
  - `rejectReason`와 분리
- 표시:
  - 운영실 선택 날짜 카드
  - 달력 툴팁
  에 `상세사유` 노출
- 운영 반영:
  - `functions + hosting` 배포 완료
- 검증:
  - 테스트용 임시 직원 생성 후 실제 브라우저 흐름 검증
  - `지난 날짜 팝업`, `지난 시간차 팝업`, `detailReason` 저장 모두 통과

관련 문서:

- [지난신청_상세사유_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/지난신청_상세사유_계획.md)
- [지난신청_상세사유_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/지난신청_상세사유_결과.md)
# 2026-03-25 추가 반영 - 근무시간 표기 / 신규 저장 검증 / 공휴일 동기화

- 직원 카드 분기 근무시간 라벨에서 연도 제거
- 신규 직원 저장 시 `workQ1 ~ workQ4` 미입력 차단 추가
- 운영실 `수동 휴일 설정` 카드에 `공휴일 동기화` 버튼 추가
- Functions secret `PUBLIC_DATA_API_KEY` 연결 완료
- 운영 서버에서 공휴일 수동 동기화 실행 성공
  - `2026 ~ 2030`
  - `importedCount: 47`
  - `autoCount: 42`
  - `companyFixedCount: 5`

관련 문서:

- [근무시간표기_저장검증_공휴일동기화_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/근무시간표기_저장검증_공휴일동기화_계획.md)
- [근무시간표기_저장검증_공휴일동기화_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/근무시간표기_저장검증_공휴일동기화_결과.md)
# 2026-03-25 추가 반영 - 공휴일 동기화 범위 지정

- 운영실 공휴일 동기화에 `시작연도`, `종료연도` 입력칸 추가
- 기본값:
  - 시작연도: 현재 연도
  - 종료연도: 현재 연도 + 1
- 범위 검증:
  - 시작연도 > 종료연도 차단
  - 큰 범위는 추가 확인창
- 검증:
  - `2027 ~ 2028` 범위 지정 실행 성공
  - `importedCount: 23`
  - `autoCount: 21`
  - `companyFixedCount: 2`

관련 문서:

- [공휴일_동기화_범위_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/공휴일_동기화_범위_계획.md)
- [공휴일_동기화_범위_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/공휴일_동기화_범위_결과.md)
# 2026-03-25 추가 반영 - 노동절 고정휴일 추가

- 매년 `5월 1일`을 `노동절`로 고정 휴일(`company_fixed`)에 추가
- `창립기념일(7월 1일)`과 동일한 방식으로 동기화 시 자동 생성
- `2026 ~ 2030` 동기화 실행 결과
  - `companyFixedCount: 10`
- 실제 Firestore에서 `2026-05-01 ~ 2030-05-01` 문서 생성 확인

관련 문서:

- [노동절_고정휴일_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/노동절_고정휴일_결과.md)
# 2026-03-25 추가 반영 - 접속로그 CSV 다운로드

- 운영실 `최근 접속 로그` 카드에 `CSV 다운로드` 버튼 추가
- 다운로드 대상은 최근 20건이 아니라 `accessLogs` 전체
- CSV 컬럼:
  - `timestamp,userName,userId,type,ip,detail,sortTimestamp`
- 최신순 정렬
- UTF-8 BOM 포함
- 검증 결과:
  - 전체 행 수 `2371`
  - 버튼 표시 및 CSV 응답 성공 확인

관련 문서:

- [접속로그_CSV다운로드_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/접속로그_CSV다운로드_계획.md)
- [접속로그_CSV다운로드_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/접속로그_CSV다운로드_결과.md)
# 2026-03-25 추가 반영 - 전체상황판 반차/시간차 분리

- 전체상황판 일일 요약에서 `반차`와 `시간차`를 분리
- 월간 요약 달력 칩에서도 `반차`, `시간차`를 별도 표시
- 우측 `당일 부재 인원` 카드에 반차/시간차 상세시간 표시

검증:

- `연차 1 / 반차 0 / 시간차 2` 분리 표시 확인
- `당일 부재 인원` 카드에서 `10:00~16:00`, `14:00~17:00` 등 시간 표시 확인

관련 문서:

- [전체상황판_반차시간차_분리_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/전체상황판_반차시간차_분리_결과.md)

# 2026-03-25 추가 반영 - 전체상황판 시간차 세분화 / 현재 시각 자리배치도 완료

- 전체상황판 집계를 `반차`, `시간차(퇴근)`, `시간차(외출)`로 분리
- 전체 자리배치도는 오늘 날짜일 때 현재 시각 기준으로 실제 부재 여부 반영
- 자리배치도 우측 `당일 부재 인원` 카드에 반차/시간차 상세 시간 표시
- 색상 구분:
  - 반차 = amber/orange
  - 시간차(퇴근) = cyan
  - 시간차(외출) = violet

검증

- 검증 스크립트로 샘플 일정 5건 주입 후 확인
- 요약 집계:
  - `annualCount = 1`
  - `halfDayCount = 1`
  - `timeOffLeaveCount = 1`
  - `timeOffOutCount = 2`
- 자리배치도 실제 부재 인원:
  - `statusMapSize = 4`
  - 현재 시각 범위 밖 `시간차(외출)` 1건은 제외 확인

주의

- 본 화면 우측 요약은 날짜 기준 일정 수
- `전체 자리배치도` 모달 우측 패널은 현재 시각 기준 실제 부재 인원

관련 문서:

- [D:\MYDOC\Desktop\vscode\Web\firebase\ncore_web\ncore-main\전체상황판_시간차분리_현재시각자리배치_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/전체상황판_시간차분리_현재시각자리배치_계획.md)
- [D:\MYDOC\Desktop\vscode\Web\firebase\ncore_web\ncore-main\전체상황판_시간차분리_현재시각자리배치_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/전체상황판_시간차분리_현재시각자리배치_결과.md)

- 2026-03-25 15:15 추가 정정
  - 전체상황판 월간 칩의 `퇴근`, `외출` 약칭을 각각 `시간차(퇴근)`, `시간차(외출)`로 변경
  - 운영 반영 후 본문 표기 확인 완료

- 2026-03-25 15:37 추가 정정
  - 전체상황판에서 `연차` 색상을 붉은 계열로 통일
  - 월간 칩 / 우측 요약 패널에 동일 적용
## 2026-03-26 07:19 운영실 최종점검

- 공휴일 동기화: 이상 없음
- 로그 CSV 다운로드: 정상 동작
- 수동 휴일 설정: 정상 동작
- 운영실 기능은 현재 안정 상태

- 관련 문서:
  - [D:\MYDOC\Desktop\vscode\Web\firebase\ncore_web\ncore-main\운영실_최종점검_결과_2026-03-26.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/운영실_최종점검_결과_2026-03-26.md)

## 2026-03-26 07:46 추가 반영 - 권한/설정 팀 필터

- `권한/설정 > 권한 탭`에 `전부 / 매뉴얼팀 / 파츠북팀` 필터 버튼 추가
- 열 그룹 토글은 유지한 채, 사용자 행만 팀별로 필터링
- 보기용 필터이며 저장 구조는 기존 유지
- 검증 결과
  - 매뉴얼팀: 17명
  - 파츠북팀: 18명

- 관련 문서:
  - [D:\MYDOC\Desktop\vscode\Web\firebase\ncore_web\ncore-main\권한설정_팀필터_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/권한설정_팀필터_계획.md)
  - [D:\MYDOC\Desktop\vscode\Web\firebase\ncore_web\ncore-main\권한설정_팀필터_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/권한설정_팀필터_결과.md)
## 2026-03-26 08:02 운영실 UI 1열 고정

- 운영실 본문에서 반응형 2열 전환 제거
- 브라우저 크기와 관계없이 항상 세로 1열 구조 유지
- 사용자가 선호한 `브라우저 절반폭` 상태 UI를 기준형으로 고정

- 관련 문서:
  - [D:\MYDOC\Desktop\vscode\Web\firebase\ncore_web\ncore-main\운영실_UI_1열고정_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/운영실_UI_1열고정_계획.md)
  - [D:\MYDOC\Desktop\vscode\Web\firebase\ncore_web\ncore-main\운영실_UI_1열고정_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/운영실_UI_1열고정_결과.md)
## 2026-03-26 08:24 모바일 앱 전환 방향 정리

- 최종 목표는 `아이폰 App Store 등록`
- 현재 Mac이 없으므로 iOS 빌드/제출은 바로 진행하지 않음
- 현실적 전략은 `Capacitor 기반 안드로이드 앱 선행 개발`
- 안드로이드에서 모바일 이슈를 먼저 잡고, 이후 Mac 확보 시 iOS로 확장

- 관련 문서:
  - [D:\MYDOC\Desktop\vscode\Web\firebase\ncore_web\ncore-main\안드로이드앱_선행개발_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/안드로이드앱_선행개발_계획.md)
## 2026-03-26 09:03 읽기 사용량 절감 조치

- 읽기 사용량 원인 분석 정리 완료
- 테스트용 `accessLogs` 전체 삭제
  - 삭제 전 `2444건`
  - 삭제 후 `0건`
- 운영실 최근 로그 서버 로드량 `150 -> 20` 축소
- 운영 서버 검증 결과 현재 최근 로그 로드 수 `1건`

- 관련 문서:
  - [D:\MYDOC\Desktop\vscode\Web\firebase\ncore_web\ncore-main\읽기사용량_절감_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/읽기사용량_절감_계획.md)
  - [D:\MYDOC\Desktop\vscode\Web\firebase\ncore_web\ncore-main\읽기사용량_절감_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/읽기사용량_절감_결과.md)

- 추가 판단:
  - 현재 읽기 폭증은 실사용보다 `백업/비교/검증/CSV` 영향이 더 큼
  - 실사용 전환 후 지금 같은 급격한 스파이크는 줄 가능성이 높음
  - 장기적으로는 `loadData` 전체 로드 구조 최적화가 다음 과제
## 2026-03-26 09:22 작업 원칙 추가

- 앞으로 수정 작업은 `로컬 확인 후 운영 웹 반영`을 기본 원칙으로 함
- 즉:
  - 로컬에서 먼저 확인
  - 문제 없을 때만 deploy

- 관련 문서:
  - [D:\MYDOC\Desktop\vscode\Web\firebase\ncore_web\ncore-main\작업원칙_로컬확인후웹반영.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/작업원칙_로컬확인후웹반영.md)

## 2026-03-26 09:36 모바일 상단바 실험 원복

- 모바일 상단바 1차 정렬 개선 실험은 로컬 확인 결과 만족스럽지 않아 원상 복구
- 운영 웹도 원래 상태로 복구 완료
- 이후 같은 주제는 `로컬에서 완성 -> 확인 -> 운영 반영` 원칙으로 재진행

- 관련 문서:
  - [D:\MYDOC\Desktop\vscode\Web\firebase\ncore_web\ncore-main\모바일상단바_정렬개선_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/모바일상단바_정렬개선_계획.md)
## 2026-03-26 09:37 작업 원칙 재변경

- `로컬 확인 후 운영 반영` 원칙은 다시 되돌림
- 현재 기준 작업 원칙은 다시 `수정 후 바로 운영 웹 반영`
- 로컬 확인은 선택사항으로만 사용

- 관련 문서:
  - [D:\MYDOC\Desktop\vscode\Web\firebase\ncore_web\ncore-main\작업원칙_즉시웹반영.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/manuals/작업원칙_즉시웹반영.md)

## 2026-03-26 09:47 모바일 상단 드롭다운 / 달력 접기 반영

- 모바일 상단 관리자 버튼 묶음을 드롭다운 메뉴로 변경
- 모바일 월간 달력을 팀원 연차 현황 카드처럼 접기/펼치기 구조로 변경
- PC 화면은 유지
- `hosting` 운영 반영 완료

- 관련 문서:
  - [D:\MYDOC\Desktop\vscode\Web\firebase\ncore_web\ncore-main\모바일_상단드롭다운_달력접기_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/모바일_상단드롭다운_달력접기_계획.md)
  - [D:\MYDOC\Desktop\vscode\Web\firebase\ncore_web\ncore-main\모바일_상단드롭다운_달력접기_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/모바일_상단드롭다운_달력접기_결과.md)

## 2026-03-26 09:53 모바일 프로필 클릭형 메뉴 보정

- 모바일 상단의 별도 `관리 메뉴` 셀렉트 박스를 제거
- 이름/직급 영역을 눌렀을 때 메뉴가 펼쳐지는 방식으로 변경
- 상단바 균형 개선 목적
- 운영 웹 반영 완료

## 2026-03-26 09:59 모바일 상단 미세 조정

- 프로필 아래 `관리 메뉴` 문구 제거
- 우측 화살표 아이콘만 남기도록 정리
- `내 연차 현황` 제목이 줄바꿈되지 않도록 모바일 글자 크기 축소 및 한 줄 고정
- 운영 웹 반영 완료

## 2026-03-26 10:12 모바일 달력 상세보기 / 최근 신청 접기

- 모바일 달력 날짜 터치 시 상세내역 하단 시트가 열리도록 변경
- 모바일 달력 칸은 `N건` 요약 표시로 단순화
- 모바일 최근 신청 내역은 접기/펼치기 카드로 변경
- PC 화면은 유지
- 운영 웹 반영 완료

- 관련 문서:
  - [D:\MYDOC\Desktop\vscode\Web\firebase\ncore_web\ncore-main\모바일_달력상세_최근신청접기_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/모바일_달력상세_최근신청접기_계획.md)
  - [D:\MYDOC\Desktop\vscode\Web\firebase\ncore_web\ncore-main\모바일_달력상세_최근신청접기_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/모바일_달력상세_최근신청접기_결과.md)

## 2026-03-26 10:23 모바일 달력 상세보기 오류 수정

- 건수가 있는 날짜를 눌렀을 때 상세 시트가 비정상 동작하던 문제 수정
- 날짜 상세 시트용 상태 텍스트/상태 색상 도구 추가
- 모바일 `내 연차 현황` 남은 시간 줄을 한 줄 고정으로 보정
- 운영 웹 반영 완료

## 2026-03-26 10:29 모바일 상단 메뉴 팝오버 보정

- 모바일 상단 우측 버튼을 눌렀을 때 상단바 자체가 늘어나지 않도록 구조 변경
- 기능 목록만 별도 팝오버 카드로 표시
- 모바일 상단바 높이는 다시 고정
- 운영 웹 반영 완료

## 2026-03-26 10:37 모바일 날짜 상세 시트 스크롤 보정

- 모바일 날짜 상세내역 시트 오픈 시 배경 화면 스크롤 잠금
- 시트 내부 `overscroll-contain` 적용으로 배경과 겹치던 문제 보정
- 운영 웹 반영 완료

## 2026-03-26 10:40 모바일 날짜 상세 시트 구조 보정

- 날짜 상세내역 UI를 자동 높이 카드에서 고정 높이 bottom sheet로 변경
- 짧은 내용에서도 하단 배경/푸터와 겹쳐 보이지 않도록 구조 안정화
- 운영 웹 반영 완료

## 2026-03-26 11:00 권한 탭 세부설정 분리 / 모바일 권한 추가

- 권한 탭 그룹에 `세부설정` 추가
- 기존 `권한/설정 접근`, `구성원 관리`를 세부설정 그룹으로 이동
- `권한/설정 접근(모바일)`, `구성원 관리(모바일)` 추가
- PC/모바일 접근 판단을 분리
- `functions + hosting` 운영 반영 완료

- 관련 문서:
  - [D:\MYDOC\Desktop\vscode\Web\firebase\ncore_web\ncore-main\권한설정_세부설정분리_모바일권한추가_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/권한설정_세부설정분리_모바일권한추가_계획.md)
  - [D:\MYDOC\Desktop\vscode\Web\firebase\ncore_web\ncore-main\권한설정_세부설정분리_모바일권한추가_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/권한설정_세부설정분리_모바일권한추가_결과.md)
## 2026-03-26 11:11 권한표 세부설정 헤더 정리

- 권한표 `세부설정` 그룹에서 옛 고정 컬럼 `권한/설정 접근`, `구성원 관리` 제거
- `세부설정`을 펼쳤을 때만 4개 컬럼이 보이도록 헤더/본문 구조 일치
- 마스터 행은 세부설정 4칸 모두 체크 상태로 표시되도록 프런트 권한 해석 보강
- `PC` 2칸 / `모바일` 2칸 사이 구분선을 강화해 가독성 보강
- `functions + hosting` 운영 반영 완료

## 2026-03-26 11:24 세부설정 완료 확인

- 사용자 확인 기준으로 세부설정 표 구조 정리 작업 마감
## 2026-03-26 11:30 팀원 연차현황 특별휴가 배치 보정

- 특별휴가 요약 배지를 카드 상단 오른쪽에서 제거
- 남은 연차 게이지 하단 보조줄로 이동시켜 카드 상단 높이를 통일
- 팀원 연차현황 카드 격자 정렬 보정
- hosting 운영 반영 완료

## 2026-03-26 11:39 팀원 연차현황 배치 보정 완료 확인

- 사용자 확인 기준으로 특별휴가 배치 보정 작업 마감

## 2026-03-26 12:02 운영실 권한 분리

- `세부설정`에 `운영실 접근(PC/모바일)` 추가
- `구성원 관리` 권한과 `운영실 접근` 권한 분리
- 구성원 관리 권한만으로는 운영실이 열리지 않도록 수정
- 운영실 직접 진입 시 데이터 로드를 먼저 수행하도록 보정
- 운영실 권한 사용자도 수동 휴일/최근 로그를 마스터와 같은 구조로 보게 수정

## 2026-03-26 12:12 세부설정 열 폭 압축

- 세부설정 6칸의 폭과 헤더 여백을 줄여 한 화면 적합성을 개선

## 2026-03-26 12:27 전체 상황판 권한 추가

- 권한표에 `전체 상황판` 그룹 추가
- `전체 상황판 접근(PC/모바일)` 권한 도입
- 상단 `전체 상황판` 버튼을 새 권한 기준으로 노출/진입 판정하도록 변경

## 2026-03-26 12:51 대표 전체 상황판 권한 강제 규칙 제거

- 대표 계정의 전체 상황판 권한을 더 이상 기본값으로 강제하지 않음
- 체크박스 저장값이 그대로 유지되도록 수정
## 2026-03-26 15:02 추가 - 운영 매뉴얼 세트 작성

- 역할별 매뉴얼 초안 작성 완료
  - [매뉴얼_작성_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/manuals/매뉴얼_작성_계획.md)
  - [사용자_매뉴얼.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/manuals/사용자_매뉴얼.md)
  - [승인권자_대표_매뉴얼.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/manuals/승인권자_대표_매뉴얼.md)
  - [운영자_매뉴얼.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/manuals/운영자_매뉴얼.md)
  - [빠른시작_체크리스트.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/manuals/빠른시작_체크리스트.md)
- 방향:
  - 개발 문서가 아니라 역할별 사용 문서로 분리
  - 일반 직원 / 승인권자·대표 / 운영자 기준으로 나눠 전달
  - 시연, 인수인계, 신규 사용자 교육에 바로 사용할 수 있는 수준으로 정리
## 2026-03-26 15:15 추가 - 보안 개선 계획 정리

- 로컬 코드 기준 보안 점검 결과를 바탕으로 우선순위형 개선 계획 정리
- 새 문서:
  - [보안_개선_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/보안_개선_계획.md)
- 즉시 보강 우선순위:
  1. 비밀번호 해시 전환
  2. 비밀번호 변경 재인증
  3. 로그인 시도 제한
  4. 승인권한과 관리자 수정권한 분리
- 후속 구조 개선:
  - `load_data` 응답 최소화
  - 운영실/로그 데이터 접근 축소
  - 세션 정책 강화

## 2026-03-27 07:46 추가 - 비밀번호 해시 전환 1단계 완료

- 평문 비밀번호 저장 중단
- `scrypt` 해시 기반 인증 로직 반영
- 전 계정 초기 비밀번호를 테스트 기간 정책에 따라 `0`으로 일괄 초기화
- 검증:
  - 전체 사용자 36명 해시 전환 완료
  - 평문 password 값 남은 사용자 0명
  - `Web관리자(id=0)` 계정 `0` 로그인 성공 확인
- 관련 문서:
  - [보안_개선_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/보안_개선_계획.md)
  - [비밀번호_해시전환_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/비밀번호_해시전환_결과.md)

## 2026-03-27 08:01 추가 - 비밀번호 변경 재인증 2단계 완료

- 비밀번호 변경창에 `현재 비밀번호`, `변경할 비밀번호`, `변경할 비밀번호 재확인` 3칸 구조 적용
- 서버에서 현재 비밀번호 검증 후에만 변경 가능하도록 수정
- 검증:
  - 현재 비밀번호 오류 시 차단 확인
  - 현재 비밀번호 일치 시 변경 성공 확인
  - 테스트 후 전체 계정 다시 초기 비밀번호 `0`으로 복구 완료
- 관련 문서:
  - [보안_개선_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/보안_개선_계획.md)
  - [비밀번호_변경_재인증_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/비밀번호_변경_재인증_결과.md)

## 2026-03-27 08:18 추가 - 로그인 시도 제한 3단계 완료

- 로그인 실패 5회 시 5분 차단 로직 반영
- 기준은 `같은 아이디 + 같은 IP`
- 성공 로그인 시 실패 기록 삭제되도록 반영
- 로그인 실패 시 `(n/5)` 카운트 안내 추가
- 차단 시 `약 5분 후 다시 시도` 문구로 안내
- 검증:
  - 6번째 로그인 시 `LOGIN_BLOCKED`와 `retryAfterSec: 300` 확인
  - 성공 로그인 후 실패 기록 삭제 확인
- 관련 문서:
  - [보안_개선_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/보안_개선_계획.md)
  - [로그인시도제한_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/로그인시도제한_결과.md)

## 2026-03-27 08:32 추가 - 승인권한 / 운영실권한 분리

- 승인권한(`approveScope`)만으로 타인 대상 관리자 수정 권한이 열리지 않도록 서버 정책 수정
- `canManageTargetUserForActor`에서 승인 범위 해석 제거
- 원칙:
  - 승인권자 = 승인/반려
  - 운영실 권한자 = 대리 등록/수정/삭제
  - 마스터 = 전권 유지
- 관련 문서:
  - [보안_개선_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/보안_개선_계획.md)
  - [승인권한_운영실권한_분리_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/승인권한_운영실권한_분리_결과.md)

## 2026-03-27 08:48 추가 - load_data 응답 최소화 1차 적용

- `load_data` 응답을 역할별로 축소 시작
- 원칙:
  - 마스터는 전체 데이터 유지
  - 일반 직원은 자기 요청 + 최소 사용자 목록 + 필요한 mailRoute만 수신
- 검증:
  - `Web관리자(id=0)`는 users 37건 유지
  - `테스트1(id=1)`는 users 4건, requests 2건으로 축소 확인
- 관련 문서:
  - [보안_개선_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/보안_개선_계획.md)
  - [load_data_응답최소화_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/load_data_응답최소화_결과.md)

- 2026-03-27 10:02 - 달력 권한만 받은 사용자가 특정 팀 달력 탭에서 빈 화면을 보던 문제를 수정. `load_data` 팀 범위 계산에 `calendarManual`, `calendarParts`, `calendarAll`을 포함해 실제 팀 일정까지 함께 내려오게 함.

- 2026-03-27 10:18 - 달력 월 제목 라벨을 `viewer.dept` 고정값이 아니라 현재 달력 탭(`개인/매뉴얼팀/파츠북팀/모두`) 기준으로 표시하도록 보정함.

- 2026-03-27 10:42 - `load_data` 2차 축소 적용. `userSpecialLeaves`는 팀원 연차현황에 필요한 범위까지만, `mailRoutes`는 자기 신청/승인에 필요한 경로까지만 내려오도록 역할별 범위를 추가 축소함.

- 2026-03-27 11:03 - `load_data` 3차 시작. 게시판 글을 기본 `rest` 응답에서 분리하고, 게시판 화면에 들어갈 때만 `board` 전용 scope로 별도 로드하도록 변경함.

- 2026-03-27 10:51 - `load_data` 3차 2번째 조각으로 전체 상황판 데이터를 분리. 기본 `rest` 응답과 `situation` 전용 응답이 실제로 분리되고, `전체 상황판` 버튼 진입 시 정상 표시까지 확인함.

- 2026-03-27 11:08 - 다음 보안 고도화 후보를 `세션 강화`와 `보안 로그 체계화`로 정리. 별도 계획 문서 작성 완료.
  - [세션강화_보안로그체계화_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/세션강화_보안로그체계화_계획.md)

- 2026-03-30 07:33 - 보안 로그 체계화 1차 완료.
  - `securityLogs` 별도 컬렉션 도입
  - 로그인 실패/차단, 비밀번호 변경 실패/성공, 사용자 권한성 수정, 운영실 CSV 다운로드, 수동 휴일 저장/삭제를 보안 사건으로 분리 기록
  - 운영 API 호출 후 Firestore `securityLogs` 기록 생성 확인 완료
  - [보안로그_체계화_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/보안로그_체계화_결과.md)

- 2026-03-30 07:43 - 보안 로그 체계화 2차 완료.
  - 운영실에 `최근 보안 로그` 카드 추가
  - `securityLogs` 전체 CSV 다운로드 버튼 추가
  - 운영 API 응답에서 `securityLogs: 20` 확인
  - `download_security_logs_csv` 응답 `rowCount: 24` 및 CSV 헤더 정상 확인
  - Playwright로 운영실 카드 노출 실제 확인

- 2026-03-30 14:18 - 잔업/특근 기능 1차 구축 완료.
  - `권한/설정 > 설정 테이블`에 `잔업 신청 기능`, `특근 신청 기능` 토글 추가
  - 메인 대시보드에 `잔업 신청`, `특근 신청` 버튼 노출 구조 추가
  - `특별휴가 종류` 영역 기본 닫힘 + `펼치기/닫기` 추가
  - `requests` 구조 안에서 `잔업`, `특근`, `reported` 상태, 보고 전용 필드(`reportCategory`, `workDetail`, `requestDept`, `note`, `requestedStartAt`, `requestedEndAt`, `reportedHours`) 지원
  - 월별 `잔업/특근 현황` 모달 및 상세 보기 모달 추가
  - 잔업/특근은 연차 차감, 승인 대기, 전체 상황판 부재 계산, 달력 부재 표시에서 제외
  - 운영판 배포 후 Playwright로 토글/접기/현황 모달 확인, 실제 `reported` 저장 후 즉시 삭제 검증 완료
  - 관련 문서:
    - [잔업특근_기능구축_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/잔업특근_기능구축_계획.md)
    - [잔업특근_기능구축_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/잔업특근_기능구축_결과.md)

- 2026-03-31 07:16 - 동일일자 `시간차(외출)` + `시간차(퇴근)` 중복 사례 추가 확인.
  - 현 판단:
    - 같은 날짜 `외출 + 조퇴`를 무조건 금지하지는 않음
    - 대신 `시간 겹침 금지`, `조퇴 1건만 허용` 방향 추천
  - 별도 개선 계획 문서 작성:
    - [시간차_외출조퇴_동일일자중복_개선계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/시간차_외출조퇴_동일일자중복_개선계획.md)

- 2026-03-31 07:29 - 동일일자 `시간차(외출/퇴근)` 중복 보완 완료.
  - 같은 날짜 `시간차(퇴근)` 1건 제한 추가
  - 같은 날짜 `시간차(외출)` / `시간차(퇴근)` 시간 겹침 차단 추가
  - 같은 날짜 `시간차(외출)`끼리 시간 겹침 차단 추가
  - 프런트 저장 전 검사 + 서버 저장 전 최종 검사 동시 적용
  - 관리자 대리 등록/수정도 같은 규칙 적용
  - 관련 문서:
    - [시간차_외출조퇴_동일일자중복_개선계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/시간차_외출조퇴_동일일자중복_개선계획.md)
    - [시간차_외출조퇴_동일일자중복_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/시간차_외출조퇴_동일일자중복_결과.md)

- 2026-03-31 14:56 - 자동 백업 실패 보완 완료.
  - 원인: `backup-firestore.cmd` 상대 경로 실행 + 작업 스케줄러 실행 기준 폴더 불일치
  - 조치:
    - [scripts/backup-firestore.cmd](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/scripts/backup-firestore.cmd)에서 프로젝트 루트로 먼저 이동하도록 수정
    - [scripts/register-backup-task.ps1](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/scripts/register-backup-task.ps1)도 같은 기준으로 보강
  - 검증:
    - 수동 실행 성공
    - `schtasks /Run /TN "NCORE_Firestore_Backup_Daily"` 강제 실행 성공
    - 스케줄러 재조회 결과 `Last Result: 0`
    - [backups/backup-history.json](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/backups/backup-history.json) 최신 성공 기록 확인
  - 관련 문서:
    - [백업_자동화_실패보완_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/백업_자동화_실패보완_계획.md)
    - [백업_자동화_실패보완_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/백업_자동화_실패보완_결과.md)

- 2026-03-31 15:27 - 달력정보 권한에 `반려`, `잔업/특근` 추가 완료.
  - `권한/설정 > 권한 탭 > 달력정보`에 `반려`, `잔업/특근` 체크박스 추가
  - 달력 상단 탭도 권한 기반으로 노출되도록 연결
  - `반려` 탭은 승인권한이 아니라 `달력정보 > 반려` 권한으로 제어
  - `잔업/특근` 탭은 `reported` 상태의 잔업/특근 기록만 전용으로 표시
  - 마스터는 신규 권한 2개도 자동 전체 허용 유지
  - 관련 문서:
    - [달력정보_반려_잔업특근권한_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/달력정보_반려_잔업특근권한_결과.md)

- 2026-04-01 - 잔업/특근 현황 모달 통합 및 정산월 기준 반영 완료.
  - `월별 잔업/특근 현황`을 잔업/특근 분리 표시에서 하나의 통합 테이블로 변경
  - 기준 기간을 일반 월이 아니라 `정산월(16일 ~ 다음달 15일)`로 변경
  - 상단 total 요약 추가:
    - `총 잔업시간`
    - `총 특근일수`
  - 제목과 보조 문구에 실제 집계 범위 표시
  - 관련 문서:
    - [잔업특근_통합현황_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/잔업특근_통합현황_계획.md)
    - [잔업특근_통합현황_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/잔업특근_통합현황_결과.md)

- 2026-04-01 - 잔업/특근 신청 버튼 및 신청창 통합 개선 완료.
  - 메인 화면 `잔업 신청`, `특근 신청` 버튼을 `잔업/특근신청` 1개로 통합
  - `보고 추가`는 더 이상 `연차 신청` 모달을 쓰지 않고 전용 `잔업/특근 신청` 모달을 사용
  - `연차 신청` 종류 목록에서 `잔업 보고`, `특근 보고` 제거
  - 잔업/특근 저장 구조는 기존 `requests` + `reported` 흐름 재사용
  - 관련 문서:
    - [잔업특근_신청창_통합개선_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/잔업특근_신청창_통합개선_계획.md)
    - [잔업특근_신청창_통합개선_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/잔업특근_신청창_통합개선_결과.md)

- 2026-04-01 - 잔업/특근 현황 역할 분리 방향 계획 업데이트.
  - 기존 통합 현황 계획을 수정해 `개인용 현황`과 `관리자용 현황`으로 분리하는 방향을 반영
  - 일반 직원은 본인 기록만 열람
  - 관리자는 직원별 `총 잔업시간 / 총 특근일수` 집계표를 먼저 보고, 상세 클릭 시 날짜별 내역 확인
  - 관련 문서:
    - [잔업특근_통합현황_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/잔업특근_통합현황_계획.md)

- 2026-04-01 - 잔업/특근 현황 개인용/관리자용 분리 완료.
  - 일반 직원은 본인 기록만 보도록 개인용 현황으로 분리
  - 관리자/운영자/대표/마스터는 직원별 `총 잔업시간 / 총 특근일수` 집계표를 먼저 보도록 변경
  - 관리자 `상세` 클릭 시 해당 직원의 정산월 날짜별 상세내역 모달 오픈
  - 관련 문서:
    - [잔업특근_통합현황_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/잔업특근_통합현황_계획.md)
    - [잔업특근_역할별현황_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/잔업특근_역할별현황_결과.md)

- 2026-04-01 - 달력정보 권한표 UI 가독성 개선 완료.
  - `달력정보` 6개 항목을 가로 1줄 배치에서 `2줄 3칸` 구조로 재배치
  - 스크롤 없이 한눈에 체크 상태를 확인할 수 있도록 개선
  - 상단 헤더 라벨 박스 제거
  - 직원 행에 옅은 명암을 추가해 행 구분 보강
  - 저장 구조와 체크박스 id는 그대로 유지
  - 관련 문서:
    - [달력정보_UI_가독성개선_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/달력정보_UI_가독성개선_계획.md)
    - [달력정보_UI_가독성개선_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/달력정보_UI_가독성개선_결과.md)

- 2026-04-01 - 전체상황판 월간 요약 배지 2열 개선 완료.
  - 날짜칸 안 요약 배지를 세로 1열에서 2열 grid로 변경
  - 항목이 많은 날짜(예: 4/1)도 잘림이 덜하도록 조정
  - 관련 문서:
    - [전체상황판_요약배지_2열개선_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/전체상황판_요약배지_2열개선_계획.md)
    - [전체상황판_요약배지_2열개선_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/전체상황판_요약배지_2열개선_결과.md)

- 2026-04-01 - 전체상황판 장기부재 강조 톤다운 완료.
  - 상단 `장기부재 / 이번주 복귀` 버튼은 0건일 때 회색 보조칩으로 변경
  - 오른쪽 상세 패널의 `장기부재 0` 요약칩도 회색 보조톤으로 변경
  - 장기부재나 복귀 예정이 실제로 있을 때만 기존 초록 강조 유지
  - 관련 문서:
    - [전체상황판_장기부재톤다운_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/전체상황판_장기부재톤다운_결과.md)
- 2026-04-01 10:49: 전체 상황판 자리 배치도 오른쪽 `당일 부재 인원` 목록이 동일 직원의 복수 시간차를 1건으로 덮어쓰던 문제 보완. 좌석 색상은 대표 상태 1건 유지, 오른쪽 목록은 직원 카드 안에 복수 부재 기록을 함께 표시하도록 수정.
- 2026-04-01 11:05: 전체 상황판 자리 배치도 모달의 오른쪽 `당일 부재 인원` 패널 폭과 높이 사용성 개선. 고정 폭 320px -> 380px, 패널을 본문 높이에 맞춰 확장하고 내부 스크롤 영역을 flex 구조로 재조정.
- 2026-04-01 11:18: 전체 상황판 자리 배치도 모달에서 `당일 부재 인원` 패널 확장 후 스크롤이 사라지며 전체 레이아웃이 틀어지던 문제 보완. 오른쪽 패널을 고정 높이(78vh) 내 스크롤 구조로 되돌리고, grid 정렬을 items-start로 조정해 왼쪽 자리 배치도가 영향을 받지 않도록 수정.
- 2026-04-01 11:42: 전체 상황판 자리 배치도 오버레이에 `입구` 표식과 `미닫이문` 기호 추가. 원본 평면도 이미지는 건드리지 않고 안내 표식을 덧붙이는 방식으로 구현.
- 2026-04-01 11:45: 자리 배치도 오버레이 표식 재조정. `입구`를 더 아래쪽으로 이동(A 위치 반영), 우측 `미닫이문` 기호 제거 후 `대표님실` 텍스트 라벨만 유지.
- 2026-04-01 11:52: 전체 상황판 자리 배치도 모달 정렬 조정. 오른쪽 `당일 부재 인원` 패널 높이를 왼쪽 자리 배치도 실측 높이에 맞춰 동기화하고, `입구` 화살표 제거/중앙 재배치, `대표님실` 라벨을 우측 하단 사각영역 중앙으로 이동.
- 2026-04-01 11:56: 자리 배치도 오버레이 표식 위치 재조정. `입구`는 위/아래 구역 사이 통로 중심 쪽으로 상향 이동, `대표님실`은 우측 하단 사각영역 상단 중앙으로 이동.
- 2026-04-01 12:20: 로그인 전 화면 전용 `login-screen-active` 레이아웃 추가. footer를 브라우저 하단 고정형으로 표시하고 로그인 카드 래퍼 높이를 줄여 하단 문구가 첫 화면에서 보이도록 수정. 로그인 후 화면은 변경하지 않음.
- 2026-04-01: 잔업/특근 운영 기준 문서 보완. `건별 기록 + 정산일(매월 16일, 휴일이면 차주 월요일) 일괄 제출`을 기본 원칙으로 유지하되, 정산 메일은 `날짜별 행`을 유지하고 `업무내용 / 요청 부서 / 비고`가 날짜마다 달라질 수 있음을 반영. 관련 문서: [잔업특근_정산보고_운영방식_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/잔업특근_정산보고_운영방식_계획.md)
- 2026-04-01 12:57: 잔업/특근 정산보고 1차 구현 완료. 개인용 현황판에 `메일 초안`, `제출 완료` 기능 추가, 관리자 집계표에 `제출 상태` 컬럼 추가, 서버에 `submit_work_report_settlement` 액션 및 제출 메타데이터 저장 반영. 관련 문서: [잔업특근_정산보고_구현_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/잔업특근_정산보고_구현_결과.md)
- 2026-04-06: 잔업/특근 주52시간 2차(v119) 반영. 운영실 대리등록(`req-modal`)에도 주간 잔여 가능시간 안내/저장 차단을 추가했고, 서버 `upsert_request`에 최종 주52시간 검증을 붙여 프런트 우회 저장도 차단하도록 보강. 관련 문서: [잔업특근_주52시간_2차_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/잔업특근_주52시간_2차_계획.md), [잔업특근_주52시간_v119_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/잔업특근_주52시간_v119_결과.md)
- 2026-04-06: 운영실 `관리자 대리 등록`의 종류 드롭다운에 `잔업`, `특근` 옵션 복구. 저장 로직은 기존 분기를 그대로 사용하고, 대리등록 UI에서 누락된 항목만 다시 연결. 관련 문서: [운영실_대리등록_잔업특근옵션복구_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/운영실_대리등록_잔업특근옵션복구_결과.md)
- 2026-04-06: 특별휴가 기본 8종 복구 및 빈배열 저장 방지(v120) 반영. 접힌 상태 저장 시 기존 `appData.specialLeaveTypes`를 유지하도록 프런트 보강, 서버 `saveSpecialLeaveTypes`는 빈 배열 저장을 차단, 엑셀 `SpecialLeaveTypes` 기준 기본 8종을 Firestore에 복구. 관련 문서: [특별휴가_복구_빈배열저장방지_v120_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/특별휴가_복구_빈배열저장방지_v120_결과.md)
- 2026-04-06: 사용자 ID 변경 후 과거 요청이 새 ID와 연결되지 않아 연차 차감이 누락되는 구조 분석 완료. 임시 대응 방향은 `id 우선 + userName exact match fallback` 읽기/계산 보조 연결이며, 동명이인 문제는 별도 과제로 분리. 관련 문서: [사용자ID변경_이름기준요청연결_개선계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/사용자ID변경_이름기준요청연결_개선계획.md)
- 2026-04-06: 근본 방향 재정의. 사람 연결의 내부 기준키를 `employeeNo` 로 전환하는 장기 계획 수립. `id/loginId` 는 로그인용, `name` 은 표시용으로 유지하고, 읽기/계산은 단계적으로 `employeeNo 우선`으로 옮기는 방향 확정. 관련 문서: [employeeNo_기준키_전환_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/employeeNo_기준키_전환_계획.md)
- 2026-04-06: `employeeNo` 기준키 전환 1차(v121) 반영. 프런트/서버에 `employeeNo` 필수 및 중복 검증 추가, 요청-사용자 연결 공통 함수는 `employeeNo 우선 + legacy userId fallback` 규칙으로 보강, 신규 요청 저장 payload 에 `employeeNo` 추가. 관련 문서: [employeeNo_기준키_v121_1차_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/employeeNo_기준키_v121_1차_결과.md)
- 2026-04-06: `최은지` 잔여 연차 카드가 그대로 남는 재발 확인 후 v121 보완. `recalcUsedHours()` 와 요청 소유 판별에 `employeeNo 우선 -> legacy userId -> unique userName` 순서의 임시 legacy 연결을 추가해, 과거 요청 `userId=최은지` 같은 데이터도 현재 사용자 카드에 다시 합산되도록 보강. 관련 문서: [employeeNo_기준키_v121_1차_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/employeeNo_기준키_v121_1차_결과.md)
- 2026-04-06: JS 분할 사전 분석 및 백업 완료. `ui_logic_new_design_v121_codex.js`(7506줄)의 구조를 기능군별로 분석했고, 분할 전 필수 백업을 [backups/2026-04-06_js-split-prep_v121](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/backups/2026-04-06_js-split-prep_v121)에 보관. 분할은 `app shell -> situation -> workreport -> permissions/user -> calendar/dashboard` 순으로 진행하는 계획 수립. 관련 문서: [JS_분할_v122_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/JS_분할_v122_계획.md)
- 2026-04-06: JS 분할 `v122 0단계` 실행. `ui_app_shell_v122_codex.js`, `ui_bootstrap_v122_codex.js` 추가, `ui_logic_new_design_v122_codex.js`는 `Object.assign(app, { ... })` 구조로 전환, `index.html`은 `v122` 로딩 순서로 교체. 이번 단계는 기능 분리 없이 shell/bootstrap 구조만 분리하는 단계. 관련 문서: [JS_분할_v122_0단계_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/JS_분할_v122_0단계_결과.md)
- 2026-04-06: JS 분할 `0.5단계` 완료. 실제 함수 목록을 기준으로 `shell/shared/feature` 분류표를 확정했고, 1차 실제 분리 대상은 `상황판` 메서드군으로 결정. 관련 문서: [JS_분할_v122_0.5단계_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/JS_분할_v122_0.5단계_결과.md)
- 2026-04-06: JS 분할 `1단계` 완료. 상황판 전용 메서드군을 [ui_situation_v122_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_situation_v122_codex.js) 로 분리하고, `index.html` 로딩 순서에 새 파일 추가. 이번 단계는 상황판만 분리하고 shared/calendar 경계 함수는 유지. 관련 문서: [JS_분할_v122_1단계_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/JS_분할_v122_1단계_결과.md)
- 2026-04-06: JS 분할 `2단계` 완료. 잔업/특근 전용 메서드군을 [ui_workreport_v122_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_workreport_v122_codex.js) 로 분리하고, `index.html` 로딩 순서에 새 파일 추가. 공용 `reason modal`, `tooltip`, `중복충돌 처리` 함수는 shared 로 유지. 관련 문서: [JS_분할_v122_2단계_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/JS_분할_v122_2단계_결과.md)
- 2026-04-06: JS 분할 `3단계` 완료. `권한/설정`은 [ui_permissions_v122_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_permissions_v122_codex.js), `구성원 관리`는 [ui_user_management_v122_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_user_management_v122_codex.js) 로 분리. 공용 `request modal` 계열 함수는 shared 로 유지. 관련 문서: [JS_분할_v122_3단계_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/JS_분할_v122_3단계_결과.md)
- 2026-04-06: JS 분할 `4단계` 완료. `달력`은 [ui_calendar_v122_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_calendar_v122_codex.js), `대시보드`는 [ui_dashboard_v122_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_dashboard_v122_codex.js) 로 분리. 공용 `request modal`, `submitRequest`, `processReq`, `approveAll` 계열은 shared 로 유지. 관련 문서: [JS_분할_v122_4단계_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/JS_분할_v122_4단계_결과.md)
- 2026-04-06: JS 분할 `실사용 검증` 완료. `playwright-ui-smoke.js` 와 `real-simulation-test.js` 를 현재 UI 규칙에 맞게 보정했고, 자동 검증 결과 `스모크 10/10 통과`, `실사용 시뮬레이션 17/17 통과`를 확인. 관련 문서: [JS_분할_v122_실사용검증_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/JS_분할_v122_실사용검증_결과.md)
- 2026-04-06: JS 분할 `브라우저 직접 검증` 완료. 전용 [manual-v122-browser-check.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/scripts/manual-v122-browser-check.js) 로 `마스터 홈/달력`, `직원 잔업특근 신청`, `마스터 잔업특근 현황/상세`, `권한/설정`, `구성원 관리`, `전체 상황판/자리배치도`를 직접 조작해 `5/5 통과` 확인. 관련 문서: [JS_분할_v122_실사용검증_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/JS_분할_v122_실사용검증_결과.md)
- 2026-04-06: `공통 shared 정리` 후속 리팩터링 계획 작성. `v122` 분할 이후 [ui_logic_new_design_v122_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_logic_new_design_v122_codex.js) 에 남아 있는 공용 함수들을 `helpers -> modals -> request flow -> 남은 ui_logic 축소` 순으로 안전하게 옮기는 계획 수립. 관련 문서: [JS_공통shared_정리_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/JS_공통shared_정리_계획.md)
- 2026-04-06: `공통 shared 정리` 1차(v123) 실행. `v123` 기준선 파일을 생성하고 [ui_shared_helpers_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_shared_helpers_v123_codex.js) 를 추가해 포맷/특별휴가 메타/근무시간·주52시간/권한 판정/employeeNo 연결 helper를 분리. `index.html`은 `v123` 로딩 순서로 교체했고, 자동 검증(`10/10`, `17/17`)과 브라우저 직접 검증(`5/5`)을 다시 통과. 관련 문서: [JS_공통shared_v123_1차_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/JS_공통shared_v123_1차_결과.md)
- 2026-04-06: `공통 shared 정리` 2차(v123 modal) 실행. [ui_shared_modal_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_shared_modal_v123_codex.js) 를 추가해 `반려 사유`, `지난 날짜 상세사유`, 공용 reason modal 흐름을 분리. `index.html` 로딩 순서에 반영했고, 자동 검증(`10/10`, `17/17`)과 브라우저 직접 검증(`5/5`)을 다시 통과. 관련 문서: [JS_공통shared_v123_2차_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/JS_공통shared_v123_2차_결과.md)
- 2026-04-06: `공통 shared 정리` 3차(v123 request) 실행. [ui_shared_request_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_shared_request_v123_codex.js) 를 추가해 `openRequestModal`, `submitRequest`, `processReq`, `approveAll`, `editReq`, `deleteReq`, 충돌/상태 처리까지 공용 신청 흐름을 분리. `index.html` 로딩 순서에 반영했고, 자동 검증(`10/10`, `17/17`)과 브라우저 직접 검증(`5/5`)을 다시 통과. 관련 문서: [JS_공통shared_v123_3차_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/JS_공통shared_v123_3차_결과.md)
- 2026-04-06: `공통 shared 정리` 4차(v123 slim) 실행. [ui_shared_helpers_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_shared_helpers_v123_codex.js) 로 요청 소유/메일 수신/시간차 충돌/부재 상태/공용 로그 저장을 이동하고, [ui_shared_request_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_shared_request_v123_codex.js) 로 `togglePastDates()` 를 이동, [ui_permissions_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_permissions_v123_codex.js) 로 메일 설정 저장/권한 저장/운영실 일부 공용 메서드를 이동. `ui_logic_new_design_v123_codex.js` 는 `2544줄 -> 1813줄`로 감소했고, hosting 반영 후 자동 검증(`10/10`, `17/17`)과 브라우저 직접 검증(`5/5`)을 재통과. 관련 문서: [JS_공통shared_v123_4차_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/JS_공통shared_v123_4차_결과.md)
- 2026-04-06: 운영 데이터에 섞여 들어온 `DBG...` 디버그 사용자 6명 정리 완료. 삭제 전 점검 결과 연결 `requests`/`userSpecialLeaves`는 0건이라 사용자 문서만 삭제했고, 감사 추적용 `accessLogs`는 유지. Firestore 재확인 결과 남은 `DBG` 사용자/요청/특별휴가 부여 모두 0건, 브라우저 직접 확인 결과 운영실 드롭다운과 구성원 관리 목록에서도 `DBG` 항목이 사라짐. 관련 문서: [디버그사용자_삭제대상목록_2026-04-06.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/reference/디버그사용자_삭제대상목록_2026-04-06.md), [디버그사용자_삭제_결과_2026-04-06.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/디버그사용자_삭제_결과_2026-04-06.md)
- 2026-04-06: 달력 권한이 없는 탭은 흐리게 비활성 표시하지 않고 아예 숨기도록 v123 UI 보완. `app.getAllowedCalendarModes()` 에 포함된 탭만 렌더하도록 [ui_calendar_v123_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_calendar_v123_codex.js) 수정, hosting 반영 완료, 브라우저 확인 기준 권한 제한 계정은 `개인` 탭만 보이고 마스터는 전체 탭 유지 확인. 관련 문서: [달력권한탭_숨김_v123_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/달력권한탭_숨김_v123_결과.md)
- 2026-04-06: 구성원 관리 페이지 가로 확장(v123) 반영. 페이지 컨테이너를 `max-w-[1720px]`로 넓히고, 직원관리표는 `table-fixed + colgroup` 폭 재조정으로 한 화면에서 읽히게 보강. `overflow-x-auto`를 제거했고, Playwright 기준 `1366px` 폭에서 `hasHorizontalScroll = false` 확인. 관련 문서: [구성원관리_가로확장_v123_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/구성원관리_가로확장_v123_결과.md)
- 2026-04-07: 상단 내비 1안 개편(v124) 반영. 상단에는 `공지사항`, `전체 상황판`만 남기고, 관리성 화면은 `관리 메뉴` 드롭다운(`권한/설정`, `운영실`, `구성원 관리`)으로 묶음. 기존 `게시판` 라벨은 `공지사항`으로 변경. 관련 문서: [상단네비_드롭다운_v124_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/상단네비_드롭다운_v124_결과.md)
- 2026-04-07: 구성원 관리 표 정렬 기준을 `ID` 순에서 `이름` 순으로 변경(v125). 원본 데이터는 유지하고 화면 렌더 목록만 `name -> employeeNo -> id` 순으로 정렬. 관련 문서: [구성원관리_이름순정렬_v125_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/구성원관리_이름순정렬_v125_결과.md)
- 2026-04-07: `2026-03-16` 이후 테스트용 잔업/특근 데이터 삭제. 대상 태그는 `WORKREPORT_RANDOM7_SEED_2026-04-03`(21건), `WORKREPORT_EXTRA_OT_HEADCOUNT_2026-04-03`(3건)이며, 총 24건을 백업 후 삭제. 삭제 후 대상 태그/`createdForTesting` 잔여 건수 모두 0건 확인. 관련 문서: [테스트잔업특근_2026-03-16이후_삭제_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/테스트잔업특근_2026-03-16이후_삭제_결과.md)
- 2026-04-07: `잔업/특근 설정` 탭 저장 버튼 복구(v126). `workreport` 탭도 `settings`와 동일하게 `설정 저장` 버튼을 표시하도록 조건문 보강. 기존 저장 함수 `app.saveMasterSettings()`는 그대로 유지. 관련 문서: [잔업특근설정_저장버튼_v126_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/잔업특근설정_저장버튼_v126_결과.md)
- 2026-04-07: 공지사항/게시판 권한 체계 재설계 계획 수립. `featureBoard` 전역 스위치와 별도로 `permissions.boardRead`, `permissions.boardWrite`를 도입해, 버튼 노출/게시글 로드/글쓰기 권한을 같은 기준으로 통일하는 방향 정리. 관련 문서: [게시판권한_읽기쓰기_v127_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/게시판권한_읽기쓰기_v127_계획.md)
- 2026-04-07: 게시판 읽기/쓰기 권한 1차(v127) 반영. `permissions.boardRead`, `permissions.boardWrite` 추가, 권한 탭에 `게시판` 그룹(읽기/쓰기) 반영, 공지사항 버튼/글쓰기 노출은 새 권한 기준으로 통일, 서버 `loadService`와 `boardService`도 같은 권한 모델로 보강. 관련 문서: [게시판권한_읽기쓰기_v127_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/게시판권한_읽기쓰기_v127_결과.md)
- 2026-04-07: 운영실 `선택 날짜로 대리 등록` 버튼 무반응 복구. 원인은 `openAdminProxyRequestModal()` 함수 누락이었고, `ui_logic_new_design_v127_codex.js`에 복구 후 hosting 재배포 완료. 관련 문서: [운영실_선택날짜대리등록_버튼복구_v127_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/운영실_선택날짜대리등록_버튼복구_v127_결과.md)
- 2026-04-07: `권한/설정` 페이지 안정화 분석 시작. 현재 `ui_permissions_v127_codex.js`뿐 아니라, 복구 기준선으로 사용했던 `backups/2026-04-06_js-shared-phase4_v123/ui_permissions_v123_codex.js`도 이미 한글이 깨져 있는 상태임을 확인. 즉 최근 복구는 정상본 복원이 아니라 손상본 재적용이었음. 안전성 확보용 테스트 리스트와 분석 문서를 새로 작성. 관련 문서: [권한설정_안정화_테스트및분석_v127.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/권한설정_안정화_테스트및분석_v127.md)
- 2026-04-07: `권한/설정` 재구축 방향 확정. JS 분할 구조는 유지하고, `ui_permissions` 모듈만 `v128`에서 다시 세우는 계획 수립. 정상 한글 기준선은 `v114~v121` 모놀리식 소스에서 재추출하고, 이후 최신 변경(운영실 로그 지연 로드, 잔업/특근 저장 버튼, 게시판 읽기/쓰기 권한, 운영실 대리등록 경로)을 최소 재적용하는 방식으로 진행. 관련 문서: [권한설정_재구축_v128_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/권한설정_재구축_v128_계획.md)
- 2026-04-07: `권한/설정` 재구축 1차 기준선 확정. `v127` 관련 파일을 [2026-04-07_permissions-rebuild-pre-v128](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/backups/2026-04-07_permissions-rebuild-pre-v128)에 백업했고, `v114~v121` 후보 중 `v121`을 기준선으로 선택. `ui_logic_new_design_v121_codex.js`의 `6151~6785` 줄을 [v121_permissions_lines_6151_6785.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/backups/2026-04-07_permissions-rebuild-pre-v128/v121_permissions_lines_6151_6785.js) 로 추출해 재구축 기준 데이터로 고정. 관련 문서: [권한설정_재구축_v128_1차_기준선확정.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/reference/권한설정_재구축_v128_1차_기준선확정.md)
- 2026-04-07: `권한/설정` 재구축 2차 진행. `v121` 기준선에서 `ui_permissions_v128_codex.js`를 새로 생성하고, `v127`의 필수 최신 변경만 재적용함.
  - 유지한 최신 변경:
    - 운영실 로그 자동 로드 제거
    - 운영실 `resetLogPanels`
    - `잔업/특근 설정` 저장 버튼
    - `게시판 읽기/쓰기` 권한 그룹
  - `index.html`은 `ui_permissions_v128_codex.js`를 읽도록 변경
  - hosting 재배포 완료
  - 브라우저 자동화 기준:
    - `권한/설정` 본문 한글 정상
    - `운영실` 본문 한글 정상
    - `접속 로그 불러오기`, `보안 로그 불러오기` 문구 정상
  - 관련 문서: [권한설정_재구축_v128_2차_권한페이지복구_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/권한설정_재구축_v128_2차_권한페이지복구_결과.md)
- 2026-04-07: `권한/설정` 탭별 실제 클릭 검증 완료. 마스터 로그인 후 `권한 탭 -> 설정 테이블 -> 메일 설정 -> 잔업/특근 설정 -> 운영실` 순으로 실클릭 검증했고, 총 `5 passed / 0 failed`. 특히 `운영실 > 선택 날짜로 대리 등록` 버튼은 실제 클릭 후 `관리자 대리 등록` 모달이 열리는 것까지 확인. 관련 문서: [권한설정_탭별실클릭검증_v128_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/권한설정_탭별실클릭검증_v128_결과.md)
- 2026-04-07: `전체상황판 > 당일 부재 인원` 아코디언 2차(v136) 반영. 연차 종류 카드 내부의 직원 카드를 `연차현황` 카드 톤으로 맞췄고, 이름/직급/부서/시간범위와 함께 남은 연차/총 연차, 사용률 게이지를 표시하도록 조정. 브라우저 검증은 사용자 직접 확인 기준으로 남김. 관련 문서: [전체상황판_부재카드스타일_v136_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/전체상황판_부재카드스타일_v136_결과.md)
- 2026-04-07: `전체상황판 > 당일 부재 인원` 아코디언 3차(v137) 반영. 펼쳐진 직원카드가 연차 종류 카드 외곽선에 붙어 보이지 않도록, 내부 리스트에 좌우/하단 여백을 추가하고 직원카드 폭과 패딩을 미세 조정. 관련 문서: [전체상황판_부재카드간격_v137_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/전체상황판_부재카드간격_v137_결과.md)
- 2026-04-07: 전체 배치도/한글 깨짐 복구 계획 수립. 현재 `index.html`에서 `ui_situation_v133 + v135 + v136 + v137`이 중첩 로드되고 있으며, `v135~v137` 오버라이드 파일 안에 깨진 한글 문자열과 부분 복사된 모달 렌더 함수가 함께 들어가 있어 레이아웃/문구가 동시에 흔들리는 상태로 판단. 복구 방향은 `v133` 기준 임시 안정화 후 `ui_situation_v138_codex.js` 단일 파일에서 필요한 변경만 재구축하는 방식으로 정리. 관련 문서: [배치도_한글깨짐_복구계획_v138.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/배치도_한글깨짐_복구계획_v138.md)
- 2026-04-07: 배치도/한글깨짐 복구 1차 안정화 완료. `index.html`에서 `ui_situation_v135~v137` 로드를 제거하고 `ui_situation_v133_codex.js`만 남긴 뒤 hosting 재배포. 자동 검증 기준으로 `전체 상황판 -> 날짜 클릭` 모달 텍스트가 다시 정상 한글(`선택 날짜 기준 전체 자리 배치도`, `당일 부재 인원`)로 보이는 것까지 확인. 이 단계에서 아코디언/커스텀 직원카드는 의도적으로 롤백됨. 관련 문서: [배치도_한글깨짐_복구_v138_1차_안정화결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/배치도_한글깨짐_복구_v138_1차_안정화결과.md)
- 2026-04-07: 배치도/한글깨짐 복구 2차(v138) 완료. `ui_situation_v138_codex.js` 단일 파일에서만 `당일 부재 인원` 연차 종류별 아코디언, 기본 접힘, 독립 펼침, 내부 직원카드 스타일, 내부 여백을 재구축했고 hosting 재배포 완료. 자동 검증 기준으로 모달 한글 문구 정상, 기본 접힘 정상, 첫 카드 클릭 후 내부 카드 생성까지 확인. 관련 문서: [배치도_한글깨짐_복구_v138_2차_재구축결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/배치도_한글깨짐_복구_v138_2차_재구축결과.md)
- 2026-04-07: 전체상황판 메인 의미 없는 세로 스크롤 제거(v139). 원인은 `main#app-container` 상단 패딩 + `.situation-board-page` 상하 패딩을 `.situation-board-shell` 높이 계산이 충분히 반영하지 못한 것이었고, [index.html](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/index.html) 에서 `.situation-board-shell`의 `height/min-height`를 `calc(100vh - 7.6rem)`으로 보정. 자동 수치 검증 결과 `docScrollHeight == innerHeight`, `hasVerticalScroll: false`. 관련 문서: [전체상황판_세로스크롤_v139_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/전체상황판_세로스크롤_v139_결과.md)
- 2026-04-08: 상단 `관리 메뉴`에서 `운영실` 항목 제거(v140). 이유는 `운영실`이 이미 `권한/설정` 내부 탭이라 상단 드롭다운에서는 중복 진입점이었기 때문. [ui_logic_new_design_v140_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_logic_new_design_v140_codex.js) 에서 데스크톱/모바일 메뉴 모두 `운영실` 항목을 제거했고, 브라우저 자동 검증 결과 `관리 메뉴`에는 `권한/설정`, `구성원 관리`만 남음. 관련 문서: [관리메뉴_운영실제거_v140_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/관리메뉴_운영실제거_v140_결과.md)
- 2026-04-08: 특별휴가 발생일/사용기한/경고 규칙 도입을 위한 계획 문서 작성. 핵심 방향은 `userSpecialLeaves`에 `eventDate / usableFromDate / usableToDate`를 추가하고, 연차현황표에서는 `다 썼거나 기한 지난 항목은 숨김`, `미사용 잔여가 있으면 경고`로 처리하는 것. Firestore 읽기/쓰기는 마지막 단계 전까지 최소화하고, 먼저 순수 계산 함수와 프런트 표시 규칙부터 구현하기로 함. 관련 문서: [특별휴가_발생일기한경고_계획.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/plans/특별휴가_발생일기한경고_계획.md)
- 2026-04-08: 특별휴가 `grant 단위` 1차 구조 반영(v141). `index.html`은 `core/ui_shared_helpers/ui_shared_request/ui_logic/ui_permissions/ui_user_management`를 `v141` 기준으로 교체했고, 특별휴가 종류 설정에 `발생일 기준/소멸 방향/기한 일수` 입력 UI를 추가, 구성원 관리 직원 수정 모달은 `grant 행 추가` 구조로 변경, 요청 저장 구조에는 `specialLeaveGrantId`를 추가했다. 서버도 `specialLeaveTypes` expiry rule, `userSpecialLeaves` grantId/eventDate/usable window, `requestService`의 selected grant 검증을 받을 수 있게 확장했다. 문법 검사는 모두 통과했고, 배포 후 DOM 기준으로 `특별휴가 종류 설정`과 `grant 행 추가` UI 존재를 확인했다. 관련 문서: [특별휴가_grant구조_v141_1차_결과.md](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/docs/results/특별휴가_grant구조_v141_1차_결과.md)
## 2026-04-08 특별휴가 종류 2단 레이아웃 v142
## 2026-04-08 Special Leave Type Two-Row Layout v142

- `ui_permissions_v141`를 기준으로 `ui_permissions_v142_codex.js`를 만들고 특별휴가 종류 설정 카드를 2단 폼으로 재배치함.
- Based on `ui_permissions_v141`, created `ui_permissions_v142_codex.js` and rearranged the special leave type settings card into a two-row form.

- `index.html`은 `ui_permissions_v142_codex.js`를 읽도록 변경함.
- `index.html` now loads `ui_permissions_v142_codex.js`.

## 2026-04-08 직원카드 특별휴가 이력 v143
## 2026-04-08 Member Card Special Leave History v143

- `ui_dashboard_v143_codex.js`에서 직원 카드 하단에 `소진/소멸 특별연차 이력` 섹션을 추가함.
- Added a `consumed/expired special leave history` section to the bottom of the member card in `ui_dashboard_v143_codex.js`.

- 표시 대상은 `consumed`, `expired` 상태의 특별휴가 grant만 포함함.
- Only special leave grants in `consumed` or `expired` status are included.

- `index.html`은 `ui_dashboard_v143_codex.js`를 읽도록 변경함.
- `index.html` now loads `ui_dashboard_v143_codex.js`.

## 2026-04-08 특별휴가 소진 직원카드 표시 v144
## 2026-04-08 Special Leave Consumed Entry Display on Member Card v144

- `ui_shared_helpers_v144_codex.js`에서 특별휴가 상태 판정 순서를 조정함.
- Adjusted the special leave status evaluation order in `ui_shared_helpers_v144_codex.js`.

- `availableHours <= 0` 인 grant는 발생일 누락보다 먼저 `consumed`로 처리해 직원카드 이력에 남도록 함.
- Grants with `availableHours <= 0` are now treated as `consumed` before missing-event-date handling so they remain visible in member-card history.

- `팀원 연차 현황` 집계에서는 `consumed`, `expired`, `inactive`를 모두 제외하도록 정리함.
- The team annual summary now excludes `consumed`, `expired`, and `inactive`.

## 2026-04-08 특별휴가 달력 표시 v145
## 2026-04-08 Special Leave Calendar Display v145

- `ui_calendar_v145_codex.js`를 만들고, 개인 달력(`calendarMode = self`)에 특별휴가 발생일 칩과 사용 가능 기간 막대바를 추가함.
- Created `ui_calendar_v145_codex.js` and added special-leave event-date chips and usable-window bars to the personal calendar (`calendarMode = self`).

- 발생일 당일은 칩만 표시하고, 사용 가능 기간은 `usableFromDate ~ usableToDate` 구간에만 막대바로 표시함.
- The event day itself shows only the chip, while the usable window is represented as a bar only across `usableFromDate ~ usableToDate`.

- `index.html`은 `ui_calendar_v145_codex.js`를 읽도록 변경함.
- `index.html` now loads `ui_calendar_v145_codex.js`.

## 2026-04-08 특별휴가 달력 하단 배치 v146
## 2026-04-08 Special Leave Calendar Bottom Alignment v146

- `ui_calendar_v146_codex.js`에서 특별휴가 칩/막대바를 달력 셀 하단으로 배치함.
- In `ui_calendar_v146_codex.js`, moved the special-leave chip/bar into the bottom zone of the day cell.

- 사용 가능 기간 막대바는 주말 셀에 그리지 않도록 조정함.
- Updated the usable-window bar so it is not drawn on weekend cells.

- `index.html`은 `ui_calendar_v146_codex.js`를 읽도록 변경함.
- `index.html` now loads `ui_calendar_v146_codex.js`.

## 2026-04-08 특별휴가 달력 하단 표시 복구 v147
## 2026-04-08 Special Leave Calendar Bottom Display Fix v147

- 특별휴가 칩/막대바를 셀 내부 flex 하단이 아니라 날짜 칸 `absolute bottom` 레이어로 옮김.
- Moved the special-leave chip/bar from the inner flex bottom to the date cell's `absolute bottom` layer.

- 하단 표시가 보이지 않거나 다음 행에 걸쳐 보이던 문제를 줄이기 위한 보정.
- A corrective adjustment to reduce cases where the bottom marker was invisible or appeared across the next row.

- `index.html`은 `ui_calendar_v147_codex.js`를 읽도록 변경함.
- `index.html` now loads `ui_calendar_v147_codex.js`.

## 2026-04-08 특별휴가 카드 사용가능기간 v148
## 2026-04-08 Special Leave Card Usable Window v148

- `ui_shared_helpers_v148_codex.js`에서 특별휴가 카드에 `사용 가능 기간` 문구를 추가함.
- Added a `usable window` line to the special leave card in `ui_shared_helpers_v148_codex.js`.

- 단일 grant 또는 동일 기간 다건이면 정확한 날짜 범위를 보여주고, 기간이 다른 다건이면 `사용 가능 기간 상이 (n건)`으로 표시함.
- Shows the exact range for a single grant or same-window multi-grants, and `different usable windows (n grants)` for mixed-window multi-grants.

- `index.html`은 `ui_shared_helpers_v148_codex.js`를 읽도록 변경함.
- `index.html` now loads `ui_shared_helpers_v148_codex.js`.

## 2026-04-08 특별휴가 달력 표시 가시성 v149
## 2026-04-08 Special Leave Calendar Visibility v149

- `ui_calendar_v149_codex.js`에서 특별휴가 칩/막대바를 `absolute bottom` 고정에서 제거하고, 날짜 셀 내부의 보이는 하단 footer 영역으로 옮김.
- In `ui_calendar_v149_codex.js`, moved the special-leave chip/bar out of the `absolute bottom` layer into the visible lower footer area inside the date cell.

- 날짜 칸 안에서 더 자연스럽게 보이도록 셀 내부를 `flex column`으로 유지하고, footer 블록을 `mt-auto`로 정렬함.
- Kept the date cell as a `flex column` and aligned the footer block with `mt-auto` so the markers sit in a more naturally visible lower zone.

- `index.html`은 `ui_calendar_v149_codex.js`를 읽도록 변경함.
- `index.html` now loads `ui_calendar_v149_codex.js`.

## 2026-04-08 특별휴가 달력 및 신청 정합성 v150
## 2026-04-08 Special Leave Calendar and Request Consistency v150

- `ui_calendar_v150_codex.js`에서 월 내 활성 특별휴가 grant가 여러 건일 때 grant별로 서로 다른 표시 색을 배정함.
- In `ui_calendar_v150_codex.js`, active special-leave grants within the same month now receive distinct display colors per grant.

- `ui_shared_helpers_v150_codex.js`에서 신청 종류 드롭다운이 선택한 날짜 범위 안에서 실제 사용 가능한 특별휴가 grant만 보여주도록 변경함.
- In `ui_shared_helpers_v150_codex.js`, the request-type dropdown now shows only the special-leave grants that are actually usable within the selected date range.

- `ui_logic_new_design_v150_codex.js`에서 날짜 변경 시 특별휴가 옵션을 먼저 다시 계산하고, 불가한 특별휴가는 목록에서 제외하면서 즉시 경고 문구를 보여주도록 변경함.
- In `ui_logic_new_design_v150_codex.js`, changing the date now recalculates special-leave options first and immediately shows a warning when the previously selected special leave becomes invalid and is removed from the list.

- `index.html`은 `ui_shared_helpers_v150_codex.js`, `ui_logic_new_design_v150_codex.js`, `ui_calendar_v150_codex.js`를 읽도록 변경함.
- `index.html` now loads `ui_shared_helpers_v150_codex.js`, `ui_logic_new_design_v150_codex.js`, and `ui_calendar_v150_codex.js`.

## 2026-04-08 출산휴가 법정 규칙 계획
## 2026-04-08 Maternity Leave Statutory Rules Plan

- 출산휴가를 일반 특별휴가와 분리한 별도 법정 휴가로 정의하는 계획 문서 `출산휴가_법정규칙_계획.md`를 생성함.
- Created `출산휴가_법정규칙_계획.md` to define maternity leave as a separate statutory leave rather than ordinary special leave.

- 핵심 방향: 일반 90일, 다태아 120일, 미숙아 100일, 산후 최소 45/60일 확보, 기간형만 허용, 반차/시간차 불가.
- Core direction: 90 days standard, 120 days for multiple births, 100 days for premature infant cases, protected 45/60 postnatal days, range-only requests, no half-day/time-off modes.

## 2026-04-08 전체상황판 자리배치도 당일기준 v151
## 2026-04-08 Situation Board Seat Map Same-Day Basis v151

- `ui_shared_helpers_v151_codex.js`에서 오늘 날짜 자리배치도 부재 판정을 `현재 시각 기준`에서 `당일 기준`으로 변경함.
- In `ui_shared_helpers_v151_codex.js`, changed today's seat-map absence judgment from `current-time-based` to `same-day-based`.

- 승인된 반차/시간차(퇴근/외출)는 오늘 날짜에서도 현재 시각과 무관하게 자리배치도와 우측 부재 인원 목록에 표시됨.
- Approved half-day and time-off requests now appear on today's seat map and right-side absent list regardless of the current clock time.

- `index.html`은 `ui_shared_helpers_v151_codex.js`를 읽도록 변경함.
- `index.html` now loads `ui_shared_helpers_v151_codex.js`.

## 2026-04-08 공지사항 게시글 초기화
## 2026-04-08 Notice Board Reset

- 기존 `boardPosts` 23건을 전용 백업 후 모두 제거하고, 공지사항 3건만 새로 등록함.
- Backed up and removed all 23 existing `boardPosts`, then inserted only 3 new notice posts.

- 백업 위치:
- Backup location:
  - `backups/2026-04-08_reset-board-to-notices/boardPosts-before.json`
  - `backups/2026-04-08_reset-board-to-notices/boardPosts-after.json`
  - `backups/2026-04-08_reset-board-to-notices/summary.json`

- 새 공지 3건은 `Web관리자 / 매뉴얼팀` 명의로 등록함.
- The 3 new notices were registered under `Web관리자 / 매뉴얼팀`.

## 2026-04-08 공지사항 역할별 사용법 추가
## 2026-04-08 Role-Based Notice Guide Addition

- 기존 공지 3건은 유지하고, 직원/파트장/팀장/대표/마스터용 사용법 공지 5건을 추가 등록함.
- Kept the existing 3 notices and added 5 role-based guide notices for employee/part leader/team leader/CEO/master.

- 현재 공지사항에는 공개 범위 기능이 없어 5건 모두 전원 공개 공지로 등록함.
- Since the current notice board has no audience-scope feature, all 5 guides were registered as globally visible notices.

- 최종 `boardPosts` 수는 8건.
- Final `boardPosts` count is 8.

## 2026-04-08 홈 대시보드 팀원 연차 현황 독립 접기
## 2026-04-08 Home Dashboard Member Status Independent Collapse

- 홈화면 `팀원 연차 현황`을 `파츠북팀 / 매뉴얼팀` 각각 독립 접기 구조로 변경함.
- Changed the home dashboard `Team Member Leave Status` into independent collapsible sections for `Partsbook Team / Manual Team`.

- 기본 상태는 두 부서 모두 접힘이며, 한 부서를 열어도 다른 부서는 자동으로 열리지 않음.
- Both sections now start collapsed, and opening one section does not automatically open the other.

## 2026-04-08 홈 대시보드 팀원 연차 현황 헤더 정리
## 2026-04-08 Home Dashboard Member Status Header Cleanup

- `사용 내역` 토글과 `펼치기/접기` 버튼을 같은 우측 컨트롤 영역으로 정리함.
- Grouped the `Usage History` toggle and `Expand/Collapse` button into the same right-side control area.

- `직원 카드 켜짐/꺼짐` 문구는 제거함.
- Removed the `Employee Card On/Off` label.

## 2026-04-08 잔업/특근 반려 후 제출 대기 잔존 원인 분석
## 2026-04-08 Work Report Rejection Still Showing as Pending Root Cause Analysis

- 서버는 반려 시 `settlementStatus: rejected`를 저장하지만, `loadService`가 이 필드를 요청 응답에 포함하지 않아 프런트가 `settlementSubmittedAt`만 보고 계속 `submitted`로 오인하는 구조를 확인함.
- Confirmed that the server stores `settlementStatus: rejected` on rejection, but `loadService` omits that field from request responses, causing the frontend to misread `settlementSubmittedAt` alone as `submitted`.

- 수정 계획 문서 작성:
- Plan document created:
  - `잔업특근_반려후제출대기잔존_계획.md`

## 2026-04-08 잔업/특근 반려 후 제출 대기 잔존 v142 수정
## 2026-04-08 Work Report Rejection Still Showing as Pending v142 Fix

- `loadService` 요청 응답에 `settlementStatus`, 승인/반려 시각 및 담당자, 반려 사유 필드를 추가함.
- Added `settlementStatus`, approval/rejection timestamps and actor fields, and rejection reason to the `loadService` request response.

- `core_logic_new_design_v142_codex.js`의 `sanitizeRequest()`가 정산 상태 필드를 유지하도록 보강함.
- Updated `sanitizeRequest()` in `core_logic_new_design_v142_codex.js` to preserve settlement status fields.

## 2026-04-08 잔업/특근 통합 스위치 및 제출 대기 숨김 v154
## 2026-04-08 Work Report Unified Toggle and Pending Section Hide v154

- `권한/설정 > 잔업/특근 설정`의 `잔업 신청 기능`, `특근 신청 기능`을 하나의 `잔업/특근 신청 기능` 스위치로 통합함.
- Unified the `Overtime Application` and `Holiday Work Application` toggles in `Permissions/Settings > Work Report Settings` into a single `Work Report Application` switch.

- 해당 스위치가 꺼져 있으면 홈 대시보드의 `잔업/특근 제출 대기` 블록도 숨기도록 변경함.
- Changed the home dashboard so the `Pending Overtime/Holiday Work Submission` block is hidden when the work report feature switch is off.

## 2026-04-08 홈 대시보드 사용내역 토글 숨김 v155
## 2026-04-08 Home Dashboard Usage Toggle Hidden v155

- 홈화면 `팀원 연차 현황` 헤더의 `사용 내역` 토글은 다음 사용 시점까지 UI에서 숨김 처리함.
- Hid the `Usage History` toggle in the home dashboard `Team Member Leave Status` header until it is needed again.

## 2026-04-08 운영실 대상 직원 마스터 포함 v151
## 2026-04-08 Admin Ops Target User Includes Master v151

- 운영실 `대상 직원` 목록에서 마스터를 제외하던 필터를 제거함.
- Removed the filter that excluded the master account from the Admin Ops `Target User` list.

- 운영실 접근 권한이 있는 경우 마스터도 일반 대상 직원처럼 선택 가능하도록 변경함.
- Updated Admin Ops so that users with access can select the master account just like any other target user.

## 2026-04-08 ncore_web 폴더 정리 1차
## 2026-04-08 ncore_web Folder Cleanup Phase 1

- 상위 폴더의 과거 복사본 4개를 `D:\MYDOC\Desktop\vscode\Web\firebase\ncore_web\_archive`로 이동함.
- Moved the 4 historical top-level copies into `D:\MYDOC\Desktop\vscode\Web\firebase\ncore_web\_archive`.

- `ncore-main` 내부에는 `docs\plans`, `docs\results`, `docs\manuals`, `docs\reference` 구조를 생성함.
- Created the `docs\plans`, `docs\results`, `docs\manuals`, and `docs\reference` structure inside `ncore-main`.

## 2026-04-08 ncore-main 루트 문서 분류 이동 2차
## 2026-04-08 ncore-main Root Document Reclassification Phase 2

- `ncore-main` 루트의 `.md` 문서 185개를 `docs\plans`, `docs\results`, `docs\manuals`, `docs\reference`로 분류 이동함.
- Reclassified and moved 185 root `.md` documents in `ncore-main` into `docs\plans`, `docs\results`, `docs\manuals`, and `docs\reference`.

- 루트에는 `handoff.md`, `이후_작업_정리.md`만 유지함.
- Left only `handoff.md` and `이후_작업_정리.md` in the root.

- 문서 간 절대경로 링크도 이동 경로에 맞게 함께 갱신함.
- Updated absolute-path links among documents to match the moved locations.

## 2026-04-08 ncore-main 레거시 폴더 정리 3차
## 2026-04-08 ncore-main Legacy Folder Cleanup Phase 3

- `functions_v1`, `package_*`, `정리_*` 폴더를 `ncore-main\legacy` 아래로 이동함.
- Moved `functions_v1`, `package_*`, and `정리_*` folders under `ncore-main\legacy`.

- 현재 작업본에서 해당 폴더를 참조하던 스크립트와 절대경로 문서 링크를 새 위치로 갱신함.
- Updated active scripts and absolute-path document links that referenced those folders to the new location.

## 2026-04-08 폴더 구조 안내 및 GitHub 업로드용 패키지 정리
## 2026-04-08 Folder Structure Guide and GitHub Upload Package Preparation

- 현재 구조 설명 문서 생성:
- Created current structure guide:
  - `docs/reference/폴더구조_안내_2026-04-08.md`

- 업로드용 패키지 생성 스크립트 추가:
- Added upload package generation script:
  - `scripts/build-github-upload-ready.ps1`

- 생성된 GitHub 업로드용 패키지:
- Generated GitHub upload-ready package:
  - `D:\MYDOC\Desktop\vscode\Web\firebase\ncore_web\github_upload_ready_2026-04-08`

- 패키지에는 `functions`, `js`, `scripts`, `docs`, `gs`와 핵심 루트 설정 파일만 포함하고, `node_modules`, `.firebase`, `backups`, `legacy`, `reports`, 서비스 계정 키, 엑셀 원본, 로그, 임시 파일은 제외함.
- The package includes `functions`, `js`, `scripts`, `docs`, `gs`, and core root config files only, while excluding `node_modules`, `.firebase`, `backups`, `legacy`, `reports`, service-account keys, Excel source files, logs, and temporary files.

## 2026-04-08 파일 버전 정리 계획
## 2026-04-08 File Version Cleanup Plan

- `js` 폴더의 `_vNNN_codex.js` 파일이 155개 누적된 상태를 확인함.
- Confirmed that the `js` folder contains 155 accumulated `_vNNN_codex.js` files.

- 현재 운영본은 `index.html` 기준 로드 파일 목록으로 고정하고, 나머지는 `js\legacy_versions`로 단계적으로 이동하는 계획을 수립함.
- Established a plan to freeze the current production set based on the files loaded by `index.html`, then gradually move the rest into `js\legacy_versions`.

- 계획 문서:
- Plan document:
  - `docs/plans/파일버전정리_계획_2026-04-08.md`

## 2026-04-08 파일 버전 정리 v001 적용
## 2026-04-08 File Version Cleanup v001 Applied

- 현재 운영 세트를 `v001` 네이밍으로 재시작함.
- Restarted the current production set under the `v001` naming convention.

- `index.html`은 이제 `v001` 세트만 로드함.
- `index.html` now loads only the `v001` set.

- 기존 `_vNNN_codex.js` 파일 155개는 `js\legacy_versions`로 이동했고, 비표준 사본 1개도 함께 보관함.
- Moved 155 existing `_vNNN_codex.js` files into `js\legacy_versions`, along with one additional nonstandard copy file.

- 기준 문서:
- Reference docs:
  - `docs/reference/현재운영_JS버전맵_v001_2026-04-08.md`
  - `docs/results/파일버전정리_v001_결과_2026-04-08.md`

