// hooks/useUVIndex.js
import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';

const POLL_INTERVAL_MS = 20 * 60 * 1000;
const LOCATION_TIMEOUT_MS = 10000;

export function useUVIndex() {
  const [uvIndex, setUvIndex] = useState(null);
  const [isLive, setIsLive] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState('undetermined');
  const [locationLabel, setLocationLabel] = useState(null);

  const fetchUV = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);
      if (status !== 'granted') throw new Error('location permission denied');

      // Intentamos primero la última posición cacheada (instantánea, no requiere
      // fix de GPS fresco). Si no hay caché, caemos a getCurrentPositionAsync
      // con timeout de 10s para no bloquear indefinidamente en interiores.
      let position = await Location.getLastKnownPositionAsync({
        maxAge: 60 * 60 * 1000, // aceptamos posición de hasta 1h de antigüedad
        requiredAccuracy: 10000, // 10km es más que suficiente para UV
      });

      if (!position) {
        const positionPromise = Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
        });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('location timeout')), LOCATION_TIMEOUT_MS)
        );
        position = await Promise.race([positionPromise, timeoutPromise]);
      }

      const { latitude, longitude } = position.coords;
      setLocationLabel(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);

      const res = await fetch(
        `https://currentuvindex.com/api/v1/uvi?latitude=${latitude}&longitude=${longitude}`
      );
      if (!res.ok) throw new Error(`network response ${res.status}`);
      const json = await res.json();

      if (!json.ok || !json.now || !Number.isFinite(json.now.uvi)) {
        throw new Error('invalid UV response shape');
      }

      setUvIndex(json.now.uvi);
      setIsLive(true);
    } catch (e) {
      console.warn('[useUVIndex] fallo:', e && e.message, e);
      setUvIndex(Math.random() * 6);
      setIsLive(false);
    }
  }, []);

  useEffect(() => {
    fetchUV();
    const interval = setInterval(fetchUV, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchUV]);

  return { uvIndex, isLive, permissionStatus, locationLabel, refetch: fetchUV };
}
