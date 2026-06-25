# Guía para contribuir a Noósfera

## Principios del proyecto

Noósfera es un instrumento de ciencia ciudadana, no una app de bienestar
comercial. Toda contribución debe respetar dos principios:

1. **Honestidad epistémica**: cada afirmación científica lleva su nivel
   de evidencia explícito (ESTABLECIDO / PARCIAL / HIPÓTESIS). No se acepta
   código que presente hipótesis como hechos demostrados.

2. **Transparencia del dato**: si un valor es simulado, se marca con `*`.
   Si una API falla, la app lo dice claramente en vez de mostrar datos
   falsos como si fueran reales.

---

## Entorno de desarrollo

### Requisitos mínimos
- Android con **Expo Go** instalado (versión 54.x)
- **Termux** con Node.js y npm
- Cuenta gratuita en **GitHub** y **api.nasa.gov**

### Configuración inicial
```bash
# 1. Clonar el repositorio
git clone https://github.com/mechmind-dwv/noosfera-app.git
cd noosfera-app

# 2. Instalar dependencias
npm install --legacy-peer-deps

# 3. Configurar variables de entorno
cp .env.example .env
nano .env   # Rellenar EXPO_PUBLIC_NASA_API_KEY, LAT, LON

# 4. Verificar que todo está bien
npx expo-doctor

# 5. Lanzar
EXPO_NO_DEVTOOLS=1 npx expo start --lan --clear
```

### Notas específicas de Termux/Android
- Usar `cat > archivo << 'EOF'` en vez de `sed` para reemplazos multilínea
- Nunca correr `npm audit fix --force` — sube el SDK y rompe la
  compatibilidad con Expo Go 54.x
- Las dependencias de sensores nativos (`expo-sensors`, `expo-camera`,
  `expo-location`) NO pueden ser reemplazadas por versiones genéricas;
  deben coincidir con la versión que `npx expo install` resuelva para SDK 54

---

## Estructura para nuevas funcionalidades

### Añadir una nueva fuente de datos

1. Crear `hooks/useNombreDato.js` siguiendo este patrón:
```js
export function useNombreDato() {
  const [value, setValue] = useState(null);
  const [isLive, setIsLive] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(URL);
      // ... validar siempre con Number.isFinite() antes de aceptar
      setValue(validatedValue);
      setIsLive(true);
    } catch (e) {
      setValue(fallbackSimulado); // nunca NaN, nunca undefined
      setIsLive(false);           // siempre marcar si es simulado
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { value, isLive };
}
```

2. Importar el hook en `App.js` y desestructurar
3. Pasar los datos al componente correspondiente como props
4. Añadir el check al `DataDiagnostic.js`
5. Documentar el endpoint en `docs/DATA_SOURCES.md`

### Añadir un nuevo componente de UI

1. Crear `components/NombreComponente.js`
2. No incluir lógica de fetch ni estado de datos — solo recibir props
3. Usar siempre las fuentes tipográficas del sistema:
   - `Spectral_400Regular` / `Spectral_500Medium` para texto serif
   - `JetBrainsMono_400Regular` / `JetBrainsMono_500Medium` para mono/datos
4. Usar siempre los colores de `theme.js`, nunca hex hardcodeados
5. Blindar contra props `undefined`/`null`/`NaN` antes de renderizar

### Añadir un nuevo mecanismo biofísico

Añadir una tarjeta `<MechanismCard>` en la sección "06 · MECANISMOS" de
`App.js` con los cuatro props obligatorios:
```jsx
<MechanismCard
  title="Nombre del mecanismo"
  evidence="established" // o "partial" o "hypothesis"
  mechanism="Descripción del mecanismo físico/biológico real"
  source="Autor, año · Revista — descripción del nivel de evidencia"
/>
```

**No se acepta `evidence="established"` sin una referencia peer-reviewed
con mecanismo celular o molecular descrito.**

---

## Estándares de código

### Regla de NaN cero
Ningún componente puede renderizar `NaN` en pantalla. Todos los valores
numéricos deben validarse con `Number.isFinite()` antes de usarlos.
Si el valor no es válido, mostrar `'—'` y marcar `isLive: false`.

### Regla de fallback honesto
Si una fuente de datos falla, la app cae a un valor simulado razonable
pero **siempre** lo marca visualmente (asterisco `*`, color diferente,
o texto explicativo). Nunca se presenta un dato simulado como real.

### Regla de la ref mutable
Si un hook usa `setInterval` y necesita leer un valor que cambia frecuentemente
(como la lectura del sensor cada 800ms), usar `useRef` en vez del estado para
evitar que el intervalo se reinicie en cada actualización.

---

## Tests con DataDiagnostic

Antes de abrir cualquier PR, ejecutar el panel de diagnóstico en la app
(sección "00 · DIAGNÓSTICO" → "Ejecutar todo") y confirmar que todos los
checks muestran ✅ OK. Incluir una captura en el PR si algún check
muestra FALLO con justificación de por qué es esperado o inevitable.

---

## Flujo de trabajo Git

```bash
# Rama por funcionalidad
git checkout -b feature/nombre-funcionalidad

# Commits descriptivos en español o inglés
git commit -m "Añade sensor de temperatura corporal via cámara infrarroja"

# Push y PR a main
git push origin feature/nombre-funcionalidad
```

### Convenciones de commit
- `Añade / Add` — nueva funcionalidad
- `Fix` — corrección de bug
- `Mejora / Refactor` — mejora sin cambio de comportamiento
- `Doc` — solo documentación
- `Fix formato` — adaptación a cambios de API externos (como el Kp de NOAA)

---

## Roadmap abierto

Áreas donde se aceptan contribuciones prioritariamente:

- **Algoritmo PPG mejorado**: migrar a `react-native-vision-camera` en un
  development build propio para tener frame processors reales en vez de
  capturas de foto sucesivas
- **Correlaciones estadísticas en la bitácora**: análisis de Pearson entre
  el estado subjetivo registrado y el índice disipativo del momento
- **Exportación de datos**: CSV o JSON de las entradas de la bitácora
  para análisis externo
- **Clave NASA por usuario**: UI en la app para que el usuario introduzca
  su propia clave sin necesidad de editar `.env` manualmente
- **Notificaciones**: alerta local cuando el Kp supera 5 (G1, tormenta
  geomagnética menor)
- **Integración con wearables**: Garmin Connect IQ, Apple Watch, para
  VFC (variabilidad de frecuencia cardíaca) real en vez de PPG por cámara

---

## Contacto y autoría

**Dirección científica y desarrollo:** Benjamín Cabeza Durán
**Organización:** Chizhevsky Foundation (`chizhevsky-foundation.github.io`)
**Repositorio:** `mechmind-dwv/noosfera-app`

*"En la acción de organizar, el universo no solo se disipa; se enriquece."*
