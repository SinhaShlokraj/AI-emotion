@echo off
title MindSense AI - Backend Server
echo ============================================
echo   MindSense AI - Starting Backend Server
echo ============================================
echo.
cd /d "%~dp0backend"
echo Installing/checking dependencies...
pip install -r requirements.txt --quiet
echo.
echo Starting FastAPI server on http://localhost:8001
echo API Docs available at http://localhost:8001/docs
echo.
echo Press Ctrl+C to stop the server.
echo.
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
pause
