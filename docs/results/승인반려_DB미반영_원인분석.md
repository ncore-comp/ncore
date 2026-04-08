> 시간 기록 기준: Asia/Seoul
> 문서 최초 작성 시각(파일 기준): 2026-03-25 08:04:37
> 문서 최근 수정 시각(파일 기준): 2026-03-25 08:04:37
# 승인/반려 DB 미반영 원인 분석

업데이트: 2026-03-25

## 1. 현상

- 연차 신청 후 승인/반려 버튼을 누르면
- 화면에서는 승인/반려된 것처럼 보임
- 메일도 정상 발송됨
- 하지만 새로고침하면 다시 `결재 대기`로 돌아감

즉, 화면 임시 상태는 바뀌지만 실제 Firestore DB 상태는 바뀌지 않는 증상이다.

## 2. 원인 요약

쉽게 비유하면:

- 결재 도장을 찍어야 하는데
- 서버 문지기가 그 요청을 `관리자 수정 펜`으로 착각해서
- 서류 상태는 그대로 두고 통과만 시킨 상태

핵심 원인은 `requestPolicy.js`의 판정 순서다.

## 3. 상세 원인

### 3-1. 승인/반려보다 `admin_edit`가 먼저 잡힘

파일:

- [functions/src/policies/requestPolicy.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/functions/src/policies/requestPolicy.js)

문제 구간:

- `getRequestMutationMode()` 안에서
- `canManageTargetUserForActor(actorUser, targetUser)`가 true이면
- `approve/reject` 판정보다 먼저 `admin_edit`를 반환하고 있음

즉 관리자나 승인권자가 결재 버튼을 눌러도,
서버는 그 요청을 `결재`가 아니라 `일반 수정`으로 해석할 수 있다.

### 3-2. `admin_edit`는 상태를 유지함

같은 파일의 `buildRequestPayloadForWrite()`에서

- `mutationMode === "admin_edit"`인 경우
- `status`를 `currentRequest.status` 그대로 유지함

즉 현재 상태가 `pending`이면
결재 요청을 받아도 실제 저장은 계속 `pending`으로 남는다.

### 3-3. 프런트는 임시로 상태를 바꿔 보임

파일:

- [js/ui_logic_new_design_v114_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_logic_new_design_v114_codex.js)

`processReq()` 흐름에서

- 승인/반려 클릭 시
- 메모리 안의 `req.status`를 먼저 바꿔서 화면에 반영함

그래서 즉시 화면은 승인/반려된 것처럼 보이지만,
서버(DB)는 실제로 `pending`이라 새로고침하면 다시 결재 대기로 보인다.

## 4. 영향 범위

영향 가능 항목:

1. 승인
2. 반려
3. 취소 승인
4. 취소 반려

즉 `approve/reject/cancel_approve/cancel_reject` 계열 전체를 같이 점검해야 한다.

## 5. 수정 방향

추천 수정 원칙:

1. `approve/reject/cancel_approve/cancel_reject` 판정을 `admin_edit`보다 먼저 처리
2. `admin_edit`는 상태가 바뀌지 않는 경우에만 허용

쉽게 말하면:

- 결재 도장은 항상 수정 펜보다 우선
- 상태를 바꾸는 요청은 무조건 결재 규칙을 먼저 타야 함

## 6. 수정 후 검증 계획

1. `pending -> approved`가 DB에 실제 반영되는지 확인
2. `pending -> rejected`가 DB에 실제 반영되는지 확인
3. `cancel_requested -> cancelled`가 DB에 실제 반영되는지 확인
4. `cancel_requested -> approved`가 DB에 실제 반영되는지 확인
5. 새로고침 후에도 상태가 유지되는지 확인

## 7. 결론

이번 문제는 `결재 기능`이 저장되지 않는 것이 아니라,
`관리자 수정 기능 추가 후 결재 요청이 잘못된 mutationMode(admin_edit)로 분류되는 버그`다.
