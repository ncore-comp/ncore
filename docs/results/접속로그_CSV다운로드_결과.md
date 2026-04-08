# 접속로그 CSV 다운로드 결과

## 상태
- 완료

## 반영 내용
- 운영실 `최근 접속 로그` 카드에 `CSV 다운로드` 버튼 추가
- 버튼 클릭 시 현재 화면 20건이 아니라 `accessLogs` 전체를 CSV로 다운로드
- 최신순 정렬 기준:
  - `sortTimestamp`
- CSV는 `UTF-8 BOM` 포함으로 생성

## 수정 파일
- [functions/src/repositories/firestore/accessLogRepo.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/functions/src/repositories/firestore/accessLogRepo.js)
- [functions/src/services/adminOpsService.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/functions/src/services/adminOpsService.js)
- [functions/src/handlers/adminOpsHandlers.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/functions/src/handlers/adminOpsHandlers.js)
- [functions/index.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/functions/index.js)
- [js/core_logic_new_design_v114_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/core_logic_new_design_v114_codex.js)
- [js/ui_logic_new_design_v114_codex.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/js/ui_logic_new_design_v114_codex.js)

## 배포
- `functions + hosting` 운영 반영 완료

## 검증
- 검증 스크립트:
  - [scripts/verify-accesslog-csv-download.js](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/scripts/verify-accesslog-csv-download.js)
- 리포트:
  - [reports/verify-accesslog-csv-download-last.json](/D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/reports/verify-accesslog-csv-download-last.json)

### 검증 결과
1. 운영실 CSV 다운로드 버튼 표시 확인
2. 전체 `accessLogs` CSV 응답 성공
3. 행 수:
   - `2371`
4. CSV 헤더 확인
   - `timestamp,userName,userId,type,ip,detail,sortTimestamp`
5. UTF-8 BOM 포함 확인

## 메모
- 다운로드는 항상 전체 로그 기준
- 최근 20건은 화면 표시용일 뿐, CSV에는 전체 로그가 포함됨
- 로그 다운로드 자체도 서버 로그(`AccessLogCsvDownload`)로 남음
