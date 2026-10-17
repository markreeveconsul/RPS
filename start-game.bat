@echo off
cd /d "%~dp0"
echo Starting Rock Papers Rumble server...
start "" cmd /c "timeout /t 2 >nul & start http://127.0.0.1:4174"
node server\server.cjs
pause
