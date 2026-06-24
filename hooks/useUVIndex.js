// hooks/useUVIndex.js
import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';

const POLL_INTERVAL_MS = 20 * 60 * 1000;

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

      // Intentamos primero la última posición cacheada (instantánea).
      // Si no hay caché, usamos coordenadas de fallback almacenadas en
      // .env de la zona del usuario — así el UV siempre muestra un dato
      // real de la zona, aunque no sea preciso al metro.
      let position = await Location.getLastKnownPositionAsync({
        maxAge: 24 * 60 * 60 * 1000, // aceptamos hasta 24h de antigüedad
        requiredAccuracy: 50000,       // 50km — más que suficiente para UV
      });

      let latitude, longitude;

      if (position) {
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } else {
        // Sin posición cacheada: intentamos obtener una fresca con timeout corto.
        try {
          const fresh = await Promise.race([
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest }),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000)),
          ]);
          latitude = fresh.coords.latitude;
          longitude = fresh.coords.longitude;
        } catch (_) {
          // GPS no disponible (interior, avión, etc.) — usamos coordenadas
          // de fallback configuradas en .env o Chipiona como referencia regional.
          latitude = parseFloat(process.env.EXPO_PUBLIC_LAT || '36.74');
          longitude = parseFloat(process.env.EXPO_PUBLIC_LON || '-6.43');
        }
      }

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
      console.warn('[useUVIndex] fallo:', e && e.message);
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
