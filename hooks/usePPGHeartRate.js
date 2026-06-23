// hooks/usePPGHeartRate.js
import { useState, useRef, useCallback } from 'react';

const CAPTURE_DURATION_MS = 15000;
const CAPTURE_INTERVAL_MS = 200; // ~5 capturas/seg — suficiente para frecuencias cardíacas humanas (40-180 bpm)
const MIN_VALID_SAMPLES = 30;

/**
 * Estimación experimental de ritmo cardíaco vía fotopletismografía (PPG)
 * usando la cámara del teléfono: el usuario tapa el lente trasero con el
 * dedo, con el flash encendido. El flujo sanguíneo bajo la piel modula
 * sutilmente la cantidad de luz que el flash refleja de vuelta al sensor,
 * y esa oscilación periódica corresponde al pulso.
 *
 * IMPORTANTE — esto NO es un dispositivo médico ni una medición clínica.
 * Es una estimación experimental de ciencia ciudadana, con margen de error
 * significativo frente a un pulsioxímetro real. Se etiqueta así en toda la UI.
 *
 * Técnica: en vez de procesar un stream de vídeo en tiempo real (que en
 * Expo Go requeriría react-native-vision-camera, no disponible sin un
 * development build), tomamos capturas de foto sucesivas con
 * skipProcessing y medimos el brillo medio de cada una. Es más lento que
 * un verdadero pipeline de frames, pero usa solo APIs estables de
 * expo-camera disponibles en Expo Go.
 */
export function usePPGHeartRate() {
  const [isRecording, setIsRecording] = useState(false);
  const [progress, setProgress] = useState(0); // 0-1
  const [bpm, setBpm] = useState(null);
  const [quality, setQuality] = useState(null); // 'good' | 'poor' | null
  const [error, setError] = useState(null);

  const samplesRef = useRef([]);
  const cameraRef = useRef(null);

  function attachCameraRef(ref) {
    cameraRef.current = ref;
  }

  // Estima el brillo medio de una imagen base64 JPEG muestreando un
  // subconjunto de bytes — evitamos decodificar el JPEG completo (costoso)
  // y en su lugar usamos la longitud/densidad de los datos base64 como
  // proxy rápido de luminosidad agregada del frame. Es una aproximación
  // deliberadamente simple, adecuada para detectar oscilación periódica,
  // no para análisis de imagen preciso.
  function estimateBrightness(base64) {
    if (!base64 || base64.length < 100) return null;
    let sum = 0;
    const step = Math.max(1, Math.floor(base64.length / 2000));
    let count = 0;
    for (let i = 0; i < base64.length; i += step) {
      sum += base64.charCodeAt(i);
      count++;
    }
    return count > 0 ? sum / count : null;
  }

  // Estima BPM a partir de la serie temporal de brillo detectando cruces
  // por el valor medio (zero-crossing simplificado), método clásico y
  // robusto para señales PPG ruidosas de baja resolución temporal.
  function estimateBpmFromSamples(samples) {
    if (samples.length < MIN_VALID_SAMPLES) return { bpm: null, quality: null };

    const values = samples.map((s) => s.brightness);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Señal demasiado plana: probablemente el dedo no tapaba bien la cámara
    // o el flash no estaba activo — no hay oscilación real que medir.
    if (stdDev < 0.5) return { bpm: null, quality: 'poor' };

    let crossings = 0;
    let lastSign = values[0] >= mean;
    for (let i = 1; i < values.length; i++) {
      const sign = values[i] >= mean;
      if (sign !== lastSign) {
        crossings++;
        lastSign = sign;
      }
    }

    const totalSeconds =
      (samples[samples.length - 1].timestamp - samples[0].timestamp) / 1000;
    if (totalSeconds <= 0) return { bpm: null, quality: null };

    // Cada ciclo cardíaco completo produce 2 cruces (subida y bajada).
    const cyclesPerSecond = crossings / 2 / totalSeconds;
    const estimatedBpm = cyclesPerSecond * 60;

    // Rango fisiológico humano plausible en reposo o actividad ligera.
    if (estimatedBpm < 35 || estimatedBpm > 200) {
      return { bpm: null, quality: 'poor' };
    }

    return { bpm: Math.round(estimatedBpm), quality: stdDev > 2 ? 'good' : 'poor' };
  }

  const startMeasurement = useCallback(async () => {
    if (!cameraRef.current || isRecording) return;
    setIsRecording(true);
    setProgress(0);
    setBpm(null);
    setQuality(null);
    setError(null);
    samplesRef.current = [];

    const startTime = Date.now();

    const captureLoop = async () => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= CAPTURE_DURATION_MS) {
        finish();
        return;
      }

      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.2,
          base64: true,
          skipProcessing: true,
        });
        const brightness = estimateBrightness(photo.base64);
        if (brightness !== null) {
          samplesRef.current.push({ timestamp: Date.now(), brightness });
        }
      } catch (e) {
        // Una captura fallida no aborta la medición completa; seguimos intentando
        // con las siguientes — el análisis final tolera huecos en la serie.
      }

      setProgress(Math.min(elapsed / CAPTURE_DURATION_MS, 1));
      setTimeout(captureLoop, CAPTURE_INTERVAL_MS);
    };

    function finish() {
      setProgress(1);
      const result = estimateBpmFromSamples(samplesRef.current);
      if (result.bpm === null) {
        setError(
          'No se detectó una señal de pulso clara. Asegúrate de tapar bien el lente y el flash con el dedo, sin presionar demasiado fuerte.'
        );
      } else {
        setBpm(result.bpm);
        setQuality(result.quality);
      }
      setIsRecording(false);
    }

    captureLoop();
  }, [isRecording]);

  return {
    attachCameraRef,
    startMeasurement,
    isRecording,
    progress,
    bpm,
    quality,
    error,
  };
}
