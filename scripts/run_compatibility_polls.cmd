@echo off
REM ---------------------------------------------------------------------------
REM Compatibility poll publisher: publishes one compatibility poll per run,
REM linked to one of the 5 keyword articles, then commit + push so Vercel
REM redeploys.  Run this from a scheduler (Task Scheduler or Cline schedule)
REM once a day until all 5 compatibility polls are published.
REM
REM Usage:
REM   run_compatibility_polls.cmd          -> real run (publish + commit + push)
REM   run_compatibility_polls.cmd --dry-run -> preview the next step only
REM ---------------------------------------------------------------------------
setlocal

set "ROOT=C:\Users\saonb\coupleinbond"
set "PYTHON=C:\Users\saonb\AppData\Local\Microsoft\WindowsApps\python.exe"
set "LOGDIR=%LOCALAPPDATA%\coupleinbond\logs"
set "LOG=%LOGDIR%\compatibility_polls.log"

set "PATH=C:\Program Files\nodejs;C:\Program Files\Git\cmd;%PATH%"

if not exist "%LOGDIR%" mkdir "%LOGDIR%"

cd /d "%ROOT%"

echo. >> "%LOG%"
echo ========================================================= >> "%LOG%"
echo %DATE% %TIME%  args=[%*] >> "%LOG%"
echo ========================================================= >> "%LOG%"

"%PYTHON%" "%ROOT%\scripts\compatibility_polls.py" --commit --push %* >> "%LOG%" 2>&1
set "RC=%ERRORLEVEL%"

echo exit code: %RC% >> "%LOG%"
endlocal & exit /b %RC%
