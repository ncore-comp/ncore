$ErrorActionPreference = "Stop"

$root = "D:\MYDOC\Desktop\vscode\Web\firebase\ncore_web"
$main = Join-Path $root "ncore-main"
$target = Join-Path $root ("github_upload_ready_" + (Get-Date -Format "yyyy-MM-dd"))

if (Test-Path $target) {
    Remove-Item -LiteralPath $target -Recurse -Force
}

New-Item -ItemType Directory -Path $target | Out-Null

$rootFiles = @(
    ".firebaserc",
    "firebase.json",
    "firestore.rules",
    "index.html",
    "gemini-svg.svg",
    "package.json",
    "package-lock.json",
    "handoff.md",
    "이후_작업_정리.md"
)

foreach ($name in $rootFiles) {
    $src = Join-Path $main $name
    if (Test-Path $src) {
        Copy-Item -LiteralPath $src -Destination $target -Force
    }
}

$dirsToCopy = @("functions", "js", "scripts", "docs", "gs")
foreach ($dir in $dirsToCopy) {
    $src = Join-Path $main $dir
    $dst = Join-Path $target $dir
    if (Test-Path $src) {
        robocopy $src $dst /E /XD node_modules /NFL /NDL /NJH /NJS /NP | Out-Null
    }
}

$readme = @"
# github_upload_ready_$(Get-Date -Format "yyyy-MM-dd")

현재 `ncore-main` 기준 GitHub 업로드용 정리 패키지입니다.

포함:
- functions
- js
- scripts
- docs
- gs
- index.html
- firebase.json
- firestore.rules
- .firebaserc
- package.json
- package-lock.json
- handoff.md
- 이후_작업_정리.md

제외:
- node_modules
- .firebase
- backups
- legacy
- reports
- 서비스 계정 키 JSON
- Ncore_DB.xlsx
- firestore-debug.log
- temp_ui_situation_v133_from_host.js
"@

Set-Content -LiteralPath (Join-Path $target "README.md") -Value $readme -Encoding UTF8

Write-Output "완료"
Write-Output "Target=$target"
