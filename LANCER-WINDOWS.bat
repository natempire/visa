@echo off
echo ============================================
echo   FIDEA - Gestion des Missions VISA
echo   Version avec base de donnees serveur
echo ============================================
echo.

cd /d "%~dp0"

echo [1/3] Installation des dependances (serveur)...
cd server
call npm install
cd ..

echo.
echo [2/3] Installation des dependances (interface)...
call npm install

echo.
echo [3/3] Demarrage...
echo.
echo Le serveur demarre sur http://localhost:3001
echo L'interface demarre sur http://localhost:3000
echo.
echo Ne fermez pas cette fenetre.
echo.

start "FIDEA Serveur" cmd /k "cd /d "%~dp0server" && node index.js"
timeout /t 3 /nobreak >nul
start "FIDEA Interface" cmd /k "cd /d "%~dp0" && npm start"

echo Demarrage en cours...
pause
