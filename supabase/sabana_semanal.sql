-- Base semanal de la SÁBANA (Flota y Carta Operativa · Lipu Monterrey)
-- Un renglón por unidad y por semana. Todas las columnas de la SÁBANA se guardan como texto, tal como se ven en la hoja.
create table if not exists public.sabana_semanal (
  id bigint generated always as identity primary key,
  semana text not null check (semana ~ '^\d{4}-S\d{2}$'),   -- semana ISO a la que pertenece, ej. 2026-S45 (lunes a domingo)
  semana_inicio date not null,                                  -- lunes de esa semana
  fecha_carga timestamptz not null default now(),               -- cuándo se hizo la carga
  tipo_carga text not null default 'MANUAL',                    -- AUTOMÁTICO (lunes 06:00) o MANUAL
  vehicle_id text not null,                                -- Vehicle ID
  disponibilidad text,                              -- DISPONIBILIDAD
  num_asignaciones_trinomio text,                   -- # ASIGNACIONES TRINOMIO
  duplicada text,                                   -- DUPLICADA
  planta text,                                      -- PLANTA
  coordinador text,                                 -- COORDINADOR
  nomina text,                                      -- NÓMINA
  operador text,                                    -- OPERADOR (1o válido)
  ruta text,                                        -- RUTA
  comentarios text,                                 -- COMENTARIOS
  gerente text,                                     -- GERENTE
  todas_las_rutas_2 text,                           -- TODAS LAS RUTAS (2+)
  operadores_que_usan_la_unidad_2 text,             -- OPERADORES QUE USAN LA UNIDAD (2+)
  f_ingreso text,                                   -- F. INGRESO
  antiguedad_operador text,                         -- ANTIGÜEDAD OPERADOR
  puesto text,                                      -- PUESTO
  fecha_ult_logueo text,                            -- FECHA ÚLT. LOGUEO
  no_logueo text,                                   -- NO LOGUEO
  tipo text,                                        -- TIPO
  observaciones text,                               -- OBSERVACIONES
  rp text,                                          -- RP
  antiguedad_max_vehiculo text,                     -- ANTIGÜEDAD MÁX. VEHÍCULO
  contrato_unidades text,                           -- CONTRATO (UNIDADES)
  antiguedad_unidad_anos text,                      -- ANTIGÜEDAD UNIDAD (AÑOS)
  cumple_ano_contrato text,                         -- CUMPLE AÑO CONTRATO
  falla_estatus text,                               -- FALLA / ESTATUS
  familia text,                                     -- FAMILIA
  clasificacion text,                               -- CLASIFICACIÓN
  refaccion text,                                   -- REFACCIÓN
  sic text,                                         -- SIC
  fecha_compromiso text,                            -- FECHA COMPROMISO
  costo_ref text,                                   -- COSTO REF
  planta_corralon text,                             -- PLANTA CORRALÓN
  fecha_ingreso_corralon text,                      -- FECHA INGRESO CORRALÓN
  dias_en_corralon text,                            -- DÍAS EN CORRALÓN
  motivo text,                                      -- MOTIVO
  status_corralon text,                             -- STATUS CORRALÓN
  monto text,                                       -- MONTO
  odo_estado text,                                  -- Estado
  empresa text,                                     -- Empresa
  numero_de_chasis text,                            -- Número de chasis
  marca text,                                       -- Marca
  modelo text,                                      -- Modelo
  numero_de_asientos text,                          -- Número de asientos
  numero_de_motor text,                             -- Número de Motor
  ano_del_modelo text,                              -- Año del modelo
  version text,                                     -- Versión
  tipo_de_vehiculo text,                            -- Tipo de vehículo
  uso text,                                         -- Uso
  odo_status text,                                  -- Status
  tipo_de_combustible text,                         -- Tipo de combustible
  eco text,                                         -- Eco
  placas_estatales text,                            -- Placas Estatales
  placas_federales text,                            -- Placas Federales
  descripcion_del_vehiculo text,                    -- Descripción del vehículo
  cliente_principal text,                           -- Cliente Principal
  cliente_secundario text,                          -- Cliente Secundario
  conductor text,                                   -- Conductor
  ultimo_odometro text,                             -- Último Odómetro
  encierro text,                                    -- Encierro
  ultima_comunicacion text,                         -- Última comunicación
  origen text,                                      -- Origen
  tipo_de_asiento text,                             -- Tipo de asiento
  numero_de_puertas text,                           -- Número de Puertas
  tarjeta_iave text,                                -- Tarjeta IAVE
  imei_rastreo text,                                -- IMEI Rastreo
  radio_frecuencia text,                            -- Radio Frecuencia
  sim_de_rastreo text,                              -- Sim de rastreo
  aire_acondicionado text,                          -- Aire Acondicionado
  marca_aa text,                                    -- Marca AA
  bano text,                                        -- Baño
  estereo text,                                     -- Estéreo
  cortinas text,                                    -- Cortinas
  monitores text,                                   -- Monitores
  numero_de_pantallas text,                         -- Número de Pantallas
  cinturones_de_seguridad text,                     -- Cinturones de Seguridad
  puntos_seguridad_cinturones text,                 -- Puntos seguridad Cinturones
  cajuela text,                                     -- Cajuela
  control_de_aforo text,                            -- Control de aforo
  modelo_chasis text,                               -- Modelo Chasis
  capacidad_actual_del_tanque text,                 -- Capacidad actual del tanque
  observacion_analisis_de_asignacion text           -- OBSERVACIÓN / ANÁLISIS DE ASIGNACIÓN
);

-- Si una semana se vuelve a cargar se reemplaza la unidad (no se duplica)
create unique index if not exists sabana_semanal_semana_unidad on public.sabana_semanal (semana, vehicle_id);
create index if not exists sabana_semanal_semana on public.sabana_semanal (semana);

-- Seguridad: nadie lee ni escribe con la llave pública; la carga usa la llave service_role desde Apps Script.
alter table public.sabana_semanal enable row level security;

comment on table public.sabana_semanal is 'Fotografía semanal de la pestaña SABANA (Flota y Carta Operativa, Lipu Monterrey).';
