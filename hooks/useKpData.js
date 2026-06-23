// hooks/useKpData.js
import { useState, useEffect, useCallback } from 'react';

const KP_URL = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';
const POLL_INTERVAL_MS = 3 * 60 * 1000;

export function useKpData() {
  const [kp, setKp] = useState(null);
  const [kpHistory, setKpHistory] = useState([]);
  const [isLive, setIsLive] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchKp = useCallback(async () => {
    try {
      const res = await fetch(KP_URL);
      if (!res.ok) throw new Error('network');
      const json = await res.json();

      // El endpoint devuelve un array de objetos con la forma:
      // {"time_tag":"2026-06-15T00:00:00","Kp":2.00,"a_running":7,"station_count":8}
      // (formato actualizado por NOAA — antes era array de arrays con cabecera).
      const historyValues = [];
      for (let i = 0; i < json.length; i++) {
        const candidate = parseFloat(json[i].Kp);
        if (Number.isFinite(candidate)) historyValues.push(candidate);
      }

      if (historyValues.length === 0) throw new Error('no valid Kp row found');

      setKp(historyValues[historyValues.length - 1]);
      setKpHistory(historyValues);
      setIsLive(true);
      setLastUpdate(new Date());
    } catch (e) {
      setKp(2 + Math.random() * 1.5);
      setIsLive(false);
    }
  }, []);

  useEffect(() => {
    fetchKp();
    const interval = setInterval(fetchKp, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchKp]);

  return { kp, kpHistory, isLive, lastUpdate };
}
