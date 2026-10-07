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

Impresión AUTOMÁTICA PENDIENTE de definir impresora y conexión. Desde administración se puede abrir el ticket y usar el diálogo de impresión del navegador. El navegador no confirma que el papel haya salido. Para las primeras pruebas, mantener administración abierta en la computadora y pulsar Consultar para actualizar pedidos.

## Respaldos

Cerrar la app con Ctrl+C antes de copiar la carpeta de datos a una ubicación de respaldo. Respaldar a diario y antes de cambios. No copiar solo el archivo principal mientras está funcionando, porque SQLite usa archivos WAL. La base contiene nombres de clientes; limitar el acceso a sus copias.

## Pruebas

    npm test

Las pruebas usan una carpeta temporal, independiente de los datos reales.

## Pendiente antes del servicio real

Probar la tablet y red física, integrar impresora automática de cocina, configurar inicio automático de Windows y respaldo, confirmar zona horaria del restaurante. Esta versión es para validar el flujo, no está lista para operar cocina sin esos pasos. La pantalla final se limpia a los 25 segundos; la limpieza por abandono del carrito todavía no está implementada.
