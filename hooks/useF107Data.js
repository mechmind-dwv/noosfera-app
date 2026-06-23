// hooks/useF107Data.js
import { useState, useEffect, useCallback } from 'react';

const F107_URL = 'https://services.swpc.noaa.gov/json/f107_cm_flux.json';
const POLL_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Hook de datos del flujo solar F10.7 (radio a 2800 MHz, en sfu), NOAA SWPC.
 * Proxy clásico de actividad solar, complementario al índice Kp.
 *
 * El esquema exacto de nombre de campo en el JSON de NOAA puede variar entre
 * versiones del endpoint, así que probamos varios nombres probables y
 * validamos siempre con Number.isFinite antes de aceptar un valor.
 */
export function useF107Data() {
  const [f107, setF107] = useState(null);
  const [isLive, setIsLive] = useState(true);

  const fetchF107 = useCallback(async () => {
    try {
      const res = await fetch(F107_URL);
      if (!res.ok) throw new Error('network');
      const json = await res.json();
      if (!Array.isArray(json) || json.length === 0) throw new Error('empty');

      let value = null;
      for (let i = json.length - 1; i >= 0; i--) {
        const row = json[i];
        const candidate = parseFloat(
          row.flux ?? row.f107 ?? row.observed_flux ?? row.f107_flux ?? row.value
        );
        if (Number.isFinite(candidate)) {
          value = candidate;
          break;
        }
      }

      if (value === null) throw new Error('no valid F10.7 row found');

      setF107(value);
      setIsLive(true);
    } catch (e) {
      // Rango típico real: ~65 (mínimo solar) a ~300 (máximo solar), en sfu
      setF107(70 + Math.random() * 40);
      setIsLive(false);
    }
  }, []);

  useEffect(() => {
    fetchF107();
    const interval = setInterval(fetchF107, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchF107]);

  return { f107, isLive };
}
