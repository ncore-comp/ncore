시간 기록 기준: Asia/Seoul
문서 최초 작성 시각(기록 기준): 2026-03-26 12:55:00
문서 최근 수정 시각(기록 기준): 2026-03-26 12:55:00

# GitHub vs Firestore 개념 정리

## 한 줄 비유

- `GitHub` = 설계도/소스코드를 보관하는 창고
- `Firestore` = 실제 운영 중인 장부 데이터가 들어있는 창고

## GitHub에는 무엇을 올리나

GitHub에는 보통 아래를 올립니다.

- 화면 파일
- 서버 코드
- Firebase 설정 파일
- 운영 문서
- 점검/백업/비교용 스크립트

즉 `프로그램 그 자체`를 올리는 곳입니다.

예:
- `index.html`
- `js/`
- `functions/`
- `firebase.json`
- `firestore.rules`
- `scripts/`

## Firestore에는 무엇을 올리나

Firestore는 **파일을 올리는 곳이 아닙니다.**

Firestore에는 실제 데이터가 들어갑니다.

예:
- 직원(users)
- 연차 신청(requests)
- 게시판 글(boardPosts)
- 휴일(holidays)
- 메일 라우트(mailRoutes)

즉 Firestore는 `파일 저장소`가 아니라 `데이터베이스`입니다.

## 그럼 Firestore 작업 파일은 뭐냐

Firestore에 직접 넣는 파일이 아니라,
Firestore 데이터를 다루기 위해 쓰는 **도구 파일**이 있습니다.

예:
- 백업 스크립트
- 복구(import) 스크립트
- 비교(compare) 스크립트
- 공휴일 동기화 스크립트

즉 `Firestore 작업용 파일`은
`Firestore에 업로드하는 파일`이 아니라
`Firestore 데이터를 읽고/백업하고/복구하는 도구`입니다.

## 백업은 어떻게 이해하면 되나

- `백업 파일(JSON)` = 장부 복사본
- `import-firestore.js` = 그 복사본을 다시 Firestore에 넣는 도구
- `compare-firestore.js` = 장부 원본과 현재 상태를 대조하는 도구

## 중요한 구분

### GitHub에 올리면 안 되는 것

- Firebase 관리자 키 JSON
- 실제 백업 원본 전체
- 개인 정보가 들어간 민감 파일
- `node_modules`
- `.firebase`

### Firestore에 직접 올리는 개념이 아닌 것

- `index.html`
- `functions/index.js`
- `js/*.js`

이런 건 Firestore에 들어가는 게 아니라
Firebase Hosting / Functions로 배포되는 파일입니다.

## 이번에 정리한 두 폴더 의미

### `정리_깃허브용_2026-03-26`

- GitHub에 올려도 되는 소스/설정/문서만 모아둔 폴더

### `정리_파이어스토어작업용_2026-03-26`

- Firestore 데이터를 다루는 데 쓰는 스크립트/문서/백업 예시를 모아둔 폴더
- 이 폴더 안 파일을 Firestore에 직접 올리는 것이 아니라,
  이 파일들을 이용해 Firestore를 관리하는 것입니다.
