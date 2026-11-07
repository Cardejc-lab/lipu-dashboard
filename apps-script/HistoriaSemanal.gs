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
    .addSeparator()
    .addItem("Configurar Supabase", "configurarSupabase")
    .addItem("Enviar semana a Supabase", "enviarSemanaSupabaseManual")
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
    const res = []; let sabana = [];
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
      if (f.k === "SAB") sabana = vals;
      res.push({ hoja: f.hoja, n: vals.length });
    });
    // índice: una fila por semana; si se vuelve a guardar, se apunta al bloque nuevo
    const ix = hojaIndice_(ss), r = filaIndice_(ss, sem);
    const destino = r || Math.max(ix.getLastRow(), 1) + 1;
    const rg = ix.getRange(destino, 1, 1, fila.length); rg.setNumberFormat("@"); rg.setValues([fila.map(String)]);
    if (ix.getLastRow() > 2) ix.getRange(2, 1, ix.getLastRow() - 1, ix.getLastColumn()).sort({ column: 1, ascending: false });
    try { const n = enviarSupabase_(sem, lunes, tipo, sabana); if (n !== null) res.push({ hoja: "Supabase sabana_semanal", n }); }
    catch (e) { res.push({ hoja: "Supabase (ERROR: " + e.message + ")", n: 0 }); }
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

/* ---------- Supabase: tabla public.sabana_semanal ---------- */
/* Cada vez que se guarda una semana, la SABANA se envía también a Supabase (semana, semana_inicio, fecha_carga, tipo_carga + 82 columnas).
   Si la semana ya existía, se reemplazan sus unidades (upsert por semana + vehicle_id). */
const SB_COLS = ["vehicle_id", "disponibilidad", "num_asignaciones_trinomio", "duplicada", "planta", "coordinador", "nomina", "operador", "ruta", "comentarios", "gerente", "todas_las_rutas_2", "operadores_que_usan_la_unidad_2", "f_ingreso", "antiguedad_operador", "puesto", "fecha_ult_logueo", "no_logueo", "tipo", "observaciones", "rp", "antiguedad_max_vehiculo", "contrato_unidades", "antiguedad_unidad_anos", "cumple_ano_contrato", "falla_estatus", "familia", "clasificacion", "refaccion", "sic", "fecha_compromiso", "costo_ref", "planta_corralon", "fecha_ingreso_corralon", "dias_en_corralon", "motivo", "status_corralon", "monto", "odo_estado", "empresa", "numero_de_chasis", "marca", "modelo", "numero_de_asientos", "numero_de_motor", "ano_del_modelo", "version", "tipo_de_vehiculo", "uso", "odo_status", "tipo_de_combustible", "eco", "placas_estatales", "placas_federales", "descripcion_del_vehiculo", "cliente_principal", "cliente_secundario", "conductor", "ultimo_odometro", "encierro", "ultima_comunicacion", "origen", "tipo_de_asiento", "numero_de_puertas", "tarjeta_iave", "imei_rastreo", "radio_frecuencia", "sim_de_rastreo", "aire_acondicionado", "marca_aa", "bano", "estereo", "cortinas", "monitores", "numero_de_pantallas", "cinturones_de_seguridad", "puntos_seguridad_cinturones", "cajuela", "control_de_aforo", "modelo_chasis", "capacidad_actual_del_tanque", "observacion_analisis_de_asignacion"];
function configurarSupabase() {
  const ui = SpreadsheetApp.getUi(), pr = PropertiesService.getScriptProperties();
  const u = ui.prompt("Supabase (1 de 2)", "Project URL (Supabase → Project Settings → API), ej. https://abcd1234.supabase.co", ui.ButtonSet.OK_CANCEL);
  if (u.getSelectedButton() !== ui.Button.OK) return;
  const k = ui.prompt("Supabase (2 de 2)", "Llave service_role (Project Settings → API keys). Se guarda solo en este script; no la compartas.", ui.ButtonSet.OK_CANCEL);
  if (k.getSelectedButton() !== ui.Button.OK) return;
  pr.setProperties({ SUPABASE_URL: u.getResponseText().trim().replace(/\/+$/, ""), SUPABASE_KEY: k.getResponseText().trim() });
  ui.alert("Supabase configurado. Desde ahora cada semana guardada se envía a la tabla sabana_semanal.");
}
function enviarSemanaSupabaseManual() {
  const ui = SpreadsheetApp.getUi(), h = hoy_(), l = lunesDe_(h); if (h.getDay() === 1) l.setDate(l.getDate() - 7);
  const ss = SpreadsheetApp.getActive(), sh = ss.getSheetByName("SABANA");
  const r = ui.prompt("Enviar a Supabase", `Se enviará lo que hay AHORA en SABANA como la semana ${isoSemana_(l)}. Para otra semana escribe aaaa-Sss.`, ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const m = (r.getResponseText().trim().toUpperCase() || isoSemana_(l)).match(/^(\d{4})-?S?(\d{1,2})$/);
  if (!m) { ui.alert("Formato no válido. Usa aaaa-Sss."); return; }
  let v = sh.getRange(4, 1, Math.max(sh.getLastRow() - 3, 1), 82).getDisplayValues();
  const n = enviarSupabase_(isoSemana_(lunesIso_(+m[1], +m[2])), lunesIso_(+m[1], +m[2]), "MANUAL", v);
  ui.alert(n === null ? "Primero usa Historia semanal → Configurar Supabase." : `Enviadas ${n} unidades a Supabase.`);
}
/** vals = renglones de SABANA desde el renglón 4 (encabezados) */
function enviarSupabase_(sem, lunes, tipo, vals) {
  const pr = PropertiesService.getScriptProperties(), url = pr.getProperty("SUPABASE_URL"), key = pr.getProperty("SUPABASE_KEY");
  if (!url || !key) return null;
  const carga = new Date().toISOString(), ini = Utilities.formatDate(lunes, HIST.tz, "yyyy-MM-dd");
  const filas = vals.slice(1).filter(r => String(r[0]).trim() !== "").map(r => {
    const o = { semana: sem, semana_inicio: ini, fecha_carga: carga, tipo_carga: tipo };
    SB_COLS.forEach((c, i) => { const x = r[i] === undefined ? "" : String(r[i]); o[c] = x === "" ? null : x; });
    return o; });
  for (let i = 0; i < filas.length; i += 500) {
    const resp = UrlFetchApp.fetch(`${url}/rest/v1/sabana_semanal?on_conflict=semana,vehicle_id`, {
      method: "post", contentType: "application/json", muteHttpExceptions: true, payload: JSON.stringify(filas.slice(i, i + 500)),
      headers: { apikey: key, Authorization: "Bearer " + key, Prefer: "resolution=merge-duplicates,return=minimal" } });
    if (resp.getResponseCode() >= 300) throw new Error(`Supabase ${resp.getResponseCode()}: ${resp.getContentText().slice(0, 300)}`);
  }
  // unidades que ya no están en la SABANA de esa semana se eliminan (para que la semana quede igual a la hoja)
  const ids = filas.map(f => f.vehicle_id);
  if (ids.length) UrlFetchApp.fetch(`${url}/rest/v1/sabana_semanal?semana=eq.${sem}&vehicle_id=not.in.(${ids.map(x => '"' + x.replace(/"/g, '') + '"').join(",")})`, {
    method: "delete", muteHttpExceptions: true, headers: { apikey: key, Authorization: "Bearer " + key } });
  return filas.length;
}
