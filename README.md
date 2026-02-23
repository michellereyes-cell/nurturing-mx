# Nurturing MX – Dashboard de conversión

Dashboard de conversión de nurturing para Tiendanube México. Permite cargar 3 CSVs (Tableau trials, Tableau new payments, HubSpot), aplicar reglas ICP para normalizar canales desde UTMs y visualizar conversión y engagement con filtros por canal y etapa en la URL.

## Cómo correr el proyecto

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Formato esperado de los 3 CSVs

### 1. CSV Tableau – Trials

- **Formato:** Tab-separated (TSV). Si el archivo viene en UTF-16, la app normaliza cabeceras y valores.
- **Columnas (nombres reales o alias):**
  - `campaign` (o utm_campaign)
  - `content` (o utm_content)
  - Métrica trials: `Trials Atribución Mean Click`, `Atribución Mean Click`, `trials`, etc.
- Los exports “Detailed Table UTMs x Subteam (created at)” de Tableau se soportan tal cual.

### 2. CSV Tableau – New Payments

- **Formato:** Mismo que Trials (tab como delimitador).
- **Columnas:** `campaign`, `content`, y métrica NP: `Atribución NP Mean Click`, `NP Atribución Mean Click`, `new_payments`, etc.
- Los exports “Detailed Table UTMs x Subteam (first payment)” se soportan tal cual.

### 3. CSV HubSpot

- **Formato:** CSV con coma. Cabeceras en español.
- **Columnas:** Se usa **Nombre del correo** para derivar campaign y content (ej. “Flujo tienda online- mofu1” → canal tienda online, etapa mofu).
- Métricas: **Abierto** (opens), **Con clic** (clicks), **Tasa de clics** o **Tasa de clickthrough** (CTR), **Informes de spam** (spam).

El cruce entre Tableau y HubSpot se hace por campaign/content normalizado (minúsculas, espacios → guión) y por **canal + etapa**, para que variantes como “flujo-fisica” y “Flujo fisica- tofu2” coincidan.

## Reglas ICP (7 canales)

Las UTMs dinámicas en `utm_content` (y el nombre del correo en HubSpot) se normalizan a un solo canal con esta prioridad:

1. **Tienda online** – si aparece “tienda online”, “online”, etc.
2. **Redes sociales** – si aparece “redes”, “rrss”, etc. (sin ser tienda online).
3. **Marketplace** – si aparece “marketplace”, “mktplace”, etc.
4. **Tienda física** – si aparece “tienda física”, “fisica”, “físico”, etc.
5. **No vendo** – si aparece “no vendo”, “no sabemos”, etc.
6. **Venden (no segmentado)** – flujos que solo indican “venden” (consejos-venden, inactividad-venden, fidelizacion-venden, etc.).
7. **No sabemos** – información faltante o que no matchea lo anterior.

## Filtros en la URL

Puedes compartir o guardar vistas con filtros:

- `?canal=tienda-online` – solo canal tienda online.
- `?etapa=mofu` – solo etapa MOFU.
- `?canal=redes-sociales&etapa=tofu` – combina canal y etapa.

Valores de `canal`: `tienda-online`, `redes-sociales`, `marketplace`, `tienda-fisica`, `no-vendo`, `no-sabemos`, `venden`.  
Valores de `etapa`: `tofu`, `mofu`, `bofu`.

## Deploy en Vercel :D

Conectar el repo a Vercel y desplegar. Build: `npm run build`.
