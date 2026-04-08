$ErrorActionPreference = "Stop"

$root = "D:\MYDOC\Desktop\vscode\Web\firebase\ncore_web\ncore-main"
$github = Join-Path (Join-Path $root "legacy") "정리_깃허브용_2026-03-26"
$firestore = Join-Path (Join-Path $root "legacy") "정리_파이어스토어작업용_2026-03-26"

function Reset-Target($path) {
    Get-ChildItem $path -Force |
        Where-Object { $_.Name -ne "README.md" } |
        Remove-Item -Recurse -Force
}

Reset-Target $github
Reset-Target $firestore

$githubFiles = @(
    ".firebaserc",
    "firebase.json",
    "firestore.rules",
    "index.html",
    "gemini-svg.svg",
    "package.json",
    "package-lock.json",
    "깃허브_vs_파이어스토어_개념정리.md",
    "handoff.md",
    "이후_작업_정리.md"
)

foreach ($f in $githubFiles) {
    $src = Join-Path $root $f
    if (Test-Path $src) {
        Copy-Item $src $github -Force
    }
}

Get-ChildItem $root -File -Filter "*.md" | ForEach-Object {
    if ($_.DirectoryName -eq $root) {
        Copy-Item $_.FullName $github -Force
    }
}

robocopy (Join-Path $root "js") (Join-Path $github "js") /E /NFL /NDL /NJH /NJS /NP | Out-Null
robocopy (Join-Path $root "scripts") (Join-Path $github "scripts") /E /NFL /NDL /NJH /NJS /NP | Out-Null
robocopy (Join-Path $root "functions") (Join-Path $github "functions") /E /XD node_modules /NFL /NDL /NJH /NJS /NP | Out-Null

$firestoreFiles = @(
    ".firebaserc",
    "firebase.json",
    "firestore.rules",
    "깃허브_vs_파이어스토어_개념정리.md",
    "백업_자동화_계획.md",
    "백업_자동화_결과.md",
    "백업_복구_리허설_계획.md",
    "백업_복구_리허설_결과.md",
    "백업_복구_리허설_메모.md",
    "공휴일_동기화_범위_계획.md",
    "공휴일_동기화_범위_결과.md",
    "읽기사용량_절감_계획.md",
    "읽기사용량_절감_결과.md"
)

foreach ($f in $firestoreFiles) {
    $src = Join-Path $root $f
    if (Test-Path $src) {
        Copy-Item $src $firestore -Force
    }
}

$scriptDst = Join-Path $firestore "scripts"
New-Item -ItemType Directory -Path $scriptDst -Force | Out-Null

$firestoreScripts = @(
    "backup-firestore.js",
    "backup-firestore.cmd",
    "import-firestore.js",
    "compare-firestore.js",
    "sync-korean-public-holidays.js",
    "sync-korean-public-holidays.cmd",
    "run-backup-rehearsal.js",
    "run-backup-rehearsal.cmd",
    "register-backup-task.ps1",
    "register-backup-task.cmd"
)

foreach ($f in $firestoreScripts) {
    $src = Join-Path (Join-Path $root "scripts") $f
    if (Test-Path $src) {
        Copy-Item $src $scriptDst -Force
    }
}

$backupDst = Join-Path $firestore "backups"
New-Item -ItemType Directory -Path $backupDst -Force | Out-Null

$backupFiles = @(
    "backup-history.json",
    "firestore-backup-summary-latest.json",
    "firestore-backup-snapshot-2026-03-24T23-44-27-630Z.json"
)

foreach ($f in $backupFiles) {
    $src = Join-Path (Join-Path $root "backups") $f
    if (Test-Path $src) {
        Copy-Item $src $backupDst -Force
    }
}

Write-Output "완료"
Write-Output "GitHubReady=$github"
Write-Output "FirestoreReady=$firestore"

