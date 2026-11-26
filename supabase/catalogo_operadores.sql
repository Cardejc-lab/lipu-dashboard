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
