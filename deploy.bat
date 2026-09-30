@echo off
REM ============================================
REM  Anakyn Gems - publish web
REM
REM  Vercel is connected to this repo now, so publishing
REM  = commit + push. Vercel builds it automatically.
REM  No "vercel login", no token, no local build.
REM
REM  Usage: double-click, or:  deploy "what changed"
REM
REM  NOTE: keep this file ASCII-only. cmd.exe reads it as
REM  OEM code page - Thai text in ECHO lines comes out garbled.
REM ============================================
setlocal
cd /d D:\Anakyngems\AnakynMobile

set "MSG=%~1"
if "%MSG%"=="" set "MSG=update web"

echo.
echo [1/3] changes to publish:
git status --short
if errorlevel 1 goto fail

echo.
echo [2/3] committing...
git add -A
REM  nothing to commit is not an error - maybe you only need to push
git diff --cached --quiet && (
  echo     nothing new to commit
) || (
  git commit -m "%MSG%" || goto fail
)

echo.
echo [3/3] pushing to GitHub...
git push
if errorlevel 1 goto fail

echo.
echo ==========================================
echo   PUSHED - Vercel is building now
echo   Site is live in ~2-4 min:
echo   https://anakyngems.vercel.app
echo.
echo   Watch the build here:
echo   https://vercel.com/anakyngems/anakyngems
echo ==========================================
pause
exit /b 0

:fail
echo.
echo ==========================================
echo   FAILED - see the error above
echo ==========================================
echo.
echo   "rejected / non-fast-forward"  ^> someone pushed first:
echo       git pull --rebase
echo       then run this file again
echo.
echo   "could not read Username"      ^> git has no GitHub access:
echo       ask for help, do not paste passwords here
echo.
pause
exit /b 1
