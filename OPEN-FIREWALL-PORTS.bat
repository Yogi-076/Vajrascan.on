@echo off
echo =====================================================
echo    VAPT Framework - Network Firewall Setup
echo =====================================================
echo.
echo This script allows other devices on your WI-FI to 
echo connect to VajraScan.
echo.
echo [+] Opening port 3001 (Backend API)...
powershell -Command "New-NetFirewallRule -DisplayName 'VAPT Backend 3001' -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue" 2>nul
if errorlevel 0 echo     Port 3001 - OK

echo [+] Opening port 8081 (Frontend UI)...
powershell -Command "New-NetFirewallRule -DisplayName 'VAPT Frontend 8081' -Direction Inbound -LocalPort 8081 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue" 2>nul
if errorlevel 0 echo     Port 8081 - OK

echo.
echo DONE! Now restart LAUNCH-VAPT.bat and open:
echo   http://192.168.0.121:8081/scanner
echo on any device connected to the same Wi-Fi.
echo.
pause
