# Ncore Firebase Handoff

최종 업데이트: 2026-03-19

## 1. 한 줄 요약

- GitHub는 계속 사용한다.
- 실제 사이트 주소는 Firebase Hosting이다.
- 실제 운영 데이터는 Firestore를 사용한다.
- 서버 역할은 Firebase Functions가 한다.

즉:

- GitHub = 코드 창고
- Firebase Hosting = 실제 사이트
- Firestore = 운영 데이터
- Functions = 저장/조회/로그인 처리

## 2. 현재 사이트 / 프로젝트 정보

- Firebase 프로젝트 ID: `ncore-vacation-system`
- 실제 사이트 주소: `https://ncore-vacation-system.web.app`
- API 경로: `/api`
- Firestore 기본 DB: `(default)`
- 리전: `asia-northeast3`

## 3. 로컬 작업 폴더

- 작업 폴더: `C:\Users\kei85\Desktop\ncore_web\ncore-main`
- 엑셀 백업 파일: `C:\Users\kei85\Desktop\ncore_web\Ncore_DB.xlsx`
- Firebase 관리자 키(JSON): `C:\Users\kei85\Desktop\ncore_web\`

주의:

- Firebase 관리자 키 JSON은 GitHub에 올리면 안 된다.
- `Ncore_DB.xlsx`도 GitHub에 올리지 않는 것이 안전하다.
- `node_modules`도 GitHub에 올리지 않는다.

## 4. 현재 구조

예전 구조:

- GitHub + Google Sheets + Apps Script

현재 구조:

- 화면 파일 -> Firebase Hosting
- 운영 데이터 -> Firestore
- 서버 처리 -> Firebase Functions

현재 프런트는 Apps Script 대신 `/api`를 본다.

핵심 파일:

- `index.html`
- `js/core_logic_new_design_v111_codex.js`
- `js/ui_logic_new_design_v111_codex.js`
- `functions/index.js`
- `firebase.json`

## 5. 데이터 이관 상태

Firestore 컬렉션:

- `users`
- `requests`
- `boardPosts`
- `holidays`
- `specialLeaveTypes`
- `userSpecialLeaves`
- `mailRoutes`
- `accessLogs`

정합성 확인 결과:

- Users: 36건 정상
- Requests: 192건 정상
- BoardPosts: 19건 정상
- Holidays: 27건 정상
- SpecialLeaveTypes: 8건 정상
- UserSpecialLeaves: 0건 정상
- MailRoutes: 4건 정상
- AccessLogs: 원본 외 운영 로그 추가 생성됨

### Requests 날짜 이슈

문제:

- Requests 날짜가 Excel serial number로 들어가 있었다.
- 예: `46045` 같은 숫자
- 화면에서는 이 값을 읽지 못하고 오늘 날짜로 대체해서 2026-03-19에 몰려 보였다.

조치:

- 이관 스크립트에서 Excel 날짜 숫자를 `YYYY-MM-DD` / `YYYY-MM-DD HH:mm:ss`로 변환하도록 수정
- 프런트도 숫자 날짜를 다시 읽을 수 있게 보강
- `requests` 192건 재업로드 완료

현재 상태:

- Requests 192건 모두 ISO 날짜 형식으로 정상화 완료
- 날짜가 여러 날로 정상 분포됨

## 6. 로그인 정책

사용자 요청에 따라 테스트 버전은 기존 방식 유지:

- 로그인 ID: 기존 사용자 ID
- 비밀번호: `0`

즉:

- Firebase Auth로 완전히 바꾸지 않았다
- 현재는 Functions에서 기존 로그인 방식과 비슷하게 처리한다

## 7. 배포 방식

중요:

- GitHub에 올린다고 사이트가 자동 반영되지는 않는다
- 실제 사이트 반영은 Firebase deploy를 해야 한다

### 화면만 수정했을 때

예:

- `index.html`
- `js/` 아래 파일

명령:

```powershell
cd C:\Users\kei85\Desktop\ncore_web\ncore-main
& 'C:\Users\kei85\AppData\Roaming\npm\firebase.cmd' deploy --only hosting --project ncore-vacation-system
```

### 서버 기능도 수정했을 때

예:

- `functions/index.js`

명령:

```powershell
cd C:\Users\kei85\Desktop\ncore_web\ncore-main
& 'C:\Users\kei85\AppData\Roaming\npm\firebase.cmd' deploy --only functions,hosting --project ncore-vacation-system
```

### 데이터만 다시 넣을 때

명령:

```powershell
cd C:\Users\kei85\Desktop\ncore_web\ncore-main
node .\scripts\import-firestore.js
```

### 정합성 비교할 때

명령:

```powershell
cd C:\Users\kei85\Desktop\ncore_web\ncore-main
node .\scripts\compare-firestore.js
```

## 8. 회사 / 집 운영 방식

가장 쉬운 운영 방법:

1. 코드 수정
2. GitHub push
3. 실제 반영이 필요하면 Firebase deploy

정리:

- GitHub = 코드 백업 / 버전관리 / 회사-집 동기화
- Firebase = 실제 서비스 반영
- Firestore = 운영 데이터 저장

즉:

- 코드 변경은 GitHub로 이어진다
- 운영 데이터는 Firestore에 남는다
- Codex 대화는 회사/집에서 자동으로 이어진다고 가정하면 안 된다

## 9. 지금 남아 있는 특이사항

- `users`에 원본 엑셀에 없는 테스트 계정 `id=1` 이 1건 있다
- `accessLogs`에 테스트 작업 중 생성된 추가 로그가 6건 있다
- 이 둘은 이관 누락이 아니라 운영 중 추가 생성된 데이터다

## 10. 다음에 할 수 있는 작업

우선순위 후보:

1. 테스트 계정 `id=1` 삭제 여부 결정
2. 테스트 로그 6건 정리 여부 결정
3. GitHub push 자동 Firebase 배포(CI/CD) 연결
4. 회사 PC에 Firebase 배포 환경 세팅
5. Firebase 보안 규칙 점검

## 11. 회사에서 Codex에게 바로 보여줄 문장

아래 문장을 새 대화에 붙여넣으면 맥락 복구가 쉽다.

```text
이 프로젝트의 handoff.md를 먼저 읽고 이어서 작업해.
프로젝트는 GitHub는 코드 저장용, Firebase Hosting/Functions/Firestore는 실제 운영용으로 바뀌었다.
Requests 날짜 이슈는 Excel serial number 때문이었고 이미 복구했다.
현재 작업 폴더는 C:\Users\kei85\Desktop\ncore_web\ncore-main 이다.
```
