@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Chua tim thay Node.js. Hay cai Node.js roi mo lai file nay.
  pause
  exit /b 1
)
if not exist "node_modules\ws\package.json" goto install_node
if not exist "node_modules\tiktok-live-connector\package.json" goto install_node
goto check_game

:install_node
echo Dang cai thu vien game lan dau, can mang Internet...
call npm ci --no-audit --no-fund
if errorlevel 1 (
  echo Khong cai duoc thu vien. Kiem tra mang roi mo lai file nay.
  pause
  exit /b 1
)

:check_game
node tools\check-game.js
if errorlevel 4 goto ask_live
if errorlevel 3 goto update
if errorlevel 2 (
  echo Cong 3000 dang bi ung dung khac su dung. Khong mo them server.
  pause
  exit /b 1
)
if not errorlevel 1 goto open_control
goto start_game

:ask_live
echo Co ban cap nhat moi, nhung game dang noi TikTok.
choice /c YN /m "Khoi dong lai se ngat TikTok vai giay. Khoi dong lai ngay"
if errorlevel 2 goto open_control

:update
echo Co ban cap nhat moi. Dang khoi dong lai game, diem phien van duoc giu...
node tools\restart-game.js
if errorlevel 1 (
  pause
  exit /b 1
)
goto start_game

:open_control
echo Game da chay ban moi nhat. Dang mo bang dieu khien...
start "" "http://127.0.0.1:3000/control"
exit /b 0

:start_game
echo Dang chay game. Mo http://127.0.0.1:3000/control de dieu khien.
echo Tat cua so nay de dung server.
tools\vieneu\.venv\Scripts\python.exe -c "import vieneu" >nul 2>nul
if errorlevel 1 (
  python --version >nul 2>nul
  if errorlevel 1 (
    echo Chua tim thay Python. Cai Python va tich o "Add python.exe to PATH" roi mo lai file nay.
    pause
    exit /b 1
  )
  echo Dang cai giong doc VieNeu lan dau, mat vai phut...
  powershell -NoProfile -ExecutionPolicy Bypass -File tools\vieneu\setup.ps1
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep 4; Start-Process 'http://127.0.0.1:3000/control'"
node server.js
pause
