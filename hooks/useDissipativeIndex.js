// hooks/useDissipativeIndex.js
import { useState, useEffect } from 'react';
import { clamp } from '../theme';
import { MAG_BASELINE } from './useMagnetometer';

const SCOPE_LEN = 60;
const TICK_INTERVAL_MS = 800;

function initialScopeData() {
  return Array.from({ length: SCOPE_LEN }, () => 0.3 + Math.random() * 0.05);
}

/**
 * Calcula el Índice de Carga Disipativa (0-100) a partir del campo magnético
 * local, el índice Kp, y un proxy simulado de ruido RF ambiental — ver
 * σ = Σ Jᵢ Xᵢ en el formalismo del proyecto.
 *
 * También mantiene la ventana deslizante de datos para el osciloscopio
 * (scopeData), actualizada en el mismo tick para que ambos se mantengan
 * sincronizados sin recalcular el índice dos veces por separado.
 */
export function useDissipativeIndex({ mag, magRef, kp }) {
  const [scopeData, setScopeData] = useState(initialScopeData);

  useEffect(() => {
    const tick = setInterval(() => {
      const magDeviation = clamp(Math.abs(magRef.current - MAG_BASELINE) / 25, 0, 1);
      const kpNorm = kp !== null ? clamp(kp / 9, 0, 1) : 0.25;
      const rfSim = 0.15 + Math.sin(Date.now() / 9000) * 0.08;
      const idx = clamp((magDeviation * 0.5 + kpNorm * 0.3 + rfSim * 0.2) * 100, 0, 100);

      setScopeData((prev) => [
        ...prev.slice(1),
        clamp(idx / 100 + (Math.random() - 0.5) * 0.04, 0, 1),
      ]);
    }, TICK_INTERVAL_MS);
    return () => clearInterval(tick);
  }, [kp, magRef]);

  const indexValue = clamp(
    (clamp(Math.abs(mag - MAG_BASELINE) / 25, 0, 1) * 0.5 +
      (kp !== null ? clamp(kp / 9, 0, 1) : 0.25) * 0.3 +
      (0.15 + Math.sin(Date.now() / 9000) * 0.08) * 0.2) *
      100,
    0,
    100
  );

  return { indexValue, scopeData };
}
