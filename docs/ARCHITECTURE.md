# Arquitectura de Noósfera

## Visión general

Noósfera es un instrumento de ciencia ciudadana para medir el acoplamiento
entre la actividad solar, el campo geomagnético local y la fisiología humana.
Construida en **React Native / Expo SDK 54**, diseñada para correr en Android
vía **Expo Go** desde un entorno **Termux** — sin ordenador, sin IDE, sin
compilación nativa local.

El principio de diseño central es la **separación estricta entre lógica de
datos y presentación**: `App.js` no contiene ninguna lógica de fetch, sensor
o cálculo. Todo eso vive en hooks independientes, uno por responsabilidad.

---

## Estructura de archivos

```
noosfera-app/
│
├── App.js                      # Ensamblador: solo llama hooks e importa componentes
├── theme.js                    # Paleta, helpers de estado y clamp()
├── app.json                    # Config Expo (permisos, bundle ID, SDK)
├── .env                        # Variables de entorno locales — NO commiteado
├── .env.example                # Plantilla pública de variables de entorno
│
├── hooks/
│   ├── useKpData.js            # NOAA Kp + histórico 7 días
│   ├── useF107Data.js          # NOAA F10.7 flujo solar (sfu)
│   ├── useDonkiData.js         # NASA DONKI eventos solares
│   ├── useMagnetometer.js      # Magnetómetro nativo + fallback simulado
│   ├── useDissipativeIndex.js  # Índice σ + datos del osciloscopio
│   ├── useLightSensor.js       # Sensor de luz ambiental (solo Android)
│   ├── useUVIndex.js           # Índice UV por GPS / coords fallback
│   └── usePPGHeartRate.js      # Estimación cardíaca por cámara (PPG)
│
├── components/
│   ├── Gauge.js                # Medidor de aguja SVG
│   ├── Oscilloscope.js         # Traza de señal en vivo (SVG)
│   ├── ReadingCell.js          # Celda de lectura tipo instrumento
│   ├── EquationCard.js         # Ecuación σ con pulso animado
│   ├── MechanismCard.js        # Tarjeta con nivel de evidencia científica
│   ├── KpHistoryChart.js       # Gráfico de barras Kp 7 días
│   ├── SolarCycleExplainer.js  # Posición en el ciclo solar de 11 años
│   ├── Logbook.js              # Bitácora personal (AsyncStorage)
│   ├── LightReading.js         # Celdas de luz ambiental e índice UV
│   ├── HeartRateMonitor.js     # UI de medición PPG con cámara
│   └── DataDiagnostic.js       # Panel de diagnóstico de fuentes de datos
│
└── docs/
    ├── ARCHITECTURE.md         # Este archivo
    ├── SCIENCE.md              # Marco teórico y bases científicas
    ├── DATA_SOURCES.md         # Documentación de endpoints y sensores
    └── CONTRIBUTING.md         # Guía para contribuir
```

---

## Flujo de datos

```
Fuente externa             Hook                      Salida              UI
─────────────────          ────────────────           ──────              ──────────────────
NOAA (Kp)         ──►  useKpData()          ──►  kp, kpHistory      Gauge + KpHistoryChart
NOAA (F10.7)      ──►  useF107Data()        ──►  f107               ReadingCell
NASA DONKI        ──►  useDonkiData()       ──►  donki              ReadingCell
currentuvindex.com──►  useUVIndex()         ──►  uvIndex            LightReading
Magnetómetro HW   ──►  useMagnetometer()   ──►  mag, magRef        ReadingCell
Sensor luz HW     ──►  useLightSensor()    ──►  lux                LightReading
Cámara (PPG)      ──►  usePPGHeartRate()   ──►  bpm, quality       HeartRateMonitor
                        useDissipativeIndex
                        ({ mag, magRef, kp })──►  indexValue,        Gauge + Oscilloscope
                                                   scopeData
```

---

## Contratos de interfaz de cada hook

### `useKpData()`
```js
{ kp, kpHistory, isLive, lastUpdate }
```
- `kp`: número 0–9 o `null`
- `kpHistory`: array de números (~56 lecturas de 3h = 7 días)
- `isLive: false` → el valor es simulado por fallo de red
- `lastUpdate`: objeto `Date` de la última actualización exitosa

**Nota de formato:** el endpoint de NOAA cambió en 2026 de arrays
`[["time_tag","Kp",...], [valor,...]]` a objetos `{"time_tag":"...","Kp":2.0,...}`.
El hook lee `.Kp` con mayúscula, no `[1]`.

### `useF107Data()`
```js
{ f107, isLive }
```
- `f107`: número en sfu, rango típico 65–300. Proxy clásico de actividad solar.

### `useDonkiData()`
```js
{ donki, isLive }
```
- `donki: null` con `isLive: true` es resultado válido — no hubo eventos.
- `donki: null` con `isLive: false` → fallo de red (503 del servidor NASA, etc.)
- Usa `EXPO_PUBLIC_NASA_API_KEY` del `.env`. Sin ella: `DEMO_KEY` (30 req/h globales).

### `useMagnetometer()`
```js
{ mag, magRef, sensorActive, sensorAvailable, activateSensor }
```
- `mag`: estado React (para render), μT
- `magRef`: ref mutable — se pasa a `useDissipativeIndex` para evitar
  que el intervalo se reinicie con cada lectura del sensor
- En web: cae a simulado automáticamente sin intentar el módulo nativo

### `useDissipativeIndex({ mag, magRef, kp })`
```js
{ indexValue, scopeData }
```
- `indexValue`: 0–100, fórmula: `0.5·magDeviation + 0.3·kpNorm + 0.2·rfSim`
- `scopeData`: ventana deslizante de 60 puntos normalizados, tick cada 800ms

### `useLightSensor()`
```js
{ lux, sensorActive, sensorAvailable, platformSupported, activateSensor }
```
- `platformSupported: false` en iOS y web (Apple no expone esta API)

### `useUVIndex()`
```js
{ uvIndex, isLive, permissionStatus, locationLabel, refetch }
```
Cascada de ubicación (de más rápida a más lenta):
1. `getLastKnownPositionAsync` (maxAge 24h, accuracy 50km) → instantáneo
2. `getCurrentPositionAsync` con timeout 8s
3. Coordenadas de `.env` (`EXPO_PUBLIC_LAT` / `EXPO_PUBLIC_LON`)
4. Default hardcoded: Chipiona, Cádiz (36.74, -6.43)

### `usePPGHeartRate()`
```js
{ attachCameraRef, startMeasurement, isRecording, progress, bpm, quality, error }
```
- 75 capturas en 15s con `takePictureAsync({ quality:0.2, base64:true, skipProcessing:true })`
- Brillo estimado por muestreo de bytes base64
- BPM por zero-crossing del brillo medio
- `quality: 'poor'` si la señal es demasiado plana (dedo mal colocado)

---

## Variables de entorno

| Variable | Requerida | Descripción |
|---|---|---|
| `EXPO_PUBLIC_NASA_API_KEY` | Recomendada | Clave API nasa.gov. Sin ella: DEMO_KEY |
| `EXPO_PUBLIC_LAT` | Opcional | Latitud fallback UV. Default: `36.74` |
| `EXPO_PUBLIC_LON` | Opcional | Longitud fallback UV. Default: `-6.43` |

Todas en `.env` (gitignored). Ver `.env.example` como plantilla.

---

## Decisiones de diseño

**¿Por qué Expo Go y no development build?**
Todo el flujo vive en Termux (Android arm64) sin ordenador. Expo Go elimina
la necesidad de Xcode o Android Studio. La contrapartida es no poder usar
módulos nativos con enlace en tiempo de compilación (ej: `react-native-vision-camera`).

**¿Por qué el PPG usa capturas de foto en vez de stream de vídeo?**
`expo-camera` en Expo Go no expone frame processors. `expo-video-thumbnails`
estaba deprecada y tenía un bug en Android (devolvía el mismo frame repetido).
Las capturas sucesivas con `skipProcessing` son menos precisas pero usan
APIs estables dentro de Expo Go.

**¿Por qué AsyncStorage y no SQLite para la bitácora?**
≤200 entradas de texto, sin consultas complejas. AsyncStorage es suficiente
y evita una dependencia nativa adicional.

**¿Por qué `magRef` además del estado `mag`?**
`useDissipativeIndex` usa un `setInterval`. Si leyera el estado `mag`
directamente, necesitaría incluirlo en las dependencias y el intervalo se
reiniciaría con cada lectura del sensor (cada 800ms), creando inestabilidad.
`magRef` siempre tiene el valor más reciente sin desencadenar re-renders.

---

## Paleta (`theme.js`)

| Token | Hex | Uso semántico |
|---|---|---|
| `void` | `#0a0e14` | Fondo principal |
| `void2` | `#10151e` | Fondo de tarjetas e instrumentos |
| `paper` | `#e8e2d4` | Texto principal |
| `paperDim` | `#9a9484` | Texto secundario / notas |
| `gold` | `#c9a655` | Acento / datos activos / régimen activo |
| `goldDim` | `#7d6a3f` | Referencias / etiquetas de sección |
| `equilibrium` | `#4a9b7f` | Estado OK / índice < 25 |
| `perturbation` | `#c1542c` | Alerta / índice ≥ 50 / errores |

`stateForIndex(idx)` → `{ label, color }` según rango del índice disipativo.
