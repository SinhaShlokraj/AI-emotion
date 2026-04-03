@echo off
title MindSense AI - Frontend
echo ============================================
echo   MindSense AI - Opening Frontend
echo ============================================
echo.
echo Make sure the backend is running first!
echo Backend: run start_backend.bat
echo.
start "" "%~dp0frontend\index.html"
echo Frontend opened in browser!
pause
