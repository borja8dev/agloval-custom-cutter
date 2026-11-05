@echo off
rem Arranca el Gestor de pedidos de Agloval en este ordenador (solo necesita Docker Desktop).
cd /d "%~dp0.."

echo === Gestor de pedidos de Agloval ===
echo.

where docker >nul 2>&1
if errorlevel 1 (
  echo ERROR: No encuentro Docker. Instala Docker Desktop desde
  echo https://www.docker.com/products/docker-desktop/ , abrelo y vuelve a abrir este archivo.
  pause
  exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
  echo ERROR: Docker Desktop no esta en marcha. Abrelo, espera a que diga
  echo "Engine running" y vuelve a abrir este archivo.
  pause
  exit /b 1
)

echo Preparando la aplicacion. La primera vez tarda unos minutos (descarga y carga la tarifa)...
echo.
docker compose -f docker-compose.local.yml up -d --build --wait --wait-timeout 900
if errorlevel 1 (
  echo.
  echo ERROR: No se pudo arrancar. Copia el texto de esta ventana y enviaselo a Borja.
  pause
  exit /b 1
)

start "" http://localhost:8580
echo.
echo Listo. La aplicacion esta abierta en tu navegador: http://localhost:8580
echo Los correos que envia (presupuestos y pedidos) llegan aqui: http://localhost:8581
echo Para apagarla, abre Parar-Windows.bat.
echo.
pause
