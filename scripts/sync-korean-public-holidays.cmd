@echo off
setlocal
cd /d "%~dp0.."
node scripts\sync-korean-public-holidays.js %*
