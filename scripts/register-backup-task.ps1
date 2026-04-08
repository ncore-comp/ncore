param(
  [string]$TaskName = "NCORE_Firestore_Backup_Daily",
  [string]$StartTime = "12:05"
)

$ProjectRoot = "D:\MYDOC\Desktop\vscode\Web\firebase\ncore_web\ncore-main"
$CmdPath = Join-Path $ProjectRoot "scripts\backup-firestore.cmd"

if (!(Test-Path $CmdPath)) {
  throw "백업 실행 파일을 찾을 수 없습니다: $CmdPath"
}

$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"`"cd /d $ProjectRoot && call $CmdPath`"`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday,Tuesday,Wednesday,Thursday,Friday -At $StartTime
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description "NCORE Firestore weekday backup" `
  -Force

Write-Host "작업 스케줄러 등록 완료: $TaskName (평일 $StartTime)"
