# RESUMEN MAESTRO · Flota y Carta Operativa · Lipu Monterrey (Traxión)

> Última actualización: 14-nov-2026 (hora de Ciudad de México). Proyecto de Claude **"TABLEROS LIPU"** (Sistema Integral de Transporte).
> Este documento cubre el tablero **Flota y Carta Operativa** (SÁBANA, integración de flota, pre carta operativa, histórico semanal y su base en Supabase).
> Otros resúmenes del proyecto: `claude/RESUMEN_MAESTRO.md` (descansos, horas y somnolencia) y `claude/RESUMEN_MAESTRO_PORTAL_Y_DATOS.md` (portal y plataforma de datos).

---

## 0. PUNTO DE REANUDACIÓN

**Dónde estamos (14-nov-2026):**
- El tablero está publicado en dos lugares y es el mismo código:
  - Artifact de Claude: https://claude.ai/artifact/HEEaC7StN4gWn1LvD7uxmT (lee la hoja con el conector Google Sheets).
  - GitHub Pages: repositorio `Cardejc-lab/lipu-dashboard` → `index.html` → `FlotaCartaOperativa.html?v=<fecha>` (lee la hoja pública por gviz CSV).
- **Reporte semanal activo.** Cada lunes a las 06:00 (Monterrey) se guarda la semana que termina, en dos lugares:
  - en la hoja, con Apps Script en las pestañas `HIST_*` (las lee el tablero);
  - en Supabase, en la tabla `sabana_semanal`, por función programada.
- Hay **una semana guardada: 2026-S45** (2–8 nov). La guardaron los cortes automáticos del 09-nov: 06:00 en Supabase y 06:58 en la hoja.
- La segunda semana, **S46, se guarda el lunes 16-nov a las 06:00**. Desde ese momento aparecen las flechas ▲▼ y la pestaña Histórico tiene 2 filas.
- El usuario dijo que **después definirá los indicadores y las vistas comparativas** (ver sección 8).

**Qué hacer a continuación (en este orden):**
1. Después del 16-nov, confirmar que S46 quedó en `HIST_INDICE` y en `sabana_semanal` (consultas en la sección 6).
2. Con el usuario, definir las vistas comparativas. Propuestas:
   - movimientos de disponibilidad por unidad;
   - altas y bajas de unidades;
   - cambios de unidad u operador por ruta;
   - permanencia en taller y corralón.
3. Confirmar las reglas del Excel **Ranking** (sección 9.6).
4. Revisar los pendientes de negocio de la sección 10.

---

## 1. Objetivo

El tablero tiene tres propósitos:
1. Dar **visibilidad de la flota**: ODO es la columna vertebral, cruzada con TRINOMIO, RH, CONTRATO, TALLER y CORRALÓN.
2. **Validar que la asignación cumpla el contrato** (planta, modelo, antigüedad).
3. Servir de **pre carta operativa** y generar las bases de Excel (Carta operativa y Ranking).

Desde el 06-nov también es un **reporte semanal**: el lunes se carga la información nueva y lo anterior queda como historia de la semana.

---

## 2. Piezas y ubicaciones

| Pieza | Dónde | Notas |
|---|---|---|
| Hoja fuente | Google Sheet "PRE TRINOMIO GOOGLE SHEET 1.0", ID `130_M-pzEUv2MJ937Msl7FcSf2WaRpqgv4CC8BCM4rjQ` | Compartida "cualquiera con el enlace" (lectura). Pestañas: SABANA, ODO, TRINOMIO, RH, CONTRATO, TALLER, CORRALÓN, HIST_* |
| Pestaña SABANA | sheetId (gid) `768875703` | Encabezados en los renglones 3–4; datos desde el renglón 5 |
| Tablero (artifact) | https://claude.ai/artifact/HEEaC7StN4gWn1LvD7uxmT | Capacidades: `mcp` (Google Sheets `get_values`) y `downloads`. Quien lo abre sin el conector ve el mensaje `no_mcp` y debe usar GitHub |
| Fuente local del tablero | `FlotaCartaOperativa.html` (sin envoltura `<!doctype>`) | En el repo va envuelto con doctype, head y body |
| Repositorio público | GitHub `Cardejc-lab/lipu-dashboard`, rama `main`, Pages desde la raíz | `index.html` (menú), `FlotaCartaOperativa.html`, `apps-script/HistoriaSemanal.gs`, `supabase/` (SQL y función) |
| Archivos ocultos del menú | `ConciliacionFlota.html` y `score_operadores.html` | El usuario los subirá después con cambios |
| Conciliación (artifact aparte) | https://claude.ai/artifact/J7CeszQ4B8YXtw4cxM4NSt | Versión anterior, estilo navy |
| Doc de continuidad anterior | https://claude.ai/artifact/5fryVqqFcmVpqC1pmXZTvY (Claude Docs) | Este resumen lo reemplaza |
| Apps Script | En la hoja: Extensiones → Apps Script (`HistoriaSemanal.gs`) | Menú "Historia semanal" |
| Supabase | Proyecto `prueba_desarrollos` (ref `xbzovcjjxrupuygarnbk`) | Tablas `sabana_semanal` y `carga_config`, función `cargar-sabana`, cron `cargar-sabana-lunes` |

**Publicar un cambio (rutina):**
1. Editar la fuente local.
2. Validar la sintaxis con `node --check` sobre el script extraído.
3. Probar con Playwright y el conector simulado.
4. Publicar el artifact con la misma ruta de archivo.
5. Envolver el HTML (doctype, head, body) y copiarlo al repo.
6. Actualizar `?v=` en `index.html` (Pages guarda caché hasta 10 min).
7. Hacer commit y push a `main`.

Si el usuario no ve el cambio: Ctrl+F5.

---

## 3. Pestaña SABANA (hoja)

Un renglón por unidad de ODO. Columnas (82, A:CD):

| Bloque | Columnas | Contenido |
|---|---|---|
| Unidad | A–D | Vehicle ID (`UNIQUE` de ODO) · DISPONIBILIDAD · # asignaciones en TRINOMIO · DUPLICADA |
| TRINOMIO | E–M | Primer operador válido (salta VACANTE): planta, coordinador, nómina, operador, ruta, comentarios, gerente. L y M: todas las rutas y todos los operadores si hay 2 o más |
| RH | N–T | Datos del operador asignado (ingreso, antigüedad, puesto, último logueo, tipo, observaciones) |
| CONTRATO | U–Y | RP, antigüedad máxima, unidades contratadas, antigüedad de la unidad, cumple año de contrato |
| TALLER | Z–AF | Falla, familia, clasificación, refacción, SIC, fecha compromiso, costo |
| CORRALÓN | AG–AL | Planta, fecha de ingreso, días, motivo, estatus, monto |
| ODO | AM–CC | Estado, empresa, chasis, marca, modelo, año, status, eco, placas, cliente, etc. |
| Análisis | CD | Observación / análisis de asignación |

**DISPONIBILIDAD (prioridad):** EN CORRALÓN > EN TALLER > FUERA DE OPERACIÓN (status de ODO) > DISPONIBLE > ASIGNADA SIN OPERADOR > ASIGNADA.

**CD (análisis):**
- Si hay comentario en TRINOMIO, se usa el comentario.
- Si la unidad no está asignada: `SIN ASIGNACIÓN · <estatus>`.
- Si está asignada: `CUMPLE ASIGNACIÓN` o `NO CUMPLE · motivos`. Los motivos posibles son:
  - unidad en 2 o más rutas;
  - unidad en taller, corralón o fuera de operación;
  - sin planta o planta sin contrato;
  - antigüedad fuera de contrato;
  - sin ruta o sin operador;
  - operador que no está en RH;
  - tipo en RH distinto de activo.

---

## 4. Tablero: estructura actual

- **Barra superior verde:**
  - logos y título;
  - indicador de actualización;
  - **selector de semana** ("En curso · S46" o una semana guardada);
  - botones ⬇ Excel y ⬇ Carta operativa.
- **Menú fijo bajo el encabezado** (siempre visible, delgado): Resumen · Integración de flota (sube al bloque de integración) · RH vs Trinomio · Taller · Planta vs contrato · Pre carta operativa · Histórico · **⬇ Ranking** (amarillo, a la derecha).
- **Integración de flota:**
  - columna izquierda: Flota, Asignadas, Diferencia;
  - columna derecha: Disponibles, Guardia, Ruta / sin operador, Subtotal operativas, En taller, En corralón, Subtotal no operativas y Total;
  - a la derecha, una **gráfica de cascada**.
- **Tarjetas KPI**: se pueden abrir para ver su lista.
- **Pestañas de abajo**: Por revisar · Conciliación · Operadores sin unidad · Trinomio de más · Comentarios trinomio. Las principales se quitaron de esta fila para no duplicarlas con el menú.
- **Barra lateral** con filtros en cascada, ocultable.
- Marca de agua y pie "LIPU MONTERREY CONFIDENCIAL".

**Paleta institucional:** `--navy:#066a38` (verde corporativo), `--bg:#d9f3d0`, `--brand:#e8f20a`, `--foot:#3b7d25`, tarjetas `rgba(255,255,255,.84)`.

**Librerías:** Chart.js 4.4.1 (con un plugin propio de etiquetas, conectores y sumas de grupo) y SheetJS 0.18.5.

---

## 5. Reporte semanal (implementado 06-nov-2026)

### 5.1 Hoja: Apps Script `HistoriaSemanal.gs`
- Menú **Historia semanal** con: Guardar semana ahora · Activar corte automático (lunes 06:00) · Desactivar · Ver estado.
- **Disparador:** lunes a las 06:00, zona America/Mexico_City. Guarda la **semana que termina**: el lunes anterior a domingo, con semana ISO `aaaa-Sss`.
- El guardado manual propone la semana en curso; si es lunes, propone la que termina. Si la semana ya existe, pregunta si se reemplaza.
- Copia los valores **tal como se ven** (`getDisplayValues`, formato texto) de:
  - SABANA A4:CD (el renglón 4 son los encabezados);
  - RH A1:M;
  - TRINOMIO A1:H;
  - CONTRATO A1:H;
  - TALLER A1:H.
- Las copias van a las pestañas ocultas y protegidas `HIST_SABANA`, `HIST_RH`, `HIST_TRINOMIO`, `HIST_CONTRATO` y `HIST_TALLER`. Las columnas A–B son SEMANA y FECHA_CORTE; los datos van desde la columna C.
- `HIST_INDICE` lleva SEMANA, LUNES, DOMINGO, FECHA_CORTE y TIPO, y por cada fuente `<K>_INI` y `<K>_N` (renglón inicial y cantidad). K = SAB, RH, TRI, CON, TAL.
- Cada semana ocupa unas 50 mil celdas; el límite de la hoja es de 10 millones. Conviene archivar una vez al año.
- La versión vigente **no** envía a Supabase: lo hace Supabase solo (ver 5.3). Una versión intermedia tenía el menú "Configurar Supabase"; si quedó pegada, sin configurar no hace nada.

### 5.2 Tablero
- **Selector de semana.** Al elegir una semana guardada, todo el tablero (pestañas, listas, Excel) muestra esa fotografía. El nombre del Excel incluye la semana.
- **▲▼ vs semana anterior:**
  - aparece en la integración de flota, las tarjetas y las vistas RH vs Trinomio, Planta vs contrato y Taller;
  - se calcula pintando la misma vista con el modelo de la semana anterior fuera de pantalla y comparando los números;
  - la semana anterior es la última guardada antes de la que se muestra.
- **Pestaña Histórico:**
  - una fila por semana guardada más la semana en curso;
  - métricas: Flota, Asignadas, Diferencia, Disponibles, Guardia, Ruta/sin operador, Flota disponible, Taller, Corralón, Contratadas, Asignadas vs contrato, Cobertura %, Plantilla RH, Operadores sin unidad, Trinomio de más y No cumple antigüedad;
  - cada número trae su variación contra la semana anterior;
  - gráfica de tendencia y Excel;
  - al tocar una fila se ve esa semana.
- Funciones clave en el código:
  - de carga: `loadIndex()`, `loadWeek(sem)`, `setPrev()`, `showWeek(sem)`;
  - de comparación: `prevVals()`, `applyDeltas()`;
  - de cálculo y vista: `kpiCalc()` (cálculo puro de la integración), `semMetrics(m)`, `histView()`.

### 5.3 Supabase (proyecto `xbzovcjjxrupuygarnbk`)
- **Tabla `public.sabana_semanal`:**
  - campos `id`, `semana` (`2026-S45`), `semana_inicio` (lunes), `fecha_carga` (timestamptz), `tipo_carga` (MANUAL / AUTOMÁTICO) y las **82 columnas de la SABANA como texto**, en snake_case (`vehicle_id`, `disponibilidad`, … `observacion_analisis_de_asignacion`);
  - índice único `(semana, vehicle_id)`: recargar una semana reemplaza y no duplica;
  - RLS activado y sin políticas: solo service_role puede leer y escribir.
- **Tabla `public.carga_config`:** guarda `token_carga_sabana`, el token privado de la función. RLS sin políticas.
- **Función Edge `cargar-sabana`:**
  - se llama con POST, cabecera `x-carga-token` y cuerpo opcional `{semana, tipo}`;
  - lee la SABANA de la hoja pública (`/export?format=csv&gid=768875703`, datos desde el renglón 5);
  - hace upsert de las unidades y borra las que ya no vienen en esa semana.
- **Cron `cargar-sabana-lunes`:** `0 12 * * 1` (12:00 UTC = 06:00 Monterrey). Llama a la función con `pg_net`.
- Carga manual (SQL):
  ```sql
  select net.http_post(url := 'https://xbzovcjjxrupuygarnbk.supabase.co/functions/v1/cargar-sabana',
    body := '{"semana":"2026-S46","tipo":"MANUAL"}'::jsonb,
    headers := jsonb_build_object('Content-Type','application/json','x-carga-token',(select valor from public.carga_config where clave='token_carga_sabana')));
  -- resultado: select status_code, content from net._http_response order by id desc limit 1;
  ```
- Aclaración para los otros resúmenes: `sabana_semanal` y `carga_config` se crearon **en esta línea de trabajo**. La línea de descansos usa `sabana_semanal` como catálogo provisional de operadores.

---

## 6. Verificación rápida

**Hoja:** revisar `HIST_INDICE!A1:O20`. Debe haber una fila por semana.

**Supabase:**
```sql
select semana, tipo_carga, to_char(fecha_carga at time zone 'America/Mexico_City','DD/MM/YYYY HH24:MI') carga,
       count(*) unidades, count(*) filter (where disponibilidad='ASIGNADA') asignadas
from public.sabana_semanal group by 1,2,3 order by 1;
select status, return_message, start_time from cron.job_run_details order by start_time desc limit 3;
```

**Estado al 09-nov:**
- Supabase: S45, 444 unidades (363 asignadas, 24 en taller, 6 en corralón).
- Hoja: S45 con SABANA 444, RH 430, TRINOMIO 440, CONTRATO 39 y TALLER 25 (sin contar el renglón de encabezados).

---

## 7. Decisiones tomadas

| Decisión | Motivo |
|---|---|
| ODO es la columna vertebral (una fila por unidad) | Petición del usuario |
| En TRINOMIO se toma el primer operador válido (salta VACANTE) y se concatenan todos si hay 2 o más | Petición del usuario |
| RH vs Trinomio desde la perspectiva de RH (≈422 operadores) | Corrección del usuario |
| Planta vs contrato se cuenta por **unidad**, no por operador | Corrección del usuario |
| No operativas = **solo** taller y corralón | "No pongas nada que no sea de esa descripción" |
| Operativas = disponibles + guardia + ruta sin operador; las rutas GUARDIA cuentan como disponibles (se muestran aparte) | Petición del usuario |
| Unidades "fuera de operación" en ODO cuentan como operativas | Consecuencia de la regla anterior; pendiente de confirmar |
| RH disponibles = Activo + Vacaciones | Petición del usuario |
| Cascadas del resultado al deseado (realizable primero), con un subtotal "<inicial> disponible" y sumas de grupo | Petición del usuario |
| Letra grande en las etiquetas de la izquierda; valores ~2 pt menores | Petición del usuario |
| Taller: observaciones primero. Corralón: Status y Motivo primero | Petición del usuario |
| El corte semanal es el lunes a las 06:00, antes de cargar la información nueva; se guarda como la semana que termina | Los lunes se carga información nueva |
| Historia en la misma hoja (pestañas HIST_*) y además en Supabase | El tablero lee la hoja; Supabase sirve para cruces por unidad, SQL o BI |
| Supabase carga por su cuenta (función + cron) y no por Apps Script | Evita pegar la llave service_role en la hoja |
| Menú principal fijo y delgado; las vistas principales se quitaron de la fila de abajo | Petición del usuario |

---

## 8. Pendientes y próximos pasos

1. **Vistas e indicadores comparativos** (los define el usuario después de tener S46). Ideas propuestas:
   - movimientos de disponibilidad por unidad (por ejemplo, Asignada → Taller);
   - altas y bajas de unidades en ODO;
   - cambios de unidad u operador por ruta;
   - permanencia en taller y corralón semana contra semana.
2. Confirmar las reglas del Excel Ranking (9.6), sobre todo si **Gerente** va vacío.
3. Subir **Conciliación de flota ODO** y **Score de operadores** con sus cambios y regresarlos al menú.
4. Confirmar si las unidades "fuera de operación" de ODO deben ser no operativas.
5. Decidir si CUMPLE AÑO CONTRATO usa la planta de la unidad.
6. Confirmar JEFE, Cliente-Ruta y Unidad de negocio de la carta operativa (Ranking ya usa "PLANTA, RUTA" y "LIPU Monterrey").
7. Posible columna de modelo o marca en CONTRATO.
8. Definir si "OPERADOR GUARDIA" en comentarios cuenta como guardia.
9. Validar las cifras con datos reales.
10. **En pausa:** plataforma de captura en vivo (referencia: sistema Senda); falta información del usuario.
11. Opcional: permiso de lectura en `sabana_semanal` si el tablero, el portal o Power BI deben leer de Supabase.

---

## 9. Reglas de cálculo

### 9.1 Integración de flota (`kpiCalc`)
- Flota = unidades de la SABANA (con filtros).
- No operativas: `EN TALLER` → taller; `EN CORRALÓN` → corralón.
- Las operativas se dividen en:
  - **guardia**: la ruta contiene GUARDIA;
  - **asignadas**: con asignación y operador que no es vacante;
  - **ruta / sin operador**: con asignación y operador vacante;
  - **disponibles**: sin asignación.
- Diferencia = Flota − Asignadas = Disponibles + Guardia + Ruta/sin operador + Taller + Corralón.
- Flota disponible = Flota − (Taller + Corralón).

### 9.2 Plantilla RH (comparativo 1)
- Operadores sin unidad, divididos en disponibles (Activo, Vacaciones) y no disponibles.
- Subtotal "Plantilla RH disponible".

### 9.3 Planta vs contrato
- Por planta: contratadas, asignadas, con operador, taller, operativas, fuera de ODO y no cumple antigüedad.
- Modelo mínimo contra modelo asignado: `cumpleMod`.

### 9.4 Taller
- Fuente: pestaña TALLER (41 unidades al inicio), unida a las unidades.
- Clasificación: Sin mecánico asignado, Pendiente refacción, Sin reporte, Baja, En reparación.
- Su conteo difiere de "En taller" de la SABANA: hay unidades fuera de ODO y el corralón tiene prioridad.

### 9.5 Carta operativa (⬇ Carta operativa)
- Un renglón por ruta del TRINOMIO.
- Columnas: PLANTA, RUTA, JEFE (de RH por nómina), COORDINADOR, ID VEH, NOMINA OP, NOMBRE OP, Cliente-Ruta (`PLANTA-RUTA`), Unidad de negocio, Gerente.

### 9.6 Ranking (⬇ Ranking)
- Mismo universo que la carta (respeta filtros) y mismas 10 columnas.
- Diferencias:
  - Cliente-Ruta = **`PLANTA, RUTA`**;
  - Unidad de negocio = **`LIPU Monterrey`**;
  - sin unidad → **ID VEH 1**;
  - vacante → **NOMINA OP 1000000** y NOMBRE OP vacío;
  - JEFE = jefe del operador en RH o, si no hay, el coordinador;
  - Gerente sale del TRINOMIO (en el ejemplo del usuario venía vacío; **por confirmar**);
  - ID VEH y nómina van como números.

### 9.7 Semana
- Semana ISO de lunes a domingo, formato `aaaa-Sss`.
- 2026 tiene 53 semanas: la S53 va del 28-dic-2026 al 3-ene-2027.

---

## 10. Riesgos y temas abiertos
- **Hoja pública:** el tablero en GitHub y la carga a Supabase dependen de que la hoja siga compartida "cualquiera con el enlace".
- **gviz CSV:** pierde los encabezados de columnas numéricas y puede vaciar valores de tipo minoritario. El tablero usa posiciones fijas para la SABANA. Las HIST_* van como texto para evitarlo, y Supabase usa `/export?format=csv` en vez de gviz.
- **Corte del lunes:** si la información nueva se carga antes de las 06:00, el corte guardaría lo nuevo. En ese caso usar "Guardar semana ahora" antes de cargar.
- **Artifact compartido:** quien no tiene el conector Google Sheets no ve datos y debe usar el enlace de GitHub.
- **Supabase plan gratis:** el proyecto se pausa tras una semana sin uso, lo que detendría el cron. El espacio es compartido con viajes y eventos (≈318/500 MB); cada semana de la SABANA suma ~444 filas, muy poco.
- Pruebas hechas con datos simulados (Playwright). Las cifras reales deben validarse en pantalla.

---

## 11. Glosario
- **SABANA:** pestaña que une ODO, TRINOMIO, RH, CONTRATO, TALLER y CORRALÓN por unidad.
- **ODO:** catálogo de unidades (fuente de flota).
- **TRINOMIO:** asignación ruta–unidad–operador.
- **Trinomio de más:** asignaciones del TRINOMIO que no cuadran (unidad u operador que sobra o no existe).
- **Guardia:** ruta de guardia; la unidad cuenta como disponible.
- **Operativas / no operativas:** no operativas son solo taller y corralón.
- **Flota disponible:** flota menos taller y corralón.
- **Semana ISO (`2026-S45`):** de lunes a domingo; el corte del lunes guarda la semana que termina.
- **HIST_*:** pestañas ocultas con las fotografías semanales. **HIST_INDICE:** índice de semanas.

---

## 12. Historial resumido
1. **Inicio:** pestaña SABANA (ODO como columna vertebral) y primer tablero; reconstruido con el estándar `/lipu-dash` a petición del usuario.
2. Columna CD de análisis; vistas de unidades sin asignar, operadores sin unidad y trinomio de más; RH vs Trinomio (perspectiva RH); Planta vs contrato por unidad y modelo.
3. Conciliación ODO 444 − asignadas 352 = 92 explicada (también hay un tablero aparte de conciliación).
4. Publicación en GitHub Pages (repo `Cardejc-lab/lipu-dashboard`); arreglos del loader, `[hidden]`, nombres de hoja en XLSX y error `no_mcp`.
5. Botón Carta operativa; vista lineal de integración (Flota/Asignadas/Diferencia) simétrica; la misma vista en RH y Planta vs contrato.
6. Colores institucionales, logos, marca de agua y pie; gráficas de cascada; pestaña Taller; subtotales operativas/no operativas; guardia como disponible; porcentajes y sumas de grupo; cascadas del resultado al deseado.
7. **06-nov:** reporte semanal (Apps Script con corte lunes 06:00, HIST_*, selector de semana, ▲▼, pestaña Histórico).
8. **06-nov:** menú fijo y delgado con las vistas principales, Integración de flota y Planta vs contrato; Resumen primero; botón **Ranking**; vistas principales fuera de la fila de abajo.
9. **07-nov:** Supabase: tabla `sabana_semanal`, función `cargar-sabana`, cron de los lunes; primera carga S45 (444 unidades).
10. **09-nov:** primeros cortes automáticos correctos (hoja y Supabase, S45). Siguiente corte: 16-nov (S46).
