// hooks/useDonkiData.js
import { useState, useEffect, useCallback } from 'react';

const POLL_INTERVAL_MS = 15 * 60 * 1000;

// Clave de la API de NASA DONKI. Se lee de la variable de entorno
// EXPO_PUBLIC_NASA_API_KEY (definida en .env, nunca commiteada al repo).
// Si no está configurada, cae a DEMO_KEY — funcional pero limitada a
// 30 peticiones/hora compartidas globalmente entre todos sus usuarios.
const NASA_API_KEY = process.env.EXPO_PUBLIC_NASA_API_KEY || 'DEMO_KEY';

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

/**
 * Hook de notificaciones de actividad solar (eyecciones de masa coronal,
 * llamaradas, tormentas geomagnéticas) de los últimos 7 días, vía NASA DONKI.
 *
 * `donki: null` con `isLive: true` es un resultado válido — significa que
 * no hubo eventos notables, no que algo falló. Solo `isLive: false` indica
 * que la petición en sí no pudo completarse.
 */
export function useDonkiData() {
  const [donki, setDonki] = useState(null);
  const [isLive, setIsLive] = useState(true);

  const fetchDonki = useCallback(async () => {
    try {
      const today = new Date();
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const url =
        `https://api.nasa.gov/DONKI/notifications?startDate=${formatDate(sevenDaysAgo)}` +
        `&endDate=${formatDate(today)}&type=all&api_key=${NASA_API_KEY}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('network');
      const json = await res.json();

      if (!Array.isArray(json) || json.length === 0) {
        setDonki(null); // sin eventos recientes es un resultado válido, no un error
        setIsLive(true);
        return;
      }

      const latest = json[json.length - 1];
      setDonki({
        type: latest.messageType || 'Evento',
        label: (latest.messageBody || '').slice(0, 140),
        time: latest.messageIssueTime || null,
      });
      setIsLive(true);
    } catch (e) {
      setDonki(null);
      setIsLive(false);
    }
  }, []);

  useEffect(() => {
    fetchDonki();
    const interval = setInterval(fetchDonki, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchDonki]);

  return { donki, isLive };
}
