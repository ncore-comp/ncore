# 잔업특근 UI/UX 1차 v115 결과

- 작업 일자: 2026-04-01
- 기준 폴더: `D:\MYDOC\Desktop\vscode\Web\firebase\ncore_web\ncore-main`

## 개요

이번 1차는 `잔업/특근 신청`과 `잔업/특근 현황`을 나누는 방향으로, 권한과 버튼 구조, 개인 달력 표시, 설정 탭의 기본 뼈대를 먼저 반영한 작업입니다.

쉽게 비유하면:
- `신청`은 직원이 자기 영수증을 적는 창구
- `현황`은 승인권자와 관리자가 장부를 보는 열람실

## 반영된 핵심

### 1. JS 버전 업
- 메인 프런트 스크립트를 `v114`에서 `v115`로 올렸습니다.
- 연결 파일:
  - [index.html](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/index.html)
  - [js/core_logic_new_design_v115_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/core_logic_new_design_v115_codex.js)
  - [js/ui_logic_new_design_v115_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_logic_new_design_v115_codex.js)
  - [js/mobile_ui_new_design_v115_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/mobile_ui_new_design_v115_codex.js)

### 2. 버튼 분리
- 메인 화면 버튼을 아래처럼 분리했습니다.
  - `잔업/특근 신청`
  - `잔업/특근 현황`

규칙:
- 대표는 `신청` 버튼이 보이지 않음
- 현황 권한이 있거나 승인권자인 사람만 `현황` 버튼이 보임

### 3. 신청/현황 모드 분리
- 같은 월별 잔업/특근 모달을 두 모드로 분리했습니다.
  - `apply` = 개인 신청/수정/제출 모드
  - `overview` = 권한 범위 직원 열람 모드

#### 신청 모드
- 본인 기록만 표시
- `메일 초안`
- `승인 요청`
- `보고 추가`
- 건별 `수정` 버튼

#### 현황 모드
- 권한 범위 직원들의 정산월 현황 표시
- 집계표의 버튼은 `상세확인`만 사용

### 4. 제출 가능일 잠금
- 승인 요청은 실제 제출 가능일 이후에만 가능합니다.
- 제출 가능일 이전에는 알림만 띄우고 동작하지 않도록 보강했습니다.

### 5. 제출 전/후 수정 규칙 1차 반영
- 제출 전: 수정 가능
- 제출 후: 잠금

### 6. 개인 달력 통합 시작
- 달력 `개인` 탭에서 본인 연차와 본인 잔업/특근이 같이 보이도록 연결을 시작했습니다.
- 별도 `잔업/특근` 달력 탭은 관련 권한이 있는 경우에만 표시됩니다.

### 7. 권한 구조 확장
- 잔업/특근 현황 열람 범위 권한 필드를 추가했습니다.
  - `workReportViewManual`
  - `workReportViewParts`
  - `workReportViewAll`

자동 규칙:
- 승인권자는 `approveScope`에 맞춰 같은 범위의 현황 권한을 자동으로 가집니다.
- 대표와 마스터는 전체 현황 권한을 자동으로 가집니다.

### 8. 설정 탭 추가
- 권한/설정 상단에 `잔업/특근 설정` 탭을 추가했습니다.
- 1차에서는 신청 기능 스위치와 운영 규칙 안내를 이 탭에 배치했습니다.

## 아직 남은 2차

- 홈 결재 대기 카드 안에서 `휴가`와 `잔업/특근` 구분선 분리
- 승인권자 상세 화면 상단의 `승인 / 반려`
- 승인/반려 결과 메일 발송
- 반려 후 재제출 UX
- 기존 `설정 테이블` 안에 남아 있는 중복 잔업/특근 스위치 정리

## 검증

- `node --check` 통과
  - [js/core_logic_new_design_v115_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/core_logic_new_design_v115_codex.js)
  - [js/ui_logic_new_design_v115_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_logic_new_design_v115_codex.js)
  - [functions/src/lib/common.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/functions/src/lib/common.js)
  - [functions/src/services/userService.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/functions/src/services/userService.js)
  - [functions/src/services/loadService.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/functions/src/services/loadService.js)
- `functions + hosting` 배포 완료

운영 주소:
- [https://ncore.web.app](https://ncore.web.app)
