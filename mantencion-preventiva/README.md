# Agenda de Mantención Preventiva

Instrumento de agendamiento conectado a la planilla **Agenda Mantención Preventiva** de Google Drive
(pestaña **Coordinación**, con los 68 arrendatarios del proveedor MS).

Cada arrendatario recibe su **link personal** por WhatsApp o correo. Al abrirlo ve su propiedad y los bloques
de 2 horas libres (lunes a viernes: **09–11, 11–13, 13–15, 15–17**) según el calendario de `josecano@sdorent.cl`.
Cuando reserva:

- se crea el evento **"Mantención Preventiva MS – Dirección Ddepto (Nombre)"** en el calendario, con invitación a
  `ventas@maestrosoluciones.cl` (y al arrendatario si deja su correo);
- su fila en **Coordinación** se actualiza: *Estado coordinación* = Agendado, *Fecha visita*, *Franja horaria*,
  *Fecha 1er contacto* (si estaba vacía) y una nota en *Observaciones*;
- el bloque queda ocupado para los demás. Se vuelve a validar con un bloqueo antes de guardar, para que no haya dos reservas en el mismo bloque.

Si vuelve a abrir su link, ve su visita actual y puede cambiarla: el evento anterior se borra y se crea el nuevo.
Si su estado es *Enviado a MS*, *Realizado* o *No realizado*, la página no le deja reagendar.

Cualquier evento de tu calendario ocupa el bloque en que cae. Los de día completo y los que rechazaste no bloquean, y los feriados de Chile se bloquean solos.

## Archivos

| Archivo | Qué es |
|---|---|
| `Code.gs` | Servidor: menú, links personales, disponibilidad, reserva y actualización de la planilla |
| `Index.html` | Página del arrendatario (si se abre fuera de Google, funciona en modo demostración) |
| `appsscript.json` | Zona horaria de Santiago; app web pública que se ejecuta con tu cuenta |

## Puesta en marcha (una vez)

1. Abre la planilla **Agenda Mantención Preventiva** en Google Drive (`josecano@sdorent.cl`) y entra a **Extensiones → Apps Script**.
2. Pega `Code.gs` en `Código.gs`, crea un archivo HTML llamado `Index` y pega `Index.html`.
   En **Configuración del proyecto**, activa "Mostrar appsscript.json" y pega `appsscript.json`.
3. **Implementar → Nueva implementación → Aplicación web** con "Ejecutar como: **Yo**" y "Acceso: **Cualquier usuario**". Autoriza los permisos.
4. Vuelve a la planilla y recárgala. Aparece el menú **Agenda**:
   - **Configurar (una vez)**:
     - le pone a la primera hoja el nombre *Coordinación*;
     - agrega las columnas *Link agenda*, *WhatsApp + link*, *Token* e *ID evento* (las dos últimas quedan ocultas);
     - aplica formato a las fechas y montos;
     - crea la hoja *Listas*, con estados y bloques de 2 horas, y pone las listas desplegables;
     - crea la hoja *Resumen*, con el avance por estado y por comuna, que se actualiza sola.
   - **Generar links para arrendatarios**: llena *Link agenda* y *WhatsApp + link* en cada fila.

Para contactar a un arrendatario, haz clic en **Enviar** de la columna *WhatsApp + link*. Se abre WhatsApp con este mensaje:

> Hola {nombre}, te escribimos de SDO Rent para coordinar la mantención preventiva de tu departamento en {dirección}, depto {depto}.
> Elige el día y el bloque horario que te acomode aquí: {link}
> Las visitas son de lunes a viernes entre 9:00 y 17:00, en bloques de 2 horas. ¡Gracias!

Para enviarlo por correo, copia el *Link agenda* de la fila.

## Ajustes

- **Bloques, anticipación y días hacia adelante**: `CFG` al inicio de `Code.gs`. Después de editar, usa **Implementar → Administrar implementaciones → Editar → Nueva versión** para mantener la misma URL.
- **Correo del proveedor**: propiedad del script `PROVEEDOR_EMAIL` (por defecto `ventas@maestrosoluciones.cl`).
- **URL distinta**: si *Generar links* no encuentra la URL, guárdala en la propiedad del script `WEBAPP_URL`.
