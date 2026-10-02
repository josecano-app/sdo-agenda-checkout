# Agenda de Checkout

Página para que el arrendatario elija el día y la hora de la recepción (checkout) de su departamento.

- `index.html`: archivo único, sin dependencias. Ábrelo en el navegador o publícalo en GitHub Pages.
- **Vista arrendatario**: calendario de lunes a viernes, sin feriados, con bloques de 1 hora entre 9:00 y 17:30. Se completa en 3 pasos: día, hora y datos.
- **Vista administración**: entregas ordenadas por día, botón para asignar a Julio, botón para copiar cada entrega en formato para el staging, y un generador del mensaje para WhatsApp o correo.

Link personalizado por propiedad:

```
https://<dominio>/?prop=Depto%201204&dir=Av.%20Providencia%201234&nombre=Camila%20Rojas
```

> Esto es una **prueba**: las reservas se guardan solo en el navegador (localStorage), y los horarios ocupados son simulados.
> Para usarla de verdad hay que conectarla a un almacenamiento compartido, por ejemplo Google Sheets o Google Calendar.

Los horarios, la duración y los feriados se configuran en el bloque `CFG` / `HOLIDAYS` al inicio del script.
