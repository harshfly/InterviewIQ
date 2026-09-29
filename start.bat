@echo off
echo ==========================================
echo Starting InterviewIQ - AI Interview Copilot
echo ==========================================

:: Start the Python Backend in a new terminal window
echo Starting Backend (FastAPI)...
start "InterviewIQ Backend" cmd /k "cd /d %~dp0\backend && .\venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"

:: Start the React Frontend in a new terminal window
echo Starting Frontend (React/Vite)...
start "InterviewIQ Frontend" cmd /k "cd /d %~dp0\apps\web && npm run dev"

echo.
echo Both servers are starting up!
echo The app will be available at http://localhost:5173
echo Close this window when you're done.
pause
