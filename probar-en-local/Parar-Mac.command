#!/bin/bash
# Apaga el Gestor de pedidos de Agloval. Los presupuestos, pedidos y la tarifa se conservan.
cd "$(dirname "$0")/.." || exit 1
export PATH="$PATH:/usr/local/bin:/opt/homebrew/bin:/Applications/Docker.app/Contents/Resources/bin"

echo "Apagando el Gestor de pedidos de Agloval..."
status=0
if docker compose -f docker-compose.local.yml stop; then
  echo "Apagado. Para volver a usarlo, abre Arrancar-Mac.command."
else
  status=1
  echo "No se pudo apagar. ¿Está Docker Desktop abierto?"
fi
echo
read -r -p "Pulsa Enter para cerrar esta ventana." || true
exit "$status"
