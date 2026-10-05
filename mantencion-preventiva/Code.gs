/**
 * Agenda de Mantención Preventiva – SDO Rent
 *
 * Web app de Google Apps Script vinculada a la planilla "Agenda Mantención Preventiva".
 *  - El cliente abre el link, ve los bloques de 2 horas libres (lun–vie, 9:00–17:00)
 *    y reserva uno.
 *  - La disponibilidad se lee del calendario de quien publica la app
 *    (josecano@sdorent.cl): cualquier evento en ese horario ocupa el bloque.
 *  - Cada reserva crea el evento en ese mismo calendario, invita al cliente
 *    si dejó su correo, y queda registrada en la pestaña "Agendamientos".
 *
 * Primera vez: ejecutar setup() desde el editor y autorizar los permisos.
 */

const CFG = {
  BLOCKS: [[9, 11], [11, 13], [13, 15], [15, 17]], // bloques de 2 horas
  LEAD_DAYS: 1,        // anticipación mínima: desde mañana
  WINDOW_DAYS: 45,     // días hacia adelante que se ofrecen
  TZ: 'America/Santiago',
  HOLIDAYS_CAL: 'es.cl#holiday@group.v.calendar.google.com',
  TITLE: 'Mantención preventiva',
  SHEET: 'Agendamientos'
};

const COLS = ['Código', 'Creado', 'Fecha', 'Bloque', 'Nombre', 'Teléfono', 'Correo', 'Dirección', 'Comuna', 'Equipos / comentario', 'ID evento', 'Estado'];

// ---------------------------------------------------------------- configuración

function setup() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(CFG.SHEET) || ss.getSheets()[0].setName(CFG.SHEET);
  sh.getRange(1, 1, 1, COLS.length).setValues([COLS]).setFontWeight('bold');
  sh.setFrozenRows(1);
  Logger.log('Calendario donde se agenda: %s', cal_().getName());
}

/** Calendario donde se lee la disponibilidad y se crean las visitas. */
function cal_() {
  const id = PropertiesService.getScriptProperties().getProperty('CAL_ID');
  return (id && CalendarApp.getCalendarById(id)) || CalendarApp.getDefaultCalendar();
}

// ---------------------------------------------------------------- web

function doGet(e) {
  const p = (e && e.parameter) || {};
  // Datos opcionales para pre-llenar el formulario (?nombre=…&dir=…&comuna=…)
  const prefill = { name: p.nombre || '', address: p.dir || '', comuna: p.comuna || '' };
  const t = HtmlService.createTemplateFromFile('Index');
  t.boot = JSON.stringify({ prefill }).replace(/</g, '\\u003c');
  return t.evaluate()
    .setTitle('Agenda tu mantención preventiva · SDO Rent')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ---------------------------------------------------------------- disponibilidad

function dayKey_(d) { return Utilities.formatDate(d, CFG.TZ, 'yyyy-MM-dd'); }
function at_(key, hour) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, hour, 0);
}

/** Intervalos ocupados por día, en minutos desde medianoche. */
function busyByDay_(from, to) {
  const out = {};
  const day = k => (out[k] = out[k] || { blocks: [], closed: '' });
  cal_().getEvents(from, to).forEach(ev => {
    if (ev.isAllDayEvent()) return; // recordatorios de día completo no bloquean
    try { if (ev.getMyStatus() === CalendarApp.GuestStatus.NO) return; } catch (err) {}
    for (let d = new Date(ev.getStartTime()); d < ev.getEndTime(); d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      const k = dayKey_(d);
      const s = dayKey_(ev.getStartTime()) === k ? ev.getStartTime().getHours() * 60 + ev.getStartTime().getMinutes() : 0;
      const e = dayKey_(ev.getEndTime()) === k ? ev.getEndTime().getHours() * 60 + ev.getEndTime().getMinutes() : 24 * 60;
      day(k).blocks.push([s, e]);
    }
  });
  const hol = CalendarApp.getCalendarById(CFG.HOLIDAYS_CAL);
  if (hol) hol.getEvents(from, to).forEach(ev => { day(dayKey_(ev.getStartTime())).closed = ev.getTitle(); });
  return out;
}

function blocksFor_(key, busy) {
  const b = busy[key] || { blocks: [], closed: '' };
  return CFG.BLOCKS.map(([h1, h2]) => ({
    s: h1, e: h2,
    free: !b.closed && !b.blocks.some(([s, e]) => h1 * 60 < e && h2 * 60 > s)
  }));
}

/** Llamado desde la página: días hábiles con sus bloques. */
function getSlots() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const from = new Date(today); from.setDate(from.getDate() + CFG.LEAD_DAYS);
  const to = new Date(today); to.setDate(to.getDate() + CFG.WINDOW_DAYS + 1);
  const busy = busyByDay_(from, to);
  const days = {};
  for (let d = new Date(from); d < to; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const k = dayKey_(d);
    days[k] = { blocks: blocksFor_(k, busy), closed: (busy[k] && busy[k].closed) || '' };
  }
  return { from: dayKey_(from), to: dayKey_(new Date(to.getTime() - 864e5)), days };
}

// ---------------------------------------------------------------- reserva

/** Llamado desde la página al confirmar. */
function book(f) {
  f = f || {};
  const clean = s => String(s || '').trim().slice(0, 400);
  const d = {
    date: clean(f.date), start: Number(f.start),
    name: clean(f.name), phone: clean(f.phone), email: clean(f.email),
    address: clean(f.address), comuna: clean(f.comuna), note: clean(f.note)
  };
  const block = CFG.BLOCKS.find(b => b[0] === d.start);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date) || !block) throw new Error('Elige un día y un bloque horario.');
  if (d.name.length < 3) throw new Error('Escribe tu nombre completo.');
  if (d.phone.replace(/\D/g, '').length < 8) throw new Error('Escribe un teléfono válido.');
  if (d.email && !/^\S+@\S+\.\S+$/.test(d.email)) throw new Error('Revisa el correo.');
  if (d.address.length < 5) throw new Error('Escribe la dirección de la propiedad.');

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const start = at_(d.date, block[0]);
    const end = at_(d.date, block[1]);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const minDay = new Date(today); minDay.setDate(minDay.getDate() + CFG.LEAD_DAYS);
    if (start.getDay() === 0 || start.getDay() === 6 || start < minDay) throw new Error('Ese día no está disponible.');
    const dayStart = at_(d.date, 0), dayEnd = new Date(dayStart.getTime() + 864e5);
    const slot = blocksFor_(d.date, busyByDay_(dayStart, dayEnd)).find(x => x.s === block[0]);
    if (!slot || !slot.free) throw new Error('Ese bloque se acaba de ocupar. Elige otro, por favor.');

    const code = 'MP-' + Utilities.formatDate(new Date(), CFG.TZ, 'MMdd') + '-' + Math.floor(100 + Math.random() * 900);
    const where = d.address + (d.comuna ? ', ' + d.comuna : '');
    const desc = [
      CFG.TITLE + ' agendada por el cliente',
      'Código: ' + code,
      'Cliente: ' + d.name,
      'Teléfono: ' + d.phone,
      d.email ? 'Correo: ' + d.email : '',
      'Dirección: ' + where,
      d.note ? 'Equipos / comentario: ' + d.note : ''
    ].filter(Boolean).join('\n');
    const ev = cal_().createEvent(CFG.TITLE + ' · ' + where, start, end, {
      description: desc, location: where,
      guests: d.email, sendInvites: !!d.email
    });

    SpreadsheetApp.getActive().getSheetByName(CFG.SHEET).appendRow([
      code, new Date(), d.date, block[0] + ':00 – ' + block[1] + ':00', d.name, "'" + d.phone, d.email,
      d.address, d.comuna, d.note, ev.getId(), 'Agendada'
    ]);
    return { code, date: d.date, start: block[0], end: block[1], where, name: d.name, invited: !!d.email };
  } finally {
    lock.releaseLock();
  }
}
