/**
 * Agenda de Mantención Preventiva – SDO Rent
 *
 * Instrumento de agendamiento conectado a la planilla consolidada
 * "Mantencion_Preventiva_MS" (pestaña "Coordinación").
 *
 *  - Cada arrendatario recibe un link personal (…/exec?t=<token>) por WhatsApp o correo.
 *  - La página muestra su propiedad y los bloques de 2 horas libres
 *    (lun–vie: 09–11, 11–13, 13–15, 15–17) según el calendario de josecano@sdorent.cl.
 *  - Al reservar:
 *      · crea el evento "Mantención Preventiva MS – …" en ese calendario e invita al proveedor MS;
 *      · actualiza su fila: Estado coordinación = Agendado, Fecha visita, Franja horaria,
 *        Fecha 1er contacto (si estaba vacía) y Observaciones.
 *
 * Menú "Agenda" en la planilla:
 *  - Configurar: prepara columnas y listas (ejecutar una vez).
 *  - Generar links: crea el link personal y el botón de WhatsApp con el mensaje listo para cada fila.
 */

const CFG = {
  SHEET: 'Coordinación',
  BLOCKS: [[9, 11], [11, 13], [13, 15], [15, 17]],
  LEAD_DAYS: 1,          // desde mañana
  WINDOW_DAYS: 30,       // días hacia adelante que se ofrecen
  TZ: 'America/Santiago',
  HOLIDAYS_CAL: 'es.cl#holiday@group.v.calendar.google.com',
  PROVEEDOR_EMAIL: 'ventas@maestrosoluciones.cl', // se puede cambiar con la propiedad PROVEEDOR_EMAIL
  // Estados en que el arrendatario ya no debería reagendar por su cuenta
  CERRADOS: ['Enviado a MS', 'Realizado', 'No realizado']
};

// Columnas existentes de la planilla (se buscan por nombre en la fila de encabezados)
const C = {
  N: 'N°', COMUNA: 'Comuna', DIR: 'Dirección', DEPTO: 'Depto', NOMBRE: 'Arrendatario', CEL: 'Celular',
  ESTADO: 'Estado coordinación', FECHA: 'Fecha visita', FRANJA: 'Franja horaria',
  CONTACTO: 'Fecha 1er contacto', OBS: 'Observaciones'
};
// Columnas nuevas que agrega "Configurar" al final
const NUEVAS = { LINK: 'Link agenda', WA: 'WhatsApp + link', TOKEN: 'Token', EVENTO: 'ID evento' };

// ---------------------------------------------------------------- menú y configuración

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Agenda')
    .addItem('Configurar (una vez)', 'setup')
    .addItem('Generar links para arrendatarios', 'generarLinks')
    .addToUi();
}

function setup() {
  const t = table_();
  const sh = t.sh;
  let col = sh.getLastColumn();
  Object.values(NUEVAS).forEach(name => {
    if (t.col[name] === undefined) {
      col++;
      sh.getRange(t.headRow, col).setValue(name).setFontWeight('bold');
    }
  });
  const tok = table_();
  sh.hideColumns(tok.col[NUEVAS.TOKEN] + 1);
  sh.hideColumns(tok.col[NUEVAS.EVENTO] + 1);

  // Franjas nuevas (bloques de 2 horas) en la hoja "Listas", si existe
  const listas = SpreadsheetApp.getActive().getSheetByName('Listas');
  if (listas) {
    const v = listas.getDataRange().getValues();
    for (let r = 0; r < v.length; r++) {
      const c = v[r].indexOf('Franjas');
      if (c >= 0) {
        const franjas = CFG.BLOCKS.map(franja_).concat(['Todo el día']).map(x => [x]);
        listas.getRange(r + 2, c + 1, Math.max(franjas.length, 5), 1).clearContent();
        listas.getRange(r + 2, c + 1, franjas.length, 1).setValues(franjas);
        break;
      }
    }
  }
  Logger.log('Listo. Calendario: %s', CalendarApp.getDefaultCalendar().getName());
}

function webUrl_() {
  return PropertiesService.getScriptProperties().getProperty('WEBAPP_URL') || ScriptApp.getService().getUrl();
}

function generarLinks() {
  const url = webUrl_();
  if (!url) throw new Error('Primero implementa la app web (Implementar → Nueva implementación → Aplicación web).');
  const t = table_();
  if (t.col[NUEVAS.TOKEN] === undefined) throw new Error('Ejecuta primero "Configurar".');
  let n = 0;
  t.rows.forEach(r => {
    if (!r[C.NOMBRE]) return;
    let token = r[NUEVAS.TOKEN];
    if (!token) {
      token = Utilities.getUuid().replace(/-/g, '').slice(0, 10);
      t.set(r, NUEVAS.TOKEN, token);
    }
    const link = url + '?t=' + token;
    t.sh.getRange(r._row, t.col[NUEVAS.LINK] + 1).setFormula('=HYPERLINK("' + link + '","Abrir agenda")');
    const phone = waPhone_(r[C.CEL]);
    const waCell = t.sh.getRange(r._row, t.col[NUEVAS.WA] + 1);
    if (phone) {
      const text = encodeURIComponent(mensaje_(r, link));
      waCell.setFormula('=HYPERLINK("https://wa.me/' + phone + '?text=' + text + '","Enviar")');
    } else {
      waCell.setValue('Revisar teléfono');
    }
    n++;
  });
  SpreadsheetApp.getActive().toast(n + ' links generados.', 'Agenda');
}

function mensaje_(r, link) {
  const nombre = String(r[C.NOMBRE]).split(' ')[0];
  return 'Hola ' + nombre + ', te escribimos de SDO Rent para coordinar la mantención preventiva de tu departamento en ' +
    r[C.DIR] + ', depto ' + r[C.DEPTO] + '. Elige el día y el bloque horario que te acomode aquí:\n' + link +
    '\n\nLas visitas son de lunes a viernes entre 9:00 y 17:00, en bloques de 2 horas. ¡Gracias!';
}

function waPhone_(cel) {
  const d = String(cel || '').replace(/\D/g, '');
  if (d.length === 11 && d.indexOf('569') === 0) return d;
  if (d.length === 9 && d[0] === '9') return '56' + d;
  if (d.length === 8) return '569' + d;
  return '';
}

// ---------------------------------------------------------------- planilla

/** Lee la hoja Coordinación ubicando la fila de encabezados (la que dice "N°"). */
function table_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(CFG.SHEET);
  if (!sh) throw new Error('No encuentro la hoja "' + CFG.SHEET + '".');
  const v = sh.getDataRange().getValues();
  const h = v.findIndex(row => String(row[0]).trim() === C.N);
  if (h < 0) throw new Error('No encuentro la fila de encabezados (columna "N°").');
  const col = {};
  v[h].forEach((name, i) => { const k = String(name).trim(); if (k && col[k] === undefined) col[k] = i; });
  const rows = [];
  for (let i = h + 1; i < v.length; i++) {
    if (v[i][0] === '' && v[i][col[C.NOMBRE]] === '') continue;
    const o = { _row: i + 1 };
    Object.keys(col).forEach(k => (o[k] = v[i][col[k]]));
    rows.push(o);
  }
  return {
    sh, col, rows, headRow: h + 1,
    set(r, name, value) { if (col[name] !== undefined) sh.getRange(r._row, col[name] + 1).setValue(value); }
  };
}

function findByToken_(t, token) {
  if (!token || t.col[NUEVAS.TOKEN] === undefined) return null;
  return t.rows.find(r => String(r[NUEVAS.TOKEN]) === String(token)) || null;
}

// ---------------------------------------------------------------- web

function doGet(e) {
  const p = (e && e.parameter) || {};
  let boot;
  try {
    const r = findByToken_(table_(), p.t);
    boot = r ? { token: p.t, tenant: publicTenant_(r) } : { token: null, tenant: null };
  } catch (err) {
    boot = { token: null, tenant: null, error: String(err.message || err) };
  }
  const t = HtmlService.createTemplateFromFile('Index');
  t.boot = JSON.stringify(boot).replace(/</g, '\\u003c');
  return t.evaluate()
    .setTitle('Agenda tu mantención preventiva · SDO Rent')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Solo lo necesario para la página (no expone teléfono ni montos). */
function publicTenant_(r) {
  const fecha = r[C.FECHA] instanceof Date ? dayKey_(r[C.FECHA]) : '';
  return {
    name: String(r[C.NOMBRE]), dir: String(r[C.DIR]), depto: String(r[C.DEPTO]), comuna: String(r[C.COMUNA]),
    estado: String(r[C.ESTADO] || ''),
    agendado: fecha && r[C.ESTADO] === 'Agendado' ? { date: fecha, franja: String(r[C.FRANJA] || '') } : null,
    cerrado: CFG.CERRADOS.indexOf(String(r[C.ESTADO])) >= 0
  };
}

// ---------------------------------------------------------------- disponibilidad

function dayKey_(d) { return Utilities.formatDate(d, CFG.TZ, 'yyyy-MM-dd'); }
function at_(key, hour) { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d, hour, 0); }
function franja_(b) { return ('0' + b[0]).slice(-2) + ':00 - ' + ('0' + b[1]).slice(-2) + ':00'; }

function busyByDay_(from, to, ignoreEventId) {
  const out = {};
  const day = k => (out[k] = out[k] || { blocks: [], closed: '' });
  CalendarApp.getDefaultCalendar().getEvents(from, to).forEach(ev => {
    if (ev.isAllDayEvent()) return;
    if (ignoreEventId && ev.getId() === ignoreEventId) return;
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
    s: h1, e: h2, free: !b.closed && !b.blocks.some(([s, e]) => h1 * 60 < e && h2 * 60 > s)
  }));
}

/** Llamado desde la página: días hábiles con sus bloques. */
function getSlots(token) {
  const t = table_();
  const r = findByToken_(t, token);
  if (!r) throw new Error('Este link no es válido. Pide uno nuevo a SDO Rent.');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const from = new Date(today); from.setDate(from.getDate() + CFG.LEAD_DAYS);
  const to = new Date(today); to.setDate(to.getDate() + CFG.WINDOW_DAYS + 1);
  const busy = busyByDay_(from, to, r[NUEVAS.EVENTO] || null);
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
  const clean = s => String(s || '').trim().slice(0, 500);
  const d = { token: clean(f.token), date: clean(f.date), start: Number(f.start), phone: clean(f.phone), email: clean(f.email), note: clean(f.note) };
  const block = CFG.BLOCKS.find(b => b[0] === d.start);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date) || !block) throw new Error('Elige un día y un bloque horario.');
  if (d.phone.replace(/\D/g, '').length < 8) throw new Error('Escribe un teléfono válido.');
  if (d.email && !/^\S+@\S+\.\S+$/.test(d.email)) throw new Error('Revisa el correo.');

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const t = table_();
    const r = findByToken_(t, d.token);
    if (!r) throw new Error('Este link no es válido. Pide uno nuevo a SDO Rent.');
    if (CFG.CERRADOS.indexOf(String(r[C.ESTADO])) >= 0) throw new Error('Tu visita ya fue coordinada con el técnico. Para cambiarla, escríbenos.');

    const start = at_(d.date, block[0]), end = at_(d.date, block[1]);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const minDay = new Date(today); minDay.setDate(minDay.getDate() + CFG.LEAD_DAYS);
    if (start.getDay() === 0 || start.getDay() === 6 || start < minDay) throw new Error('Ese día no está disponible.');
    const oldId = r[NUEVAS.EVENTO] || null;
    const dayStart = at_(d.date, 0), dayEnd = new Date(dayStart.getTime() + 864e5);
    const slot = blocksFor_(d.date, busyByDay_(dayStart, dayEnd, oldId)).find(x => x.s === block[0]);
    if (!slot || !slot.free) throw new Error('Ese bloque se acaba de ocupar. Elige otro, por favor.');

    const cal = CalendarApp.getDefaultCalendar();
    if (oldId) { try { const old = cal.getEventById(oldId); if (old) old.deleteEvent(); } catch (err) {} }

    const nombre = String(r[C.NOMBRE]);
    const corto = nombre.split(' ').filter(Boolean);
    const nombreCorto = corto.length > 2 ? corto[0] + ' ' + corto[corto.length - 2] : nombre;
    const where = r[C.DIR] + ', Depto. ' + r[C.DEPTO] + (r[C.COMUNA] ? ', ' + r[C.COMUNA] : '');
    const desc = [
      'Mantención preventiva Maestro Soluciones.',
      'Arrendatario: ' + nombre,
      'Agendado por el arrendatario desde el link el ' + Utilities.formatDate(new Date(), CFG.TZ, 'dd-MM-yyyy HH:mm'),
      'Bloque: ' + franja_(block),
      'Teléfono: ' + d.phone,
      d.email ? 'Correo: ' + d.email : '',
      d.note ? 'Obs.: ' + d.note : '',
      'Fila N° ' + r[C.N] + ' de la planilla de coordinación'
    ].filter(Boolean).join('\n');
    const proveedor = PropertiesService.getScriptProperties().getProperty('PROVEEDOR_EMAIL') || CFG.PROVEEDOR_EMAIL;
    const guests = [proveedor, d.email].filter(Boolean).join(',');
    const ev = cal.createEvent('Mantención Preventiva MS – ' + r[C.DIR] + ' D' + r[C.DEPTO] + ' (' + nombreCorto + ')', start, end,
      { description: desc, location: where, guests: guests, sendInvites: !!guests });

    // Actualiza la fila del arrendatario
    t.set(r, C.ESTADO, 'Agendado');
    t.sh.getRange(r._row, t.col[C.FECHA] + 1).setValue(at_(d.date, 0)).setNumberFormat('dd-MM-yyyy');
    t.set(r, C.FRANJA, franja_(block));
    if (!r[C.CONTACTO]) t.sh.getRange(r._row, t.col[C.CONTACTO] + 1).setValue(today).setNumberFormat('dd-MM-yyyy');
    const nota = 'Agendó por link ' + Utilities.formatDate(new Date(), CFG.TZ, 'dd-MM') + ': ' +
      Utilities.formatDate(start, CFG.TZ, 'dd-MM') + ' ' + franja_(block) + '. Tel ' + d.phone +
      (d.email ? ', ' + d.email : '') + (d.note ? '. ' + d.note : '') + (oldId ? ' (reagendó)' : '') + '.';
    t.set(r, C.OBS, r[C.OBS] ? nota + ' | ' + r[C.OBS] : nota);
    t.set(r, NUEVAS.EVENTO, ev.getId());

    return { date: d.date, start: block[0], end: block[1], where, name: nombre, invited: !!d.email, rescheduled: !!oldId };
  } finally {
    lock.releaseLock();
  }
}
