# NOÓSFERA — App Expo / React Native

Observatorio ciudadano de acoplamiento Sol–Campo–Vida. Versión nativa (Expo/RN)
del instrumento web, con lectura real del magnetómetro del dispositivo y
el índice Kp de NOAA SWPC en vivo.

## Instalación en Termux

```bash
# 1. Entra a la carpeta del proyecto
cd noosfera-app

# 2. Instala dependencias (usa --legacy-peer-deps si hay conflictos de peer deps)
npm install --legacy-peer-deps

# 3. Arranca el servidor de desarrollo en modo LAN (más estable que --tunnel en Termux)
npx expo start --lan

# 4. Escanea el QR con la app Expo Go en tu teléfono
```

Si `npx expo start --lan` no conecta porque el móvil de pruebas está en la misma
red que el dispositivo Termux (caso típico de un solo teléfono), usa:

```bash
npx expo start --tunnel
```

(más lento para arrancar pero no depende de estar en la misma red).

## Estructura

```
noosfera-app/
├── App.js                  # pantalla principal, integra sensores + NOAA
├── theme.js                 # paleta de colores y helpers de estado
├── components/
│   ├── Gauge.js              # medidor de aguja (SVG)
│   ├── Oscilloscope.js        # traza de señal en vivo (SVG)
│   └── ReadingCell.js          # celdas de lectura tipo instrumento
├── app.json                  # config de Expo (nombre, permisos, bundle id)
└── package.json
```

## Notas técnicas

- **Magnetómetro**: usa `expo-sensors`. En Android funciona en la mayoría de
  dispositivos; en iOS Simulator no hay sensor real, así que cae automáticamente
  a la estimación basal simulada (marcada con `*`).
- **NOAA Kp**: hace `fetch` directo a `services.swpc.noaa.gov`. Si no hay red,
  o el dispositivo está offline, cae a un valor simulado y lo marca con `*`
  en vez de mostrar un dato falso como si fuera real.
- **Fuentes**: Spectral (serif) + JetBrains Mono, cargadas vía
  `@expo-google-fonts`. La primera carga puede tardar unos segundos en
  descargar las fuentes — es normal.
- **Tipografía/paleta**: replica exactamente el mismo sistema de diseño que
  la versión web (`noosfera.html`), para mantener consistencia de marca entre
  ambas plataformas.

## Build para distribución (EAS)

Cuando quieras generar un APK instalable fuera de Expo Go:

```bash
npm install -g eas-cli   # o npx eas-cli si prefieres no instalar global
eas build:configure
eas build --platform android --profile preview
```

Esto requiere una cuenta gratuita de Expo (eas.dev) y conexión a internet
para que el build corra en los servidores de Expo (Termux no compila APKs
nativos localmente).
# noosfera-app
