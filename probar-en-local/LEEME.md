# Probar el Gestor de pedidos en tu ordenador

Esta guía es para probar la aplicación en tu propio ordenador, sin tocar la web de Agloval.
Todo funciona en local: **ningún correo sale de tu ordenador** y nada de lo que hagas llega a nadie.

## Qué necesitas

Solo **Docker Desktop** (gratuito), en Mac o en Windows.

1. Descárgalo de https://www.docker.com/products/docker-desktop/ e instálalo. Si ya lo tenías, actualízalo a la última versión.
2. Ábrelo una vez y acepta las condiciones. Puedes saltarte el registro ("Skip").
   En Windows, la primera instalación puede pedirte reiniciar el ordenador o instalar "WSL": acepta lo que te proponga.
3. Espera a que abajo a la izquierda ponga **"Engine running"** (en verde).

## Arrancar

**Primero descomprime el zip** (doble clic en Mac; en Windows, botón derecho → "Extraer todo") en una carpeta normal, por ejemplo `Documentos`. No lo abras directamente desde dentro del zip. Después entra en la carpeta `probar-en-local`.

### En Mac

Haz doble clic en **`Arrancar-Mac.command`**.

Si macOS dice que *no se puede abrir porque procede de un desarrollador no identificado*:

- Pulsa **"Hecho"** o **"Cancelar"**.
- Ve a **Ajustes del Sistema → Privacidad y seguridad**, baja hasta abajo y pulsa **"Abrir igualmente"** junto a `Arrancar-Mac.command`.
- Vuelve a hacer doble clic y confirma con **"Abrir"**.

### En Windows

Haz doble clic en **`Arrancar-Windows.bat`**.

Si aparece *"Windows protegió tu PC"*, pulsa **"Más información"** y después **"Ejecutar de todas formas"**.

### Qué pasa al arrancar

Se abre una ventana negra con texto. **La primera vez tarda varios minutos**: descarga lo necesario y carga la tarifa de Agloval. Las siguientes veces tarda unos segundos.

Cuando termina, se abre el navegador con la aplicación. Si no se abre, entra tú en:

- **Aplicación:** http://localhost:8580
- **Buzón de correos:** http://localhost:8581

Puedes cerrar la ventana negra: la aplicación sigue funcionando.

## Qué probar

1. Elige una familia y un producto, pon medidas y cantidad, y añádelo al pedido.
2. Pulsa **"Confirmar"**, rellena tus datos y elige **Presupuesto** o **Pedido**.
3. Verás una ventana con un tick verde que te confirma lo que has hecho.
4. Abre el **buzón** (http://localhost:8581) para ver los correos que se habrían enviado:
   - Un **presupuesto** solo genera el correo para el cliente.
   - Un **pedido** genera el correo para el cliente y el aviso para Agloval (`pedidos@agloval.local`).
5. En **"Presupuestos"** y **"Pedidos"** (arriba) tienes el historial. Desde un presupuesto puedes **"Pasar a pedido"**.

Puedes inventarte los datos del cliente: los correos nunca salen del buzón local.

## Apagar

Haz doble clic en **`Parar-Mac.command`** o en **`Parar-Windows.bat`**. Los presupuestos y pedidos que hayas hecho se conservan para la próxima vez.

## Si algo falla

- **"No encuentro Docker"** o **"Docker Desktop no está en marcha"**: abre Docker Desktop, espera a que ponga *Engine running* y vuelve a arrancar.
- **"unknown flag: --wait"**: tu Docker Desktop es antiguo. Actualízalo y vuelve a arrancar.
- **"port is already allocated"**: otro programa usa el puerto 8580 u 8581. Ciérralo o reinicia el ordenador y vuelve a arrancar.
- **Cualquier otro error**: copia el texto de la ventana negra y envíaselo a Borja.

> **Importante:** este zip lleva la tarifa real de Agloval con sus precios. No lo reenvíes ni lo subas a ningún sitio.
