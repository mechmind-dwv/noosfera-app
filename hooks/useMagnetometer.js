// hooks/useMagnetometer.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { Magnetometer } from 'expo-sensors';

export const MAG_BASELINE = 48; // μT, aproximación de campo terrestre típico
const SIMULATED_INTERVAL_MS = 2000;

/**
 * Hook del magnetómetro del dispositivo, con fallback a una estimación
 * basal simulada cuando el sensor no está disponible, el permiso es
 * denegado, o la plataforma es web (donde expo-sensors no expone el
 * módulo nativo). El fallback nunca pretende ser un dato real: el
 * consumidor del hook recibe `sensorActive: false` para poder marcarlo
 * visualmente (p.ej. con un asterisco).
 */
export function useMagnetometer() {
  const [mag, setMag] = useState(MAG_BASELINE);
  const [sensorActive, setSensorActive] = useState(false);
  const [sensorAvailable, setSensorAvailable] = useState(true);

  const subscriptionRef = useRef(null);
  const magRef = useRef(MAG_BASELINE);

  const startSimulated = useCallback(() => {
    const interval = setInterval(() => {
      const next = MAG_BASELINE + (Math.random() - 0.5) * 6;
      magRef.current = next;
      setMag(next);
    }, SIMULATED_INTERVAL_MS);
    return interval;
  }, []);

  useEffect(() => {
    const simInterval = sensorActive ? null : startSimulated();
    return () => simInterval && clearInterval(simInterval);
  }, [sensorActive, startSimulated]);

  const activateSensor = useCallback(async () => {
    if (Platform.OS === 'web') {
      // El módulo nativo de Magnetometer no existe en navegador.
      // No lo intentamos: pasamos directo al modo simulado, sin errores en consola.
      setSensorAvailable(false);
      return;
    }
    try {
      const { status } = await Magnetometer.requestPermissionsAsync();
      if (status !== 'granted') {
        setSensorAvailable(false);
        return;
      }
      Magnetometer.setUpdateInterval(800);
      subscriptionRef.current = Magnetometer.addListener((data) => {
        const magnitude = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);
        magRef.current = magnitude;
        setMag(magnitude);
      });
      setSensorActive(true);
    } catch (e) {
      setSensorAvailable(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (subscriptionRef.current) subscriptionRef.current.remove();
    };
  }, []);

  return { mag, magRef, sensorActive, sensorAvailable, activateSensor };
}
