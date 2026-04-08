# employeeNo 기준키 전환 계획
# EmployeeNo-Based Identity Key Migration Plan

- 작성 일자: 2026-04-06
- 상태: 계획 수립 / Planning
- 대상 경로: `D:\MYDOC\Desktop\vscode\Web\firebase\ncore_web\ncore-main`

## 1. 문제 정의
## 1. Problem Definition

### 한국어
- 현재 시스템은 `users.id` 와 `requests.userId` 를 사람 연결의 기본 키로 사용합니다.
- 하지만 `id/loginId` 는 운영 중 변경될 수 있습니다.
- 이 때문에 과거 요청이 옛 `userId` 에 남아 있으면,
  - 연차 사용량 계산
  - 승인 대기 계산
  - 개인 달력
  - 개인 요청 목록
  - 잔업/특근 개인 장부
  에서 누락이 발생할 수 있습니다.

### English
- The system currently links people mainly by `users.id` and `requests.userId`.
- However, `id/loginId` can change during operations.
- If historical requests keep the old `userId`, the system can miss data in:
  - leave usage totals
  - pending totals
  - personal calendar
  - personal request lists
  - personal work report boards

## 2. 목표
## 2. Goal

### 한국어
- 사람을 식별하는 **내부 기준키**를 `employeeNo` 로 통일합니다.
- `id/loginId` 는 로그인용, 변경 가능한 값으로 둡니다.
- `name` 은 표시용으로만 사용합니다.
- 즉:
  - `employeeNo` = 내부 불변 키
  - `id/loginId` = 로그인 키
  - `name` = 화면 표시 이름

### English
- Standardize the **internal identity key** on `employeeNo`.
- Keep `id/loginId` as mutable login credentials.
- Use `name` only as a display field.
- In short:
  - `employeeNo` = immutable internal key
  - `id/loginId` = login key
  - `name` = display name

## 3. 현재 데이터 상태
## 3. Current Data State

### 한국어
- `Users` 기준 현재 사용자 수는 `37명`
- `employeeNo` 보유 수는 `35건`
- 중복 `employeeNo` 는 `0건`
- 즉 전환 방향은 적절하지만, **누락된 2건을 먼저 채워야** 안전하게 전환할 수 있습니다.

### English
- Total users: `37`
- Users with `employeeNo`: `35`
- Duplicate `employeeNo`: `0`
- This means the migration direction is good, but the **2 missing values must be filled first**.

## 4. 전환 원칙
## 4. Migration Principles

### 한국어
1. 새 저장부터 `employeeNo` 를 같이 기록합니다.
2. 읽기/계산은 한동안 `employeeNo 우선 + 기존 id 보조` 로 운영합니다.
3. 기존 데이터는 별도 마이그레이션으로 천천히 정리합니다.
4. 전환 완료 전까지 `id` 를 즉시 제거하지 않습니다.

### English
1. Start recording `employeeNo` on all new writes.
2. For a transition period, read/calculate using `employeeNo first + legacy id fallback`.
3. Clean historical data through a separate migration.
4. Do not remove `id` immediately before the migration is completed.

## 5. 단계별 전환 계획
## 5. Phased Migration Plan

### 1단계. employeeNo 필수화 준비
### Phase 1. Prepare EmployeeNo as Required

### 한국어
- 사용자 관리 화면에서 `employeeNo` 미입력 저장 차단
- 신규 사용자 생성 시 `employeeNo` 필수
- 기존 사용자 중 누락 2건 보완
- `employeeNo` 중복 검증 추가

### English
- Block saves when `employeeNo` is missing in user management
- Require `employeeNo` for new users
- Fill the 2 missing existing values
- Add duplicate validation for `employeeNo`

### 2단계. 읽기/계산 계층 병행 지원
### Phase 2. Parallel Read/Calculation Support

### 한국어
- 공통 판별 함수 추가
  - 예: `requestBelongsToUser(req, user)`
- 기준:
  1. `req.employeeNo === user.employeeNo`
  2. 없으면 `req.userId === user.id`
- 적용 위치:
  - `recalcUsedHours()`
  - 개인 요청 목록
  - 개인 달력
  - 잔업/특근 개인 장부

### English
- Add a shared helper
  - Example: `requestBelongsToUser(req, user)`
- Matching order:
  1. `req.employeeNo === user.employeeNo`
  2. fallback to `req.userId === user.id`
- Apply to:
  - `recalcUsedHours()`
  - personal request lists
  - personal calendar
  - personal work report board

### 3단계. 신규 저장 구조 변경
### Phase 3. Change New Write Structure

### 한국어
- 새 요청 저장 시 `requests.employeeNo` 추가 저장
- 새 사용자별 특별휴가 저장 시 `userSpecialLeaves.employeeNo` 추가 저장
- 메일 라우트 등 사용자 참조 구조도 장기적으로 `employeeNo` 대응 필드 검토

### English
- Save `requests.employeeNo` on new requests
- Save `userSpecialLeaves.employeeNo` on new user special leave records
- Review user-reference structures like mail routes for long-term `employeeNo` support

### 4단계. 기존 데이터 마이그레이션
### Phase 4. Historical Data Migration

### 한국어
- 기존 `requests`
  - `userId -> employeeNo` 매핑 보강
  - `employeeNo` 필드 일괄 채움
- 기존 `userSpecialLeaves`
  - `employeeNo` 일괄 채움
- 마이그레이션 로그 남기기

### English
- Backfill `employeeNo` on historical `requests`
- Backfill `employeeNo` on historical `userSpecialLeaves`
- Keep migration logs for auditability

### 5단계. 최종 전환
### Phase 5. Final Switch

### 한국어
- 주요 계산과 연결의 기본 기준을 `employeeNo` 로 변경
- `id/userId` 는 로그인/레거시 호환용으로만 남김
- 필요 시 읽기 fallback 점진 제거

### English
- Switch the main linking/calculation key to `employeeNo`
- Keep `id/userId` only for login and legacy compatibility
- Remove fallback rules gradually if safe

## 6. 영향을 받는 영역
## 6. Affected Areas

### 한국어
- 사용자 카드 / 연차 잔여 계산
- 개인 요청 목록 / 개인 달력
- 승인 흐름 일부
- 잔업/특근 개인/관리자 현황
- 사용자별 특별휴가
- 메일 라우트 참조
- 로그 / 감사 추적

### English
- user cards / leave remaining calculations
- personal request list / personal calendar
- parts of approval flow
- work report personal/admin views
- user special leave
- mail-route references
- logs / audit tracking

## 7. 당장 바꾸지 않을 것
## 7. Not Changing Immediately

### 한국어
- 로그인은 계속 `id/loginId` 사용
- 화면 표시 이름은 계속 `name` 사용
- 동명이인 대응은 이번 단계에서 하지 않음
- 기존 문서 ID 자체를 다 바꾸는 작업은 보류

### English
- Login continues to use `id/loginId`
- Display name continues to use `name`
- Duplicate-name handling is not part of this phase
- Rewriting all document IDs is deferred

## 8. 위험 요소
## 8. Risks

### 한국어
- `employeeNo` 누락 사용자 2명 처리 전에는 전환이 불완전합니다
- `requests.employeeNo` 와 `userSpecialLeaves.employeeNo` 를 같이 안 넣으면 전환 중 혼합 상태가 길어집니다
- 일부 레거시 비교식이 남으면 부분적으로만 고쳐진 것처럼 보일 수 있습니다

### English
- Migration remains incomplete until the 2 missing `employeeNo` values are filled
- If `requests.employeeNo` and `userSpecialLeaves.employeeNo` are not both added, the mixed state will last longer
- If some legacy comparisons remain, the fix may look only partially effective

## 9. 추천 구현 순서
## 9. Recommended Implementation Order

### 한국어
1. `employeeNo` 누락/중복 검사 추가
2. 공통 판별 함수(`employeeNo 우선`) 추가
3. `recalcUsedHours()` 와 개인 요청/달력부터 적용
4. 신규 저장 시 `employeeNo` 같이 저장
5. 기존 데이터 마이그레이션 스크립트 작성/실행
6. 이후 승인/메일/특별휴가/잔업특근 세부 경로 확대

### English
1. Add `employeeNo` missing/duplicate validation
2. Add a shared helper with `employeeNo-first` matching
3. Apply it first to `recalcUsedHours()` and personal request/calendar views
4. Save `employeeNo` on new writes
5. Build and run migration scripts for historical data
6. Expand to approvals/mail/special leave/work report paths

## 10. 완료 기준
## 10. Done Criteria

### 한국어
- ID를 바꾼 사용자도 과거 연차/시간차/반차 사용량이 정상 합산된다
- 새 요청은 `employeeNo` 를 함께 저장한다
- `employeeNo` 가 없는 사용자는 저장되지 않는다
- 동명이인 이슈를 제외하면, 사람 연결 기준이 더 이상 `id 변경` 때문에 깨지지 않는다

### English
- Users whose IDs changed still get correct historical leave/time-off totals
- New requests save `employeeNo`
- Users without `employeeNo` cannot be saved
- Except for duplicate-name edge cases, person linkage no longer breaks when `id` changes
