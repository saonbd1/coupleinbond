@echo off
REM ---------------------------------------------------------------------------
REM Daily Couple in Bond publisher: 1 poll + 1 companion article, then commit
REM and push (Vercel redeploys automatically).
REM
REM Cadence is deliberately slow: the poll bank in daily_polls.py is a fixed
REM list, and publishing two entries a day recycled all of it in 15 days.
REM
REM Usage (from Task Scheduler):
REM   run_daily_polls.cmd              -> real run (generate + commit + push)
REM   run_daily_polls.cmd --dry-run    -> verify the scheduled environment only
REM
REM Output is appended to a log OUTSIDE the repo so it never shows up as an
REM untracked file in git status.
REM ---------------------------------------------------------------------------
setlocal

set "ROOT=C:\Users\saonb\coupleinbond"
REM The bare WindowsApps\python.exe is a Store *alias stub*: when no Store
REM build is registered it prints "Python was not found" and exits 49. The
REM versioned alias is the one that resolves to the real 3.13 interpreter.
set "PYTHON=C:\Users\saonb\AppData\Local\Microsoft\WindowsApps\python3.13.exe"
set "LOGDIR=%LOCALAPPDATA%\coupleinbond\logs"
set "LOG=%LOGDIR%\daily_polls.log"

rem Task Scheduler runs with a reduced PATH; make sure the node + git the
rem generator shells out to (validation, commit, push) are reachable.
set "PATH=C:\Program Files\nodejs;C:\Program Files\Git\cmd;%PATH%"

if not exist "%LOGDIR%" mkdir "%LOGDIR%"

rem Fail loudly into the log instead of cd'ing into a path that moved.
if not exist "%ROOT%\scripts\daily_polls.py" (
  echo FATAL: repo not found at "%ROOT%" - update ROOT in this file. >> "%LOG%"
  endlocal & exit /b 2
)
if not exist "%PYTHON%" (
  echo FATAL: interpreter not found at "%PYTHON%" - update PYTHON in this file. >> "%LOG%"
  endlocal & exit /b 2
)

cd /d "%ROOT%"

echo. >> "%LOG%"
echo ========================================================= >> "%LOG%"
echo %DATE% %TIME%  args=[%*] >> "%LOG%"
echo ========================================================= >> "%LOG%"

"%PYTHON%" "%ROOT%\scripts\daily_polls.py" --count 1 --commit --push %* >> "%LOG%" 2>&1
set "RC=%ERRORLEVEL%"

echo exit code: %RC% >> "%LOG%"
endlocal & exit /b %RC%
