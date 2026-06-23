// hooks/useLightSensor.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { LightSensor } from 'expo-sensors';

const SIMULATED_INTERVAL_MS = 2500;
const SIMULATED_BASELINE_LUX = 300;

/**
 * Hook del sensor de luz ambiental del dispositivo (lux).
 *
 * IMPORTANTE: expo-sensors LightSensor solo está disponible en Android.
 * En iOS y web no existe esta API a nivel de plataforma — no es una
 * limitación de Expo, es que Apple no la expone públicamente. El hook
 * lo refleja con `platformSupported: false` para que la UI pueda mostrar
 * un mensaje honesto en vez de fingir que el sensor existe.
 */
export function useLightSensor() {
  const [lux, setLux] = useState(SIMULATED_BASELINE_LUX);
  const [sensorActive, setSensorActive] = useState(false);
  const [sensorAvailable, setSensorAvailable] = useState(true);
  const subscriptionRef = useRef(null);

  const platformSupported = Platform.OS === 'android';

  const startSimulated = useCallback(() => {
    const interval = setInterval(() => {
      setLux(SIMULATED_BASELINE_LUX + (Math.random() - 0.5) * 100);
    }, SIMULATED_INTERVAL_MS);
    return interval;
  }, []);

  useEffect(() => {
    const simInterval = sensorActive ? null : startSimulated();
    return () => simInterval && clearInterval(simInterval);
  }, [sensorActive, startSimulated]);

  const activateSensor = useCallback(async () => {
    if (!platformSupported) {
      setSensorAvailable(false);
      return;
    }
    try {
      const isAvailable = await LightSensor.isAvailableAsync();
      if (!isAvailable) {
        setSensorAvailable(false);
        return;
      }
      LightSensor.setUpdateInterval(1000);
      subscriptionRef.current = LightSensor.addListener(({ illuminance }) => {
        if (Number.isFinite(illuminance)) setLux(illuminance);
      });
      setSensorActive(true);
    } catch (e) {
      setSensorAvailable(false);
    }
  }, [platformSupported]);

  useEffect(() => {
    return () => {
      if (subscriptionRef.current) subscriptionRef.current.remove();
    };
  }, []);

  return { lux, sensorActive, sensorAvailable, platformSupported, activateSensor };
}
