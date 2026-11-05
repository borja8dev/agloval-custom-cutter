#!/bin/bash
# Arranca el Gestor de pedidos de Agloval en este ordenador (solo necesita Docker Desktop).
cd "$(dirname "$0")/.." || exit 1
export PATH="$PATH:/usr/local/bin:/opt/homebrew/bin:/Applications/Docker.app/Contents/Resources/bin"

APP_URL="http://localhost:8580"
COMPOSE="docker compose -f docker-compose.local.yml"

fail() {
  echo
  echo "ERROR: $1"
  echo
  read -r -p "Pulsa Enter para cerrar esta ventana."
  exit 1
}

echo "=== Gestor de pedidos de Agloval ==="
echo

if ! command -v docker >/dev/null 2>&1; then
  fail "No encuentro Docker. Instala Docker Desktop (https://www.docker.com/products/docker-desktop/), ábrelo y vuelve a abrir este archivo."
fi

if ! docker info >/dev/null 2>&1; then
  echo "Abriendo Docker Desktop..."
  open -a Docker 2>/dev/null
  for _ in $(seq 1 60); do
    docker info >/dev/null 2>&1 && break
    sleep 3
  done
  docker info >/dev/null 2>&1 || fail "Docker Desktop no termina de arrancar. Ábrelo a mano, espera a que esté en marcha y vuelve a abrir este archivo."
fi

echo "Preparando la aplicación. La primera vez tarda unos minutos (descarga y carga la tarifa)..."
echo
$COMPOSE up -d --build --wait --wait-timeout 900 || fail "No se pudo arrancar. Copia el texto de esta ventana y envíaselo a Borja."

open "$APP_URL"
echo
echo "Listo. La aplicación está abierta en tu navegador: $APP_URL"
echo "Los correos que envía (presupuestos y pedidos) llegan aquí: http://localhost:8581"
echo "Para apagarla, abre Parar-Mac.command."
echo
read -r -p "Pulsa Enter para cerrar esta ventana (la aplicación sigue funcionando)."
