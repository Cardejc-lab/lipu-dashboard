// cargar-sabana · Lee la pestaña SABANA (hoja pública de Google) y la guarda en public.sabana_semanal
// POST { "semana"?: "2026-S45", "tipo"?: "MANUAL" | "AUTOMÁTICO" }  · header x-carga-token (public.carga_config)
// Sin semana: en lunes se toma la semana que termina; otro día, la semana en curso (hora de Monterrey).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const SHEET_ID = "130_M-pzEUv2MJ937Msl7FcSf2WaRpqgv4CC8BCM4rjQ";
const GID_SABANA = "768875703";
const PRIMER_RENGLON_DATOS = 5;   // renglón 4 = encabezados
const COLS = ["vehicle_id", "disponibilidad", "num_asignaciones_trinomio", "duplicada", "planta", "coordinador", "nomina", "operador", "ruta", "comentarios", "gerente", "todas_las_rutas_2", "operadores_que_usan_la_unidad_2", "f_ingreso", "antiguedad_operador", "puesto", "fecha_ult_logueo", "no_logueo", "tipo", "observaciones", "rp", "antiguedad_max_vehiculo", "contrato_unidades", "antiguedad_unidad_anos", "cumple_ano_contrato", "falla_estatus", "familia", "clasificacion", "refaccion", "sic", "fecha_compromiso", "costo_ref", "planta_corralon", "fecha_ingreso_corralon", "dias_en_corralon", "motivo", "status_corralon", "monto", "odo_estado", "empresa", "numero_de_chasis", "marca", "modelo", "numero_de_asientos", "numero_de_motor", "ano_del_modelo", "version", "tipo_de_vehiculo", "uso", "odo_status", "tipo_de_combustible", "eco", "placas_estatales", "placas_federales", "descripcion_del_vehiculo", "cliente_principal", "cliente_secundario", "conductor", "ultimo_odometro", "encierro", "ultima_comunicacion", "origen", "tipo_de_asiento", "numero_de_puertas", "tarjeta_iave", "imei_rastreo", "radio_frecuencia", "sim_de_rastreo", "aire_acondicionado", "marca_aa", "bano", "estereo", "cortinas", "monitores", "numero_de_pantallas", "cinturones_de_seguridad", "puntos_seguridad_cinturones", "cajuela", "control_de_aforo", "modelo_chasis", "capacidad_actual_del_tanque", "observacion_analisis_de_asignacion"];
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });

function parseCSV(t: string): string[][] {
  const out: string[][] = []; let row: string[] = [], f = "", q = false;
  for (let i = 0; i < t.length; i++) { const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true; else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; row.push(f); out.push(row); row = []; f = ""; }
    else f += c; }
  if (f !== "" || row.length) { row.push(f); out.push(row); }
  return out;
}
const ymd = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
function lunesDe(d: Date) { const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7)); return t; }
function isoSemana(l: Date) { const t = new Date(l); t.setUTCDate(t.getUTCDate() + 3); const y = t.getUTCFullYear(); const j = lunesDe(new Date(Date.UTC(y, 0, 4)));
  return `${y}-S${String(1 + Math.floor((t.getTime() - j.getTime()) / 6048e5)).padStart(2, "0")}`; }
function lunesIso(y: number, w: number) { const l = lunesDe(new Date(Date.UTC(y, 0, 4))); l.setUTCDate(l.getUTCDate() + (w - 1) * 7); return l; }

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Usa POST" }, 405);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: cfg } = await sb.from("carga_config").select("valor").eq("clave", "token_carga_sabana").single();
  if (!cfg || req.headers.get("x-carga-token") !== cfg.valor) return json({ error: "No autorizado" }, 401);
  let body: { semana?: string; tipo?: string } = {}; try { body = await req.json(); } catch { /* sin cuerpo */ }

  const hoyS = ymd(new Date()).split("-").map(Number); const hoy = new Date(Date.UTC(hoyS[0], hoyS[1] - 1, hoyS[2]));
  let lunes = lunesDe(hoy); if (hoy.getUTCDay() === 1) lunes.setUTCDate(lunes.getUTCDate() - 7);
  if (body.semana) { const m = String(body.semana).toUpperCase().match(/^(\d{4})-?S?(\d{1,2})$/); if (!m) return json({ error: "semana debe ser aaaa-Sss" }, 400); lunes = lunesIso(+m[1], +m[2]); }
  const semana = isoSemana(lunes), semana_inicio = lunes.toISOString().slice(0, 10), tipo = body.tipo || "MANUAL";

  const r = await fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID_SABANA}`, { redirect: "follow" });
  if (!r.ok) return json({ error: `No se pudo leer la hoja (${r.status}). ¿Sigue compartida con «cualquiera con el enlace»?` }, 502);
  const rows = parseCSV(await r.text()).slice(PRIMER_RENGLON_DATOS - 1).filter(x => (x[0] || "").trim() !== "");
  if (!rows.length) return json({ error: "La SABANA no trae unidades" }, 422);

  const fecha_carga = new Date().toISOString();
  const recs = rows.map(x => { const o: Record<string, string | null> = { semana, semana_inicio, fecha_carga, tipo_carga: tipo };
    COLS.forEach((c, i) => { const v = (x[i] ?? "").trim(); o[c] = v === "" ? null : v; }); return o; });
  for (let i = 0; i < recs.length; i += 500) {
    const { error } = await sb.from("sabana_semanal").upsert(recs.slice(i, i + 500), { onConflict: "semana,vehicle_id" });
    if (error) return json({ error: error.message }, 500);
  }
  // unidades que ya no vienen en la SABANA de esa semana
  const { error: e2, count } = await sb.from("sabana_semanal").delete({ count: "exact" }).eq("semana", semana).lt("fecha_carga", fecha_carga);
  if (e2) return json({ error: e2.message }, 500);
  return json({ ok: true, semana, semana_inicio, fecha_carga, unidades: recs.length, eliminadas: count ?? 0 });
});
