# Fuentes de datos

## NOAA SWPC — Índice Kp

**Endpoint:** `https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json`
**Hook:** `useKpData.js`
**Actualización:** cada 3 horas
**Formato actual (2026):** array de objetos
```json
[
  {"time_tag":"2026-06-25T00:00:00","Kp":2.00,"a_running":7,"station_count":8},
  {"time_tag":"2026-06-25T03:00:00","Kp":1.67,"a_running":6,"station_count":8}
]
```
**Campo clave:** `.Kp` (con mayúscula). Nota: el formato cambió en 2026 de
arrays `[["time_tag","Kp",...],[valor,...]]` a objetos con clave nombrada.
**Cobertura:** ~7 días de lecturas de 3 horas (~56 puntos)
**Sin autenticación requerida**

### Escala Kp
| Kp | Actividad | G-scale |
|---|---|---|
| 0–2 | Tranquila | — |
| 3–4 | Activa | — |
| 5 | Tormenta menor | G1 |
| 6 | Tormenta moderada | G2 |
| 7 | Tormenta fuerte | G3 |
| 8 | Tormenta muy fuerte | G4 |
| 9 | Tormenta extrema | G5 |

---

## NOAA SWPC — Flujo solar F10.7

**Endpoint:** `https://services.swpc.noaa.gov/json/f107_cm_flux.json`
**Hook:** `useF107Data.js`
**Actualización:** cada 10 minutos en la app (el dato real se actualiza diariamente)
**Unidad:** sfu (solar flux unit) = 10⁻²² W·m⁻²·Hz⁻¹ a 2800 MHz (10.7 cm)
**Sin autenticación requerida**

El hook prueba múltiples nombres de campo (`flux`, `f107`, `observed_flux`,
`f107_flux`, `value`) porque el esquema exacto ha variado entre versiones
del endpoint.

### Rangos de referencia
| F10.7 (sfu) | Actividad solar |
|---|---|
| 65–75 | Mínimo solar |
| 100–150 | Actividad moderada |
| 150–300 | Actividad alta / máximo solar |

Ciclo Solar 25: máximo anunciado por NOAA/NASA en octubre de 2024, con
valor suavizado de 13 meses alcanzando ~156.7 sfu en agosto de 2024.

---

## NASA DONKI — Eventos solares

**Endpoint:** `https://api.nasa.gov/DONKI/notifications`
**Hook:** `useDonkiData.js`
**Parámetros:** `startDate`, `endDate` (ventana de 7 días), `type=all`
**Actualización:** cada 15 minutos en la app
**Autenticación:** `api_key` requerida

### Configuración de la clave API
La clave se lee de `EXPO_PUBLIC_NASA_API_KEY` en `.env`.
Sin configurar, usa `DEMO_KEY` (30 peticiones/hora globales compartidas).
Clave propia gratuita en: https://api.nasa.gov/ (llega al instante por email,
sube el límite a 1000 peticiones/hora).

### Tipos de evento principales
| Tipo | Descripción |
|---|---|
| `CME` | Eyección de masa coronal |
| `FLR` | Llamarada solar (flare) |
| `GST` | Tormenta geomagnética |
| `SEP` | Partículas energéticas solares |
| `RBE` | Mejora del cinturón de radiación |
| `MPC` | Paso por el plano de la corriente de plasma |

### Manejo de errores
- HTTP 503: servidor de NASA temporalmente caído — reintenta automáticamente
- HTTP 403: clave inválida o expirada
- Array vacío con HTTP 200: sin eventos en el período — resultado válido

---

## currentuvindex.com — Índice UV

**Endpoint:** `https://currentuvindex.com/api/v1/uvi?latitude={lat}&longitude={lon}`
**Hook:** `useUVIndex.js`
**Actualización:** cada 20 minutos en la app
**Sin autenticación requerida**

### Formato de respuesta
```json
{
  "ok": true,
  "latitude": 36.74,
  "longitude": -6.43,
  "now": {"time": "2026-06-25T12:00:00Z", "uvi": 10.4},
  "forecast": [...],
  "history": [...]
}
```

### Cascada de ubicación
La app obtiene las coordenadas en este orden (de más rápida a más lenta):
1. `getLastKnownPositionAsync` (maxAge 24h, accuracy 50km) — instantáneo
2. `getCurrentPositionAsync` con timeout 8s
3. Coordenadas de `.env` (`EXPO_PUBLIC_LAT` / `EXPO_PUBLIC_LON`)
4. Default hardcoded: Chipiona, Cádiz (36.74, -6.43)

### Escala UV (OMS)
| UV | Categoría | Color en app |
|---|---|---|
| 0–2 | BAJO | Verde (equilibrium) |
| 3–5 | MODERADO | Dorado (gold) |
| 6–7 | ALTO | Dorado (gold) |
| 8+ | MUY ALTO | Terracota (perturbation) |

---

## expo-sensors — Magnetómetro

**Módulo:** `expo-sensors` (`Magnetometer`)
**Hook:** `useMagnetometer.js`
**Intervalo de lectura:** 800ms
**Unidad:** μT (microteslas)
**Disponibilidad:** Android e iOS (requiere permiso de movimiento en iOS)

El hook devuelve la **magnitud** del vector campo magnético:
```
|B| = √(Bx² + By² + Bz²)
```

### Valores de referencia
| |B| (μT) | Interpretación |
|---|---|---|
| 45–55 | Campo terrestre normal |
| 55–100 | Ligera interferencia local |
| 100–500 | Interferencia significativa (altavoz, imán, cargador) |
| > 500 | Interferencia fuerte — alejarse de la fuente |

### Fallback simulado
Cuando el sensor no está disponible o el permiso es denegado, el hook
simula fluctuaciones alrededor de 48 μT ± 3 μT. Los valores simulados
se marcan con asterisco `*` en la UI.

---

## expo-sensors — Sensor de luz ambiental

**Módulo:** `expo-sensors` (`LightSensor`)
**Hook:** `useLightSensor.js`
**Intervalo de lectura:** 1000ms
**Unidad:** lux (lx)
**Disponibilidad:** **Solo Android** — Apple no expone esta API públicamente

### Valores de referencia
| Lux | Entorno típico |
|---|---|
| 0–5 | Noche, sin luz artificial |
| 50–500 | Interior iluminado |
| 1000–10000 | Exterior nublado |
| 10000–100000 | Plena luz solar directa |

---

## expo-camera — Sensor PPG (cardíaco experimental)

**Módulo:** `expo-camera` (`CameraView`, `takePictureAsync`)
**Hook:** `usePPGHeartRate.js`
**Técnica:** Fotopletismografía (PPG) por captura sucesiva de fotos
**Duración:** 15 segundos, ~75 capturas

### Método
1. Cámara trasera con flash (`enableTorch: true`)
2. Usuario tapa lente y flash con la yema del dedo
3. 75 capturas con `{ quality:0.2, base64:true, skipProcessing:true }`
4. Brillo estimado por muestreo de bytes base64 (proxy de luminosidad)
5. BPM calculado por zero-crossing del brillo medio

### Limitaciones importantes
- **NO es un dispositivo médico**
- Precisión significativamente menor que un pulsioxímetro de dedo
- Sensible a movimiento y a cómo se coloca el dedo
- Rango fisiológico validado: 35–200 bpm (fuera de rango → resultado descartado)
- Señal de calidad `'poor'` cuando la varianza del brillo es baja (dedo mal colocado)

### ¿Por qué no usa stream de vídeo en tiempo real?
`expo-camera` en Expo Go no expone frame processors. Requeriría
`react-native-vision-camera` con worklets nativos, incompatible con el
entorno Expo Go / Termux. Ver `docs/ARCHITECTURE.md` para más detalle.

---

## DataDiagnostic — Panel de verificación

El componente `DataDiagnostic.js` (sección "00 · DIAGNÓSTICO" en la app)
permite verificar en tiempo real que cada endpoint responde correctamente
y con el formato esperado.

Toca **"Ejecutar todo"** para lanzar los 4 checks en paralelo:
- ✅ Verde: endpoint OK y formato válido
- 🟡 Comprobando: petición en curso
- 🔴 Rojo: fallo con mensaje de error exacto

Esto es especialmente útil para diagnosticar:
- Cambios de formato en la API de NOAA (ya ocurrió en 2026)
- Fallos temporales del servidor de NASA (HTTP 503)
- Problemas de GPS / permisos de ubicación para el UV
