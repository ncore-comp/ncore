> 시간 기록 기준: Asia/Seoul
> 문서 최초 작성 시각(기록 기준): 2026-03-27 08:48:00
> 문서 최근 수정 시각(기록 기준): 2026-03-27 08:48:00

# load_data 응답 최소화 결과

## 1. 목적

- 로그인한 사용자에게 필요 이상의 전체 데이터를 내려주지 않도록 1차 축소
- 마스터는 기존처럼 전체 가시성 유지
- 일반 직원은 자기 업무에 필요한 데이터 중심으로만 응답

쉽게 말하면:
- 전에는 큰 서류박스를 통째로 줬고,
- 지금은 역할별로 필요한 서류봉투만 나눠주기 시작한 상태다.

## 2. 1차 적용 방향

### 마스터

- 전체 사용자
- 전체 요청
- 전체 mailRoutes
- 전체 userSpecialLeaves

기존과 동일하게 유지

### 일반 직원

- 자기 자신
- 결재선 계산에 필요한 최소 사용자
  - 같은 부서 팀리더
  - 대표
  - 마스터
- 자기 요청만
- 자기 역할에 필요한 mailRoute 1건
- 자기/필요 범위 특별휴가만

### 승인권자/팀리더

- 승인 범위와 팀 현황 범위에 맞는 사용자/요청 데이터
- 예를 들어 `memberStatusScope = all` 이면 넓은 범위를 받는 것이 정상

## 3. 반영 파일

- [functions/src/services/loadService.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/functions/src/services/loadService.js)
- [functions/src/services/authService.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/functions/src/services/authService.js)
- [functions/src/handlers/loadHandlers.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/functions/src/handlers/loadHandlers.js)

## 4. 실제 검증 결과

### 4.1 마스터 계정

테스트:
- `Web관리자(id=0)`

결과:
- `users: 37`
- `userSpecialLeaves: 2`
- `mailRoutes: 4`

즉:
- 마스터는 여전히 전체 데이터를 본다.

### 4.2 일반 직원 계정

테스트:
- `테스트1(id=1)`

boot 결과:
- `users: 4`
- 사용자 목록:
  - `0`
  - `1`
  - `이동진`
  - `이수형`
- `mailRoutes: 1`
- `userSpecialLeaves: 0`

rest 결과:
- `requests: 2`
- `requestUserIds: ['1']`

즉:
- 일반 직원은 자기 요청만 받고,
- 사용자 목록도 결재/메일 계산에 필요한 최소 사용자만 받는다.

### 4.3 팀리더 계정 예시

테스트:
- `박진형`

결과:
- `users: 37`
- `requests: 226`

이유:
- `박진형`은 현재 권한상
  - `approveScope = parts`
  - `memberStatusScope = all`
  로 저장되어 있음
- 따라서 넓은 범위 조회가 현재 체크된 권한 해석상 정상

즉:
- 이 경우는 `응답 최소화 실패`가 아니라
- 실제 체크된 범위가 넓어서 그렇게 내려오는 것이다.

## 5. 의미

이번 1차 적용으로 가장 큰 변화는 아래 두 가지다.

1. 일반 직원에게 `users 전체`, `requests 전체`, `mailRoutes 전체`를 주지 않음
2. 마스터는 기존 전체 가시성 유지

## 6. 아직 남은 개선

- boardPosts도 역할별 최소화할지 검토
- userSpecialLeaves를 일반 직원에게 더 좁게 줄일지 검토
- 운영실/상황판도 화면 진입 시점 분리 구조를 더 강화할지 검토

## 7. 결론

- 5단계 1차 적용 완료
- 일반 직원 과다 데이터 노출은 줄었고
- 마스터의 전체 가시성은 유지됨

한 줄 정리:
- `지금은 마스터는 전체를 보고, 일반 직원은 자기 업무에 필요한 최소 데이터 위주로 받도록 1차 축소가 들어간 상태다.`

## 8. 달력 권한 팀 데이터 보정 (2026-03-27 10:02)

- 원인: 1차 응답 축소에서 `approveScope`, `memberStatusScope`만 팀 범위 계산에 반영되고 `calendarManual`, `calendarParts`, `calendarAll`은 빠져 있었음
- 증상: 달력 탭은 보이지만 해당 팀 요청/사용자 데이터가 내려오지 않아 화면이 비어 보일 수 있었음
- 조치: [functions/src/services/loadService.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/functions/src/services/loadService.js) 에서 달력 권한도 팀 데이터 범위 계산에 포함
- 확인: `최혜리 / 0` 로그인 후 `load_data(rest)` 응답에서 `requestDepts`가 `매뉴얼팀`, `파츠북팀`으로 함께 내려오고, 실제 화면의 `파츠북팀` 탭에도 일정이 표시됨

## 9. 달력 제목 라벨 보정 (2026-03-27 10:18)

- 문제: 달력 내용은 `파츠북팀`으로 바뀌었는데 상단 월 제목은 여전히 `(매뉴얼팀)`으로 남아 있었음
- 조치: [js/ui_logic_new_design_v114_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_logic_new_design_v114_codex.js) 에서 제목 라벨을 `viewer.dept` 고정값이 아니라 현재 달력 탭(`개인/매뉴얼팀/파츠북팀/모두`) 기준으로 표시하도록 수정
- 참고: 브라우저 캐시가 남아 있으면 즉시 반영이 안 보일 수 있으므로 강력 새로고침 후 확인 권장

## 10. 2차 적용 - 특별휴가 / 메일 경로 추가 축소 (2026-03-27 10:42)

- 목적: 화면은 유지하면서 `userSpecialLeaves`, `mailRoutes`를 역할별로 더 줄이기

### 특별휴가(userSpecialLeaves)

- 기존: `visibleUsers` 범위를 기준으로 내려주다 보니, 달력 권한만 넓은 사용자도 다른 팀 특별휴가까지 같이 받을 수 있었음
- 변경:
  - 일반 직원: 자기 특별휴가만
  - 팀원 연차현황 권한자: 팀원 연차현황 범위에 필요한 특별휴가만
  - 운영실/구성원관리/마스터: 전체 유지

### 메일 경로(mailRoutes)

- 기존:
  - 일반 직원: 자기 부서/역할 그룹 1건
  - 운영실 권한자까지 포함한 일부 권한자가 과도하게 전체 mailRoutes를 받을 수 있었음
- 변경:
  - 일반 직원: 자기 부서/역할 그룹 1건
  - 승인권자: 자기 승인 범위에 필요한 부서의 `staff/leader` route만
  - 구성원관리/권한설정 가능자, 마스터: 전체 유지

### 실제 확인

- `테스트1(id=1)`
  - `userSpecialLeaves: 0`
  - `mailRoutes: 1` (`매뉴얼팀:staff`)
- `최혜리 / 0`
  - `userSpecialLeaves: 1`
  - `mailRoutes: 1`
- `박진형 / 0`
  - `mailRoutes: 2` (`파츠북팀:leader`, `파츠북팀:staff`)
- `Web관리자(id=0)`
  - `mailRoutes: 4` 전체 유지

즉:
- 일반 직원/달력 전용 사용자는 필요한 최소 특별휴가와 메일 경로만 받고,
- 승인권자는 자기 승인 범위에 필요한 경로만,
- 마스터는 계속 전체를 봅니다.

## 11. 3차 시작 - 게시판 데이터 분리 (2026-03-27 11:03)

- 목표: 로그인 직후 `rest` 응답에서 게시판 글을 제거하고, 게시판 화면에 들어갈 때만 게시글을 별도 로드
- 조치:
  - [functions/src/services/loadService.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/functions/src/services/loadService.js) 에 `board` scope 추가
  - [js/core_logic_new_design_v114_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/core_logic_new_design_v114_codex.js) 에 `db.loadBoardPosts()` 추가
  - [js/ui_logic_new_design_v114_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_logic_new_design_v114_codex.js) 에서 게시판 진입 시 `ensureBoardPostsLoaded()` 호출

### 검증

- `Web관리자(id=0)` 기준
  - `load_data(rest)` → `boardPosts: 0`
  - `load_data(board)` → `boardPosts: 18`

즉:
- 게시판 글은 더 이상 기본 `rest` 응답에 섞여 내려오지 않고,
- 게시판 화면에 들어갈 때만 따로 로드되기 시작했습니다.

## 12. 3차 진행 - 전체 상황판 데이터 분리 (2026-03-27 10:51)

- 목표: 로그인 직후 `rest` 응답에서 전체 상황판 전용 요청 데이터를 넓게 싣지 않고, `전체 상황판` 화면에 들어갈 때만 별도 로드
- 조치:
  - [functions/src/services/loadService.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/functions/src/services/loadService.js) 에 `situation` scope 추가
  - [js/core_logic_new_design_v114_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/core_logic_new_design_v114_codex.js) 에 `db.loadSituationBoardData()` 추가
  - [js/ui_logic_new_design_v114_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_logic_new_design_v114_codex.js) 에서 전체 상황판 진입 시 `ensureSituationBoardDataLoaded()` 호출

### 검증

- `이수형 / 0`
  - `load_data(rest)` → `meta.scope = rest`
  - `load_data(situation)` → `meta.scope = situation`
  - 실제 `전체 상황판` 버튼 진입 후 화면 정상 표시 확인
- `테스트1(id=1)`
  - `load_data(rest)` → `requests: 2`
  - `load_data(situation)` → `requests: 2`
  - 상황판 권한이 없는 일반 직원은 별도 확장 응답이 없음을 확인

즉:
- 전체 상황판 데이터는 더 이상 기본 `rest` 응답에 자연스럽게 섞여 내려오지 않고,
- `전체 상황판`에 들어갈 때만 `situation` 전용 응답으로 받아오기 시작했습니다.
