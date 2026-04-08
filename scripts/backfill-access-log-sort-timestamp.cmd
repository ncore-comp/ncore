@echo off
cd /d %~dp0..
node .\scripts\backfill-access-log-sort-timestamp.js
