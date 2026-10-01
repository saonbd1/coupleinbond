@echo off
REM ---------------------------------------------------------------------------
REM Daily Couple in Bond publisher: 2 polls + 2 companion articles, then commit
REM and push (Vercel redeploys automatically).
REM
REM Usage (from Task Scheduler):
REM   run_daily_polls.cmd              -> real run (generate + commit + push)
REM   run_daily_polls.cmd --dry-run    -> verify the scheduled environment only
REM
REM Output is appended to a log OUTSIDE the repo so it never shows up as an
REM untracked file in git status.
REM ---------------------------------------------------------------------------
setlocal

set "ROOT=C:\Users\saonb\git\coupleinbond"
set "PYTHON=C:\Users\saonb\AppData\Local\Microsoft\WindowsApps\python.exe"
set "LOGDIR=%LOCALAPPDATA%\coupleinbond\logs"
set "LOG=%LOGDIR%\daily_polls.log"

rem Task Scheduler runs with a reduced PATH; make sure the node + git the
rem generator shells out to (validation, commit, push) are reachable.
set "PATH=C:\Program Files\nodejs;C:\Program Files\Git\cmd;%PATH%"

if not exist "%LOGDIR%" mkdir "%LOGDIR%"

cd /d "%ROOT%"

echo. >> "%LOG%"
echo ========================================================= >> "%LOG%"
echo %DATE% %TIME%  args=[%*] >> "%LOG%"
echo ========================================================= >> "%LOG%"

"%PYTHON%" "%ROOT%\scripts\daily_polls.py" --count 2 --commit --push %* >> "%LOG%" 2>&1
set "RC=%ERRORLEVEL%"

echo exit code: %RC% >> "%LOG%"
endlocal & exit /b %RC%
