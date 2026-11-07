/**
 * Historia semanal · Flota y Carta Operativa · Lipu Monterrey
 * ------------------------------------------------------------
 * Guarda una fotografía (valores tal como se ven) de SABANA, RH, TRINOMIO, CONTRATO y TALLER
 * en pestañas ocultas HIST_*, una vez por semana. HIST_INDICE dice en qué renglones quedó cada semana;
 * el tablero lo lee para el selector de semana, las flechas ▲▼ y la pestaña «Histórico».
 *
 * Instalación (una sola vez):
 *   1. En la hoja: Extensiones → Apps Script. Borra lo que haya, pega este archivo y guarda (💾).
 *   2. Recarga la hoja. Aparece el menú «Historia semanal».
 *   3. Historia semanal → Activar corte automático (lunes 06:00). Autoriza con tu cuenta.
 *   4. (Opcional) Historia semanal → Guardar semana ahora, para guardar la semana actual desde hoy.
 *
 * Regla del corte: el lunes a las 06:00, ANTES de cargar la información nueva, se guarda lo que hay
 * como la semana que termina (lunes a domingo anterior). Ej.: lunes 09/11/2026 06:00 → 2026-S45 (02–08 nov).
 */
const HIST = {
  tz: "America/Mexico_City",
  horaCorte: 6,
  indice: "HIST_INDICE",
  fuentes: [
    { k: "SAB", hoja: "SABANA",   desde: 4, cols: 82, dest: "HIST_SABANA" },   // A4:CD (renglón 4 = encabezados)
    { k: "RH",  hoja: "RH",       desde: 1, cols: 13, dest: "HIST_RH" },       // A1:M
    { k: "TRI", hoja: "TRINOMIO", desde: 1, cols: 8,  dest: "HIST_TRINOMIO" }, // A1:H
    { k: "CON", hoja: "CONTRATO", desde: 1, cols: 8,  dest: "HIST_CONTRATO" }, // A1:H
    { k: "TAL", hoja: "TALLER",   desde: 1, cols: 8,  dest: "HIST_TALLER" }    // A1:H
  ]
};

function onOpen() {
  SpreadsheetApp.getUi().createMenu("Historia semanal")
    .addItem("Guardar semana ahora", "guardarSemanaManual")
    .addSeparator()
    .addItem("Activar corte automático (lunes 06:00)", "activarCorte")
    .addItem("Desactivar corte automático", "desactivarCorte")
    .addItem("Ver estado", "verEstado")
    .addToUi();
}

/* ---------- Disparador semanal ---------- */
function activarCorte() {
  quitarDisparadores_();
  ScriptApp.newTrigger("corteSemanal").timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(HIST.horaCorte).inTimezone(HIST.tz).create();
  SpreadsheetApp.getUi().alert("Corte automático activado: cada lunes entre 06:00 y 07:00 (hora de Monterrey) se guarda la semana que termina.\n\nCarga la información nueva después de las 07:00.");
}
function desactivarCorte() {
  const n = quitarDisparadores_();
  SpreadsheetApp.getUi().alert(n ? "Corte automático desactivado." : "No había corte automático activo.");
}
function quitarDisparadores_() {
  let n = 0;
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === "corteSemanal") { ScriptApp.deleteTrigger(t); n++; } });
  return n;
}
/** Lo ejecuta el disparador: guarda la semana anterior (lunes a domingo). */
function corteSemanal() {
  const lunes = lunesDe_(hoy_()); lunes.setDate(lunes.getDate() - 7);
  guardar_(lunes, "AUTOMÁTICO");
}

/* ---------- Guardado manual ---------- */
function guardarSemanaManual() {
  const ui = SpreadsheetApp.getUi();
  const h = hoy_(), lunes = lunesDe_(h);
  if (h.getDay() === 1) lunes.setDate(lunes.getDate() - 7);   // en lunes se guarda la semana que termina
  const def = isoSemana_(lunes);
  const r = ui.prompt("Guardar semana",
    `Se guardará la información que hay AHORA en SABANA, RH, TRINOMIO, CONTRATO y TALLER como la semana ${def} (${fmt_(lunes)} al ${fmt_(sumaDias_(lunes, 6))}).\n\nPara otra semana escribe aaaa-Sss (ej. 2026-S44). Deja vacío para ${def}.`,
    ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  let sem = r.getResponseText().trim().toUpperCase() || def;
  const m = sem.match(/^(\d{4})-?S?(\d{1,2})$/);
  if (!m) { ui.alert("Formato no válido. Usa aaaa-Sss, por ejemplo 2026-S45."); return; }
  const l = lunesIso_(+m[1], +m[2]); sem = isoSemana_(l);
  if (filaIndice_(SpreadsheetApp.getActive(), sem) &&
      ui.alert("Semana ya guardada", `La semana ${sem} ya existe. ¿Reemplazarla con la información actual?`, ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  const res = guardar_(l, "MANUAL");
  ui.alert(`Semana ${sem} guardada.\n\n` + res.map(x => `${x.hoja}: ${x.n} renglones`).join("\n"));
}

function verEstado() {
  const ss = SpreadsheetApp.getActive(), ix = ss.getSheetByName(HIST.indice);
  const act = ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === "corteSemanal");
  const sem = ix && ix.getLastRow() > 1 ? ix.getRange(2, 1, ix.getLastRow() - 1, 4).getDisplayValues() : [];
  const celdas = HIST.fuentes.reduce((a, f) => { const s = ss.getSheetByName(f.dest); return a + (s ? s.getMaxRows() * s.getMaxColumns() : 0); }, 0);
  SpreadsheetApp.getUi().alert(
    `Corte automático: ${act ? "ACTIVO (lunes 06:00)" : "INACTIVO"}\n` +
    `Semanas guardadas: ${sem.length}${sem.length ? " · última " + sem.map(r => r[0]).sort().pop() : ""}\n` +
    `Celdas usadas por el histórico: ${celdas.toLocaleString("es-MX")} (límite de la hoja: 10,000,000)`);
}

/* ---------- Núcleo ---------- */
function guardar_(lunes, tipo) {
  const lock = LockService.getDocumentLock(); lock.waitLock(60000);
  try {
    const ss = SpreadsheetApp.getActive(); SpreadsheetApp.flush();
    const sem = isoSemana_(lunes);
    const ahora = Utilities.formatDate(new Date(), HIST.tz, "dd/MM/yyyy HH:mm");
    const fila = [sem, fmt_(lunes), fmt_(sumaDias_(lunes, 6)), ahora, tipo];
    const res = [];
    HIST.fuentes.forEach(f => {
      const sh = ss.getSheetByName(f.hoja);
      if (!sh) throw new Error(`No existe la pestaña ${f.hoja}.`);
      const last = sh.getLastRow();
      let vals = last >= f.desde ? sh.getRange(f.desde, 1, last - f.desde + 1, f.cols).getDisplayValues() : [];
      while (vals.length && vals[vals.length - 1].every(c => c === "")) vals.pop();
      const dest = hojaHist_(ss, f.dest, f.cols + 2);
      const ini = Math.max(dest.getLastRow(), 1) + 1;
      if (vals.length) {
        const fin = ini + vals.length - 1;
        if (fin > dest.getMaxRows()) dest.insertRowsAfter(dest.getMaxRows(), fin - dest.getMaxRows());
        const rg = dest.getRange(ini, 1, vals.length, f.cols + 2);
        rg.setNumberFormat("@");   // todo como texto: se conserva tal como se veía
        rg.setValues(vals.map(r => [sem, ahora].concat(r)));
      }
      fila.push(ini, vals.length);
      res.push({ hoja: f.hoja, n: vals.length });
    });
    // índice: una fila por semana; si se vuelve a guardar, se apunta al bloque nuevo
    const ix = hojaIndice_(ss), r = filaIndice_(ss, sem);
    const destino = r || Math.max(ix.getLastRow(), 1) + 1;
    const rg = ix.getRange(destino, 1, 1, fila.length); rg.setNumberFormat("@"); rg.setValues([fila.map(String)]);
    if (ix.getLastRow() > 2) ix.getRange(2, 1, ix.getLastRow() - 1, ix.getLastColumn()).sort({ column: 1, ascending: false });
    return res;
  } finally { lock.releaseLock(); }
}
function hojaHist_(ss, nombre, cols) {
  let sh = ss.getSheetByName(nombre);
  if (!sh) {
    sh = ss.insertSheet(nombre, ss.getNumSheets());
    sh.getRange(1, 1, 1, 3).setValues([["SEMANA", "FECHA_CORTE", "DATOS (columnas de la pestaña original desde la columna C)"]]).setFontWeight("bold");
    sh.setFrozenRows(1); sh.hideSheet();
    sh.protect().setDescription("Histórico semanal: no editar").setWarningOnly(true);
  }
  if (sh.getMaxColumns() < cols) sh.insertColumnsAfter(sh.getMaxColumns(), cols - sh.getMaxColumns());
  return sh;
}
function hojaIndice_(ss) {
  let sh = ss.getSheetByName(HIST.indice);
  if (!sh) {
    sh = ss.insertSheet(HIST.indice, ss.getNumSheets());
    const h = ["SEMANA", "LUNES", "DOMINGO", "FECHA_CORTE", "TIPO"];
    HIST.fuentes.forEach(f => h.push(f.k + "_INI", f.k + "_N"));
    sh.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight("bold").setBackground("#066a38").setFontColor("#ffffff");
    sh.setFrozenRows(1);
    sh.protect().setDescription("Índice del histórico semanal: no editar").setWarningOnly(true);
  }
  return sh;
}
function filaIndice_(ss, sem) {
  const sh = ss.getSheetByName(HIST.indice); if (!sh || sh.getLastRow() < 2) return 0;
  const v = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getDisplayValues();
  const i = v.findIndex(r => r[0] === sem); return i < 0 ? 0 : i + 2;
}

/* ---------- Fechas (hora de Monterrey, semana ISO lunes–domingo) ---------- */
function hoy_() { const p = Utilities.formatDate(new Date(), HIST.tz, "yyyy-MM-dd").split("-"); return new Date(+p[0], +p[1] - 1, +p[2], 12); }
function lunesDe_(d) { const t = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12); t.setDate(t.getDate() - ((t.getDay() + 6) % 7)); return t; }
function sumaDias_(d, n) { const t = new Date(d); t.setDate(t.getDate() + n); return t; }
function fmt_(d) { return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear(); }
function isoSemana_(d) {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12); t.setDate(t.getDate() - ((t.getDay() + 6) % 7) + 3);
  const y = t.getFullYear(), j = new Date(y, 0, 4, 12);
  const w = 1 + Math.round(((t - j) / 864e5 - 3 + ((j.getDay() + 6) % 7)) / 7);
  return y + "-S" + ("0" + w).slice(-2);
}
function lunesIso_(y, w) { const j = new Date(y, 0, 4, 12); const l = lunesDe_(j); l.setDate(l.getDate() + (w - 1) * 7); return l; }
