# Agenda de Mantención Preventiva

Página donde el cliente elige el día y un bloque de 2 horas para la visita de mantención preventiva.
La disponibilidad se lee del calendario de `josecano@sdorent.cl`, y cada reserva se agenda ahí mismo.

- Lunes a viernes, bloques **09–11, 11–13, 13–15 y 15–17**.
- Un bloque se ofrece solo si no hay ningún evento en el calendario en ese horario (los eventos rechazados y los de día completo no bloquean).
- Los feriados de Chile se bloquean automáticamente.
- Desde mañana y hasta 45 días hacia adelante.
- Al reservar, se crea el evento "Mantención preventiva · dirección" en el calendario. Si el cliente deja su correo, recibe la invitación.
- Cada reserva queda también en la pestaña **Agendamientos** de la planilla.
- Dos personas no pueden tomar el mismo bloque: la reserva se vuelve a validar con un bloqueo antes de crear el evento.

## Archivos

| Archivo | Qué es |
|---|---|
| `Code.gs` | Servidor: disponibilidad, reserva y registro en la planilla |
| `Index.html` | Página del cliente (funciona en modo demostración si se abre fuera de Google) |
| `appsscript.json` | Manifiesto: zona horaria de Santiago, web app pública que se ejecuta con tu cuenta |

## Publicarla (una sola vez, ~5 minutos)

1. Abre la planilla **Agenda Mantención Preventiva** en Google Drive (`josecano@sdorent.cl`).
2. Menú **Extensiones → Apps Script**.
3. Borra el contenido de `Código.gs` y pega `Code.gs`. Crea un archivo HTML llamado `Index` (**+ → HTML**) y pega `Index.html`.
4. En **Configuración del proyecto** (engranaje), marca "Mostrar el archivo de manifiesto appsscript.json" y pega `appsscript.json`.
5. Selecciona la función `setup` y presiona **Ejecutar**. Autoriza los permisos (calendario y planilla).
6. **Implementar → Nueva implementación → Aplicación web**. Ejecutar como: **Yo**. Quién tiene acceso: **Cualquier usuario**. Presiona **Implementar** y copia la URL (termina en `/exec`).

Esa URL es el link para compartir por correo o WhatsApp.

Opcional: el link acepta datos para dejar el formulario prellenado, por ejemplo
`…/exec?nombre=Camila%20Rojas&dir=Santa%20Elisa%20490%20D1004&comuna=Santiago`.

### Usar otro calendario

Por defecto se usa el calendario principal de la cuenta que publica. Para usar otro, por ejemplo "Servicio Mantención preventiva",
agrega en **Configuración del proyecto → Propiedades del script** la propiedad `CAL_ID` con el ID del calendario.

### Cambiar horarios

Edita `CFG` al inicio de `Code.gs` (bloques, anticipación, días hacia adelante) y vuelve a implementar
(**Implementar → Administrar implementaciones → editar → Nueva versión**) para mantener la misma URL.

## Mensaje sugerido para WhatsApp o correo

> Hola {nombre}, te escribimos de SDO Rent para coordinar la mantención preventiva de tu propiedad.
> Elige el día y el bloque horario que te acomode aquí: {link}
> Atendemos de lunes a viernes de 9:00 a 17:00. ¡Gracias!
