@echo off
rem Apaga el Gestor de pedidos de Agloval. Los presupuestos, pedidos y la tarifa se conservan.
cd /d "%~dp0.."

echo Apagando el Gestor de pedidos de Agloval...
docker compose -f docker-compose.local.yml stop
if errorlevel 1 (
  echo No se pudo apagar. Esta Docker Desktop abierto?
) else (
  echo Apagado. Para volver a usarlo, abre Arrancar-Windows.bat.
)
echo.
pause
