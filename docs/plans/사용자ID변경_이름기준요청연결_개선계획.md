# 사용자ID변경 이름기준 요청연결 개선계획
# User ID Change Name-Based Request Linking Improvement Plan

- 작성 일자: 2026-04-06
- 상태: 계획 수립 / Planned
- 기준 버전: `v120`

## 문제 요약
## Problem Summary

### 한국어
- 현재 연차/시간차/반차 요청의 소유자 연결은 `request.userId === user.id`를 기본으로 계산합니다.
- 그런데 과거에 사용자 로그인 ID를 바꾸면, 기존 요청 문서의 `userId`는 예전 값으로 남아 있을 수 있습니다.
- 이 경우 현재 사용자 카드와 과거 요청 장부가 서로 다른 사람으로 인식되어,
  - 사용 연차 합산
  - 승인 대기 합산
  - 개인 요청 목록
  - 개인 달력 일부 표시
  에 누락이 생길 수 있습니다.

### English
- The system currently links leave/time-off requests by `request.userId === user.id`.
- When a user's login ID changes, older request documents may still keep the old `userId`.
- That can split the current user card and historical requests into different identities, causing missing data in:
  - used leave totals
  - pending totals
  - personal request lists
  - some personal calendar views

## 이번 개선의 핵심 방향
## Core Direction

### 한국어
- 기본 연결 규칙은 계속 `id 기준`을 유지합니다.
- 단, `id`가 맞지 않는 과거 요청에 대해서는 **이름 exact match**를 보조 연결 규칙으로 사용합니다.
- 즉:
  1. 먼저 `request.userId === user.id` 확인
  2. 불일치하면 `request.userName === user.name` 확인
  3. 둘 중 하나가 맞으면 같은 사람으로 간주

### English
- Keep the primary ownership rule as `id-based`.
- For legacy requests that no longer match by id, add an **exact name match** as a fallback.
- In other words:
  1. First check `request.userId === user.id`
  2. If not matched, check `request.userName === user.name`
  3. If either matches, treat the request as belonging to that user

## 왜 이 방식이 맞는가
## Why This Approach Fits

### 한국어
- 사용자는 `id`를 변경할 수 있지만, 현재 운영 규칙상 `이름`은 절대값으로 취급합니다.
- 따라서 과거 요청을 일괄 이관하지 않아도, 읽기 계층에서 이름 기준 fallback을 두면 기존 장부를 즉시 되살릴 수 있습니다.
- 즉 이 방식은 `과거 우편물은 이름표 기준으로 전달받게 하는 임시 우편전달 규칙`에 가깝습니다.

### English
- Users may change `id`, but under the current operating rule the `name` is treated as stable.
- That means we can restore historical linkage immediately at the read layer without first migrating all old requests.
- This is effectively a temporary mail-forwarding rule based on the person's stable name label.

## 적용 범위
## Scope

### 1. 연차/시간차 사용량 합산
### 1. Leave/Time-off Usage Aggregation

### 한국어
- `recalcUsedHours()`에 이름 fallback 적용
- `usedHours`, `pendingHours` 계산에 반영

### English
- Apply name fallback to `recalcUsedHours()`
- Reflect it in `usedHours` and `pendingHours`

### 2. 개인 화면 요청 조회
### 2. Personal Request Lookup

### 한국어
- 개인 대시보드 최근 신청
- 개인 요청 목록
- 개인 달력(`개인` 탭)
- 개인 잔업/특근 신청 장부

### English
- Personal dashboard recent requests
- Personal request list
- Personal calendar (`개인` tab)
- Personal work report apply board

### 3. 직원 카드/현황 카드 계산
### 3. Employee Status/Card Calculations

### 한국어
- 잔여 연차 카드
- 사용 퍼센트 게이지
- 특별휴가 편집과는 별개로 일반 연차 사용량 계산에 반영

### English
- Remaining leave card
- Usage percentage gauge
- Applies to ordinary leave usage calculation, separate from special leave editing

## 적용하지 않을 범위
## Out of Scope

### 한국어
- 요청 문서의 `userId`를 즉시 일괄 수정하는 데이터 마이그레이션
- 동명이인 해결
- 이름 변경 허용 정책
- 승인권한 범위 재설계

### English
- Immediate bulk migration of old `request.userId` values
- Duplicate-name resolution
- Name-change policy redesign
- Approval-scope redesign

## 구현 방식
## Implementation Strategy

### 한국어
- 분산된 비교식을 전부 직접 바꾸지 않고, **공통 소유자 판별 함수**를 먼저 만듭니다.
- 예시 함수:
  - `app.requestBelongsToUser(req, user)`
- 판별 규칙:
  - 1차: `String(req.userId) === String(user.id)`
  - 2차: `security.cleanText(req.userName) === security.cleanText(user.name)`

### English
- Instead of changing scattered comparisons one by one, first add a **shared ownership helper**.
- Example helper:
  - `app.requestBelongsToUser(req, user)`
- Matching rules:
  - Primary: `String(req.userId) === String(user.id)`
  - Fallback: `security.cleanText(req.userName) === security.cleanText(user.name)`

## 우선 적용 위치
## Priority Application Points

### 한국어
1. `recalcUsedHours()`
2. 개인용 요청 필터
3. 개인 달력 필터
4. 개인 잔업/특근 장부 필터
5. 필요 시 관리자 상세 화면 일부

### English
1. `recalcUsedHours()`
2. Personal request filters
3. Personal calendar filters
4. Personal work report board filters
5. Some admin detail views if needed

## 위험과 한계
## Risks and Limits

### 한국어
- 동명이인이 생기면 다른 사람 요청까지 같이 묶일 수 있습니다.
- 따라서 이 방식은 **임시 운영 보완책**으로만 봐야 합니다.
- 장기적으로는:
  - 사용자 변경 이력 컬렉션
  - 요청 마이그레이션
  - immutable employee key
  중 하나가 필요합니다.

### English
- If duplicate names appear, requests from different people could be merged incorrectly.
- So this should be treated as a **temporary operational fallback**, not the final identity model.
- Long term, one of these is needed:
  - user ID history collection
  - request migration
  - immutable employee key

## 운영 안전장치
## Operational Safeguards

### 한국어
- 이름 fallback은 `읽기/계산`에만 적용하고, 신규 저장은 계속 현재 `user.id`를 사용합니다.
- 즉 새로운 요청은 정상 id로 쌓이고, 과거 요청만 이름 기준으로 보조 연결합니다.
- 필요하면 이후 로그에 `legacyNameFallbackHit` 같은 디버그 표시를 추가할 수 있습니다.

### English
- Apply the name fallback only to `read/calculation` paths; keep new writes using the current `user.id`.
- That means new requests accumulate under the proper current id, while only old requests use the fallback.
- If needed later, add a debug marker like `legacyNameFallbackHit` in logs.

## 완료 기준
## Done Criteria

### 한국어
- `최은지(id=3)` 같은 ID 변경 사용자의 과거 승인 연차가 잔여 연차 카드에 반영된다
- 개인 달력/개인 요청 목록에서도 과거 요청이 같은 사람 요청으로 보인다
- 새로 생성되는 요청은 계속 현재 `id`로 저장된다
- 동명이인 해결은 별도 과제로 남긴다

### English
- Historical approved leave for an ID-changed user like `최은지(id=3)` appears in the remaining leave card
- Personal calendar and personal request lists also show those old requests as belonging to the same person
- Newly created requests continue to save under the current `id`
- Duplicate-name handling remains a separate future task
