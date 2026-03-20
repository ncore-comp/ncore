# Ncore Firebase Handoff

마지막 업데이트: 2026-03-19

## 1. 한 줄 요약

- GitHub는 코드 보관함이다.
- Firebase Hosting은 실제 사이트 주소다.
- Firestore는 운영 데이터 저장소다.
- Functions는 로그인, 저장, 수정 같은 서버 처리 담당이다.

쉽게 말하면:

- GitHub = 설계도 창고
- Firebase Hosting = 실제 매장
- Firestore = 장부
- Functions = 직원

## 2. 현재 운영 주소

- Firebase 프로젝트 ID: `ncore-vacation-system`
- 메인 주소: `https://ncore.web.app`
- 기존 기본 주소: `https://ncore-vacation-system.web.app`
- API 경로: `/api`
- Firestore DB: `(default)`
- 리전: `asia-northeast3`

참고:

- GitHub Pages 주소 `https://ncore-comp.github.io/ncore/` 는 현재 404로 보고 있음
- 앞으로는 Firebase 주소를 기준으로 운영하는 것이 맞음

## 3. 작업 폴더

- 실제 작업 폴더: `C:\Users\kei85\Desktop\ncore_web\ncore-main`
- 업로드용 정리 폴더: `C:\Users\kei85\Desktop\ncore_web\github_upload_ready_2026-03-19`
- 엑셀 백업 파일: `C:\Users\kei85\Desktop\ncore_web\Ncore_DB.xlsx`

중요:

- 현재 `ncore-main` 폴더는 ZIP으로 받은 복사본이라 Git 저장소가 아님
- 즉, 여기서 수정한 내용은 Firebase에는 배포됐지만 GitHub에는 자동 반영되지 않음

## 4. 절대 GitHub에 올리면 안 되는 것

- Firebase 관리자 키 JSON
- 엑셀 백업 파일
- `node_modules`
- 테스트 결과 JSON

## 5. 현재 구조

이전 구조:

- GitHub + Google Sheets + Apps Script

현재 구조:

- 화면 파일 -> Firebase Hosting
- 운영 데이터 -> Firestore
- 서버 처리 -> Firebase Functions

프런트는 이제 Apps Script URL 대신 `/api` 를 호출함.

## 6. Firestore 이관 상태

컬렉션:

- `users`
- `requests`
- `boardPosts`
- `holidays`
- `specialLeaveTypes`
- `userSpecialLeaves`
- `mailRoutes`
- `accessLogs`

검증 결과:

- Users: 36
- Requests: 192
- BoardPosts: 19
- Holidays: 27
- SpecialLeaveTypes: 8
- UserSpecialLeaves: 0
- MailRoutes: 4
- AccessLogs: 운영 로그 계속 누적

### Requests 날짜 이슈 복구

문제:

- 엑셀 날짜가 serial number로 들어가면서 날짜가 깨졌음
- 화면에서는 읽지 못한 값을 오늘 날짜로 대체해서 2026-03-19에 몰려 보였음

조치:

- `scripts/import-firestore.js` 에서 Excel 날짜 숫자를 ISO 날짜 문자열로 변환하도록 수정
- 프런트도 숫자 날짜를 다시 읽을 수 있게 보강
- `requests` 192건 재업로드 완료

현재:

- Requests 날짜 정합성 정상
- 날짜 분포도 정상

## 7. 로그인 방식

사용자 요구사항:

- 로그인 ID는 기존 시트의 `id` 유지
- 비밀번호는 테스트용으로 `0` 유지

적용 방식:

- Firebase Auth는 사용하지 않음
- Functions에서 기존 방식과 비슷한 커스텀 로그인 처리
- 로그인 성공 후 서버가 세션 토큰 발급

즉:

- 겉으로는 예전처럼 `id + 0`
- 내부적으로는 서버 세션 토큰으로 인증

## 8. 이번에 적용한 핵심 개선

### 8-1. 쓰기 API 진짜 인증 추가

이전:

- 요청 본문에 `actor.id` 만 넣어도 저장 요청이 어느 정도 통과할 수 있었음

현재:

- 로그인 성공 시 세션 토큰 발급
- 쓰기 API는 세션 토큰이 있어야만 처리
- 로그아웃 시 서버 세션도 제거

쉽게 말하면:

- 예전에는 이름만 말해도 들어갈 수 있었음
- 지금은 입장권을 확인하고 들어감

### 8-2. 연차 저장 transaction 처리

이전:

- 중복 확인과 저장이 따로 돌아가서 동시에 신청이 들어오면 겹칠 수 있었음

현재:

- Firestore transaction으로 확인과 저장을 한 번에 처리

쉽게 말하면:

- 예전에는 빈칸 확인하고 나중에 적음
- 지금은 창구에서 확인하고 바로 적음

## 9. 자동 테스트 결과

실행한 테스트:

- 부트 로드
- 로그인
- 사용자 생성/수정/비밀번호 변경
- 연차 생성/수정/삭제
- 게시판 생성/삭제
- 특별휴가 저장
- 동시 접근 테스트
- 인증 없는 쓰기 차단 테스트

최신 결과:

- 15 passed
- 0 failed
- 0 warning

핵심 확인:

- 세션 토큰 없는 쓰기 요청 차단 확인
- 같은 날짜 연차 8개 동시 저장 시 1개만 성공, 7개 중복 차단 확인

테스트 파일:

- `scripts/firestore-e2e-test.js`
- `reports/firestore-e2e-last.json`

## 10. 배포 명령어

### 화면만 수정했을 때

```powershell
cd C:\Users\kei85\Desktop\ncore_web\ncore-main
& 'C:\Users\kei85\AppData\Roaming\npm\firebase.cmd' deploy --only hosting --project ncore-vacation-system
```

### 서버도 수정했을 때

```powershell
cd C:\Users\kei85\Desktop\ncore_web\ncore-main
& 'C:\Users\kei85\AppData\Roaming\npm\firebase.cmd' deploy --only functions,hosting --project ncore-vacation-system
```

### 데이터 다시 넣을 때

```powershell
cd C:\Users\kei85\Desktop\ncore_web\ncore-main
node .\scripts\import-firestore.js
```

### 데이터 비교할 때

```powershell
cd C:\Users\kei85\Desktop\ncore_web\ncore-main
node .\scripts\compare-firestore.js
```

## 11. GitHub와 Firebase 관계

정리:

- GitHub에 올린다고 사이트가 자동 반영되지는 않음
- Firebase deploy 를 해야 실제 사이트가 바뀜

현재 상황:

- 로컬 수정 내용은 Firebase에는 반영됨
- 하지만 현재 작업 폴더가 Git 저장소가 아니므로 GitHub에는 자동 반영 안 됨

## 12. GitHub 업로드용 폴더

정리 완료 위치:

- `C:\Users\kei85\Desktop\ncore_web\github_upload_ready_2026-03-19`

이 폴더에는 GitHub에 올릴 파일만 들어 있음:

- `.firebaserc`
- `firebase.json`
- `gemini-svg.svg`
- `handoff.md`
- `package.json`
- `package-lock.json`
- `functions/index.js`
- `functions/package.json`
- `functions/package-lock.json`
- `js/core_logic_new_design_v111_codex.js`
- `js/ui_logic_new_design_v111_codex.js`
- `scripts/import-firestore.js`
- `scripts/compare-firestore.js`
- `scripts/firestore-e2e-test.js`

참고:

- `gemini-svg.svg` 는 실제 코드에서 쓰고 있으므로 GitHub에도 같이 올려야 함

## 13. 다음 할 일 후보

- 읽기 API(`load`)에도 인증을 붙일지 결정
- GitHub Pages 주소를 `https://ncore.web.app` 로 자동 이동시키는 리다이렉트 구성
- 회사 PC에 Firebase 배포 환경 다시 세팅
- GitHub Actions로 자동 배포 연결 여부 검토

## 14. 새 대화에서 바로 이어갈 문장

아래 문장을 새 대화에 붙여넣으면 맥락 복구가 빠름.

```text
이 프로젝트는 handoff.md 기준으로 이어서 작업해줘.
현재 구조는 GitHub는 코드 보관, Firebase Hosting/Functions/Firestore는 실제 운영 구조다.
메인 주소는 https://ncore.web.app 이고, 로그인은 기존 id + 비밀번호 0을 유지하되 서버 세션 토큰 방식으로 보호되고 있다.
Requests 날짜 깨짐 문제는 복구됐고, 연차 저장은 Firestore transaction으로 바뀌었다.
현재 작업 폴더는 ncore_web\ncore-main 이고, GitHub 업로드용 폴더는 ncore_web\github_upload_ready_2026-03-19 이다.
```
