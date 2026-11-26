// cargar-catalogo-operadores · Llena public.catalogo_operadores con el catálogo del botón CATALOGOS (Flota y Carta Operativa)
// Fuente: hoja pública PRE TRINOMIO, pestañas TRINOMIO y RH. Unión por nómina, sin vacantes (1000000 / 0 / vacío).
// Además llena las columnas cat_* de public.catalogo_vehiculos (Catálogo de Unidades, una fila por unidad; no toca columnas de ODO).
// POST · header x-carga-token (public.carga_config, clave token_carga_sabana)
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const SHEET_ID = "130_M-pzEUv2MJ937Msl7FcSf2WaRpqgv4CC8BCM4rjQ";
const GID = { TRINOMIO: "1371588970", RH: "1622232217", SABANA: "768875703", CONTRATO: "1747260902" };
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
const clean = (v?: string) => String(v ?? "").replace(/\s+/g, " ").trim();
const up = (v?: string) => clean(v).toUpperCase();
const nom = (v?: string) => clean(v).replace(/\.0+$/, "");
const valida = (n: string) => !!n && n !== "1000000" && n !== "0";
const norm = (v?: string) => up(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const isNoRuta = (r?: string) => { const n = norm(r); return !n || n === "SIN RUTA" || n === "0"; };
const isVac = (t: string[]) => { const nm = norm(t[3]), n = nom(t[2]); return !n || n === "1000000" || n === "0" || !nm || nm === "0" || /VACANTE/.test(nm); };
const join = (a: (string | number)[]) => { const u = [...new Set(a.map(String))]; return u.join(" / "); };
async function hoja(gid: string) {
  const r = await fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`, { redirect: "follow" });
  if (!r.ok) throw new Error(`No se pudo leer la hoja gid ${gid} (${r.status}). ¿Sigue compartida con «cualquiera con el enlace»?`);
  return parseCSV(await r.text()).slice(1);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Usa POST" }, 405);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: cfg } = await sb.from("carga_config").select("valor").eq("clave", "token_carga_sabana").single();
  if (!cfg || req.headers.get("x-carga-token") !== cfg.valor) return json({ error: "No autorizado" }, 401);
  try {
    const [trR, rhR, sabR, conR] = await Promise.all([hoja(GID.TRINOMIO), hoja(GID.RH), hoja(GID.SABANA), hoja(GID.CONTRATO)]);
    // TRINOMIO: A PLANTA, B COORDINADOR, C NOMINA, D NOMBRE, E RUTA TRIN, F UNIDAD, G COMENTARIOS, H GERENTE
    const tri = new Map<string, string[]>(); trR.forEach(r => { const n = nom(r[2]); if (valida(n) && !tri.has(n)) tri.set(n, r); });
    // RH: A Nómina, B Nombre, C F. ingreso, D Antigüedad, E Puesto, F..G, H Planta, I Jefe
    const rh = new Map<string, string[]>(); rhR.forEach(r => { const n = nom(r[0]); if (valida(n) && !rh.has(n)) rh.set(n, r); });
    if (tri.size < 50 || rh.size < 50) return json({ error: `Lectura incompleta (TRINOMIO ${tri.size}, RH ${rh.size}); no se cambió el catálogo` }, 422);
    const ahora = new Date().toISOString();
    const recs = [...new Set([...tri.keys(), ...rh.keys()])].map(n => { const t = tri.get(n), r = rh.get(n);
      return { nomina_op: n, planta: up(t ? t[0] : r![7]) || null, coordinador: up((t && clean(t[1])) || (r && r[8]) || "") || null, zona: null,
        nombre_op: up((r && clean(r[1])) || (t && t[3]) || "") || null, categoria: r ? (up(r[4]) || null) : null, ruta: t ? (up(t[4]) || null) : null,
        antiguedad: r ? (clean(r[3]) || null) : null, jefe: t ? (clean(t[7]) || null) : null,
        origen: t && r ? "RH Y TRINOMIO" : r ? "SOLO RH (sin ruta en TRINOMIO)" : "SOLO TRINOMIO (no está en RH)", actualizado_al: ahora }; });
    for (let i = 0; i < recs.length; i += 500) {
      const { error } = await sb.from("catalogo_operadores").upsert(recs.slice(i, i + 500), { onConflict: "nomina_op" });
      if (error) return json({ error: error.message }, 500);
    }
    const { error: e2, count } = await sb.from("catalogo_operadores").delete({ count: "exact" }).or(`actualizado_al.lt.${ahora},actualizado_al.is.null`);
    if (e2) return json({ error: e2.message }, 500);
    // ---- Catálogo de Unidades → catalogo_vehiculos.cat_* (rutas del Ranking sin unidad vacía, 0 ni comodín 5)
    const sab = new Map<string, string[]>(); sabR.slice(3).forEach(r => { const id = clean(r[0]); if (id && !sab.has(id)) sab.set(id, r); });   // datos desde renglón 5
    const con = new Map<string, number>(); conR.forEach(r => { const a = parseFloat(clean(r[2])); if (clean(r[1]) && !isNaN(a)) con.set(norm(r[1]), a); });
    const anio = new Date().getFullYear();
    const porUnidad = new Map<string, string[][]>();
    trR.filter(t => !isNoRuta(t[4]) && clean(t[5]) && !["0", "5"].includes(nom(t[5]))).forEach(t => { const u = nom(t[5]); if (!porUnidad.has(u)) porUnidad.set(u, []); porUnidad.get(u)!.push(t); });
    const uRecs = [...porUnidad.entries()].map(([u, ts]) => { const s = sab.get(u);
      const antMax = con.has(norm(ts[0][0])) ? con.get(norm(ts[0][0]))! : (s && !isNaN(parseFloat(s[21])) ? parseFloat(s[21]) : null);
      const obs = ts.map(t => { if (isVac(t)) return "0"; const r = rh.get(nom(t[2])); const tp = r ? clean(r[11]) : ""; return !tp || ["0", "ACTIVO"].includes(norm(tp)) ? "0" : tp; });
      return { id_veh: u, cat_planta: join(ts.map(t => up(t[0]))), cat_jefatura_cord: join(ts.map(t => clean(t[7]))) || null, cat_coordinador: join(ts.map(t => up(t[1]))) || null,
        cat_modelo: s ? (clean(s[45]) || null) : null, cat_modelo_por_contrato: antMax === null ? null : anio - antMax, cat_clima: s ? (clean(s[68]) || null) : null,
        cat_cumple_con_modelo: s ? (clean(s[24]) || null) : null, cat_tipo: "Sí", cat_ruta: join(ts.map(t => up(t[4]))),
        cat_nombre: join(ts.map(t => isVac(t) ? "" : up(t[3]))) || null, cat_nomina_operador: join(ts.map(t => isVac(t) ? "1000000" : nom(t[2]))),
        cat_observaciones: join(obs), cat_serie_registro: 1, cat_rutas: ts.length, cat_actualizado_al: ahora }; });
    for (let i = 0; i < uRecs.length; i += 500) {
      const { error } = await sb.from("catalogo_vehiculos").upsert(uRecs.slice(i, i + 500), { onConflict: "id_veh" });
      if (error) return json({ error: "unidades: " + error.message }, 500);
    }
    const limpia = Object.fromEntries(Object.keys(uRecs[0] || {}).filter(k => k.startsWith("cat_") && k !== "cat_actualizado_al").map(k => [k, null]));
    const { error: e3, count: uLimpias } = await sb.from("catalogo_vehiculos").update({ ...limpia, cat_actualizado_al: ahora }, { count: "exact" })
      .or(`cat_actualizado_al.lt.${ahora},cat_actualizado_al.is.null`);
    if (e3) return json({ error: "unidades: " + e3.message }, 500);
    const c = (o: string) => recs.filter(x => x.origen === o).length;
    return json({ ok: true, actualizado_al: ahora, operadores: recs.length, ambos: c("RH Y TRINOMIO"), solo_rh: c("SOLO RH (sin ruta en TRINOMIO)"), solo_trinomio: c("SOLO TRINOMIO (no está en RH)"), eliminados: count ?? 0,
      unidades: uRecs.length, unidades_2_rutas: uRecs.filter(x => x.cat_rutas > 1).length, unidades_sin_catalogo_limpiadas: uLimpias ?? 0 });
  } catch (e) { return json({ error: String((e as Error).message || e) }, 502); }
});
