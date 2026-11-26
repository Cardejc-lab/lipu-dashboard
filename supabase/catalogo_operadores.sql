-- 26-nov-2026 · catalogo_operadores pasa a ser el catálogo oficial (botón CATALOGOS de Flota y Carta Operativa)
alter table public.catalogo_operadores
  add column if not exists zona text, add column if not exists categoria text, add column if not exists antiguedad text,
  add column if not exists origen text, add column if not exists actualizado_al timestamptz;
-- Diario 07:15 Monterrey (13:15 UTC)
select cron.schedule('cargar-catalogo-operadores-diario', '15 13 * * *', $$
  select net.http_post(url := 'https://xbzovcjjxrupuygarnbk.supabase.co/functions/v1/cargar-catalogo-operadores', body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type','application/json','x-carga-token',(select valor from public.carga_config where clave='token_carga_sabana')),
    timeout_milliseconds := 120000);
$$);

-- 26-nov-2026 · Catálogo de Unidades en catalogo_vehiculos (columnas cat_*; las de ODO no se tocan). Lo llena la misma función.
alter table public.catalogo_vehiculos
  add column if not exists cat_planta text, add column if not exists cat_jefatura_cord text, add column if not exists cat_coordinador text,
  add column if not exists cat_modelo text, add column if not exists cat_modelo_por_contrato integer, add column if not exists cat_clima text,
  add column if not exists cat_cumple_con_modelo text, add column if not exists cat_tipo text, add column if not exists cat_ruta text,
  add column if not exists cat_nombre text, add column if not exists cat_nomina_operador text, add column if not exists cat_observaciones text,
  add column if not exists cat_serie_registro integer, add column if not exists cat_rutas integer, add column if not exists cat_actualizado_al timestamptz;
