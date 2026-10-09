# Taquería El Primo

Primera versión local. Requiere Node.js 24 o superior. Sin paquetes externos.

## Iniciar en Windows

En la terminal de VS Code, dentro de esta carpeta:

    npm start

Abrir http://localhost:3000 para pedidos y http://localhost:3000/admin para crear la contraseña de administrador (mínimo 10 caracteres). La configuración inicial solo se permite desde la computadora del servidor.

Desde una tablet en la misma red, abrir http://IP-DE-LA-COMPUTADORA:3000. Consultar la IPv4 con `ipconfig`. Si Windows pide acceso de red, permitir únicamente redes privadas. No publicar este puerto en internet. Evitar redes de invitados que aíslan dispositivos. La computadora debe mantenerse encendida, sin suspensión.

## Datos y funcionamiento

La base SQLite se guarda en `%LOCALAPPDATA%\TaqueriaElPrimo\primo.sqlite`, fuera de OneDrive. Los importes se calculan en centavos en el servidor y conservan los precios históricos. Los consecutivos son únicos por fecha de America/Chicago. `PRIMO_TIMEZONE` permite configurar la zona del servidor; la vista administrativa usa America/Chicago.

No se registran pagos ni se calculan impuestos. Se muestra subtotal y Tax not included. Los reportes excluyen cancelaciones y muestran su cantidad por separado. Las órdenes canceladas no liberan su número.

Impresión automática mediante Zebra USB ZDesigner ZD621-203dpi ZPL, etiquetas 4 x 6 pulgadas a 203 dpi. El servidor manda ZPL a la cola RAW de Windows. PRIMO_PRINTER permite cambiar el nombre exacto de la cola, pero este formato solo es para Zebra compatible con ZPL a 203 dpi. No usar este adaptador con Star. Las órdenes antiguas no se imprimen automáticamente. Pedidos largos usan varias etiquetas numeradas. PRIMO_PRINT_MODE=disabled desactiva el procesamiento de cola para pruebas. Administración muestra el último envío y permite reimprimir sin crear otra orden. Consultar actualiza el estado. Enviada a Windows no significa salida física: una impresora desconectada puede retener el trabajo. Revisar la cola de Windows y el papel antes de reimprimir; no hay reintentos automáticos tras errores o interrupciones ambiguas. Cancelar una orden no retira un trabajo ya enviado a Windows.

## Respaldos

Cerrar la app con Ctrl+C antes de copiar la carpeta de datos a una ubicación de respaldo. Respaldar a diario y antes de cambios. No copiar solo el archivo principal mientras está funcionando, porque SQLite usa archivos WAL. La base contiene nombres de clientes; limitar el acceso a sus copias.

## Pruebas

    npm test

Las pruebas usan una carpeta temporal, independiente de los datos reales.

## Pendiente antes del servicio real

Probar la tablet y red física, validar físicamente la impresión automática de cocina, configurar inicio automático de Windows y respaldo, confirmar zona horaria del restaurante. Esta versión es para validar el flujo, no está lista para operar cocina sin esos pasos. La pantalla final se limpia a los 25 segundos; la limpieza por abandono del carrito todavía no está implementada.

## Activar una actualización
Detener el servidor anterior con Ctrl+C y volver a ejecutar node server.mjs. Recargar los navegadores. La cola persistente se crea automáticamente al arrancar sin borrar órdenes.

## Etiqueta de prueba USB
Ejecutar node print-test.mjs imprime una etiqueta de ejemplo sin guardar una orden. Requiere la Zebra instalada y conectada. Las pruebas de npm test nunca usan la impresora real.

