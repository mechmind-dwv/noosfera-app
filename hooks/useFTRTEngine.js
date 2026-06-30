// hooks/useFTRTEngine.js
// Motor FTRT — Fuerzas de Marea Relativas Totales sobre el baricentro solar.
// Modelo original: Benjamín / Chizhevsky Foundation.
//
// Calcula la fuerza de marea gravitatoria de cada planeta sobre el Sol
// respecto al baricentro del sistema solar, proyectada 14 días.
//
// REGLA DE DESACOPLAMIENTO [HYPOTHESIS]:
//   Cuando el baricentro supera ~3 radios solares desde el centro del Sol,
//   el Sol no responde a valores FTRT elevados.
//
// NIVEL DE EVIDENCIA FTRT: HYPOTHESIS (Spearman ρ=0.894 en dataset corregido)

import { useState, useEffect } from 'react';

// ─── Constantes físicas ───────────────────────────────────────────────────────
const GM_SUN  = 1.327124e20;  // m³/s²
const R_SUN   = 6.957e8;      // metros — radio solar

// Masas relativas al Sol (M_planeta / M_sol)
const MASS_REL = {
  jupiter: 9.5479e-4,
  saturn:  2.8588e-4,
  venus:   2.4478e-6,
  earth:   3.0034e-6,
  mars:    3.2271e-7,
  uranus:  4.3659e-5,
  neptune: 5.1513e-5,
};

// Semi-ejes mayores en UA
const AU = 1.496e11; // metros por UA
const SEMI_MAJOR_AU = {
  jupiter: 5.2034,
  saturn:  9.5371,
  venus:   0.7233,
  earth:   1.0000,
  mars:    1.5237,
  uranus:  19.191,
  neptune: 30.069,
};

// Períodos orbitales en días
const PERIOD_DAYS = {
  jupiter: 4332.59,
  saturn:  10759.22,
  venus:   224.70,
  earth:   365.25,
  mars:    686.97,
  uranus:  30688.5,
  neptune: 60182.0,
};

// Longitudes medias en J2000 (grados)
const L0 = {
  jupiter: 34.40,
  saturn:  49.94,
  venus:   181.97,
  earth:   100.46,
  mars:    355.45,
  uranus:  313.23,
  neptune: 304.88,
};

// ─── Utilidades ───────────────────────────────────────────────────────────────

function dateToJD(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

const J2000 = 2451545.0;

/** Longitud media de un planeta en grados para un JD dado */
function meanLongitude(planet, jd) {
  const T = (jd - J2000) / PERIOD_DAYS[planet];
  return ((L0[planet] + 360 * T) % 360 + 360) % 360;
}

/**
 * Posición heliocéntrica simplificada (órbita circular).
 * Retorna [x, y] en metros.
 */
function helioPosition(planet, jd) {
  const lon = meanLongitude(planet, jd) * (Math.PI / 180);
  const r   = SEMI_MAJOR_AU[planet] * AU;
  return [r * Math.cos(lon), r * Math.sin(lon)];
}

/**
 * Posición del baricentro del sistema solar relativa al centro del Sol,
 * en radios solares. Solo incluye los planetas masivos dominantes.
 */
function barycentreOffset(jd) {
  const planets = ['jupiter', 'saturn', 'uranus', 'neptune'];
  let bx = 0, by = 0;
  const M_total = planets.reduce((s, p) => s + MASS_REL[p], 0);

  for (const p of planets) {
    const [x, y] = helioPosition(p, jd);
    bx += MASS_REL[p] * x;
    by += MASS_REL[p] * y;
  }

  // Posición del baricentro en metros (relativa al Sol)
  const bxM = bx / M_total;  // no dividimos por M_total para baricentro correcto
  // Corrección: baricentro = Σ(m_i * r_i) / Σ(m_i + 1) ≈ Σ(m_rel_i * r_i)
  const scale = 1 / (1 + M_total);
  const bxFinal = bx * scale;
  const byFinal = by * scale;

  const distMetros = Math.sqrt(bxFinal ** 2 + byFinal ** 2);
  return distMetros / R_SUN; // en radios solares
}

/**
 * Fuerza de marea total normalizada (FTRT) para un JD dado.
 * Σ G·M_planeta / d_planeta² normalizado a escala 0–100.
 *
 * La fuerza de marea real es proporcional a M/r³ pero usamos M/r²
 * como proxy de perturbación al baricentro (modelo FTRT original).
 */
function computeFTRT(jd) {
  let ftrt = 0;
  for (const planet of Object.keys(MASS_REL)) {
    const [x, y] = helioPosition(planet, jd);
    const r = Math.sqrt(x ** 2 + y ** 2);
    ftrt += MASS_REL[planet] / (r / AU) ** 2;
  }
  // Normalizar: el máximo teórico aproximado es ~0.00135 (todos en conjunción)
  return Math.min((ftrt / 0.00135) * 100, 100);
}

/**
 * Genera proyección de 14 días desde hoy.
 * Cada entrada: { date, ftrt, baryRsun, decoupled }
 */
function computeProjection(startJD, days = 14) {
  const projection = [];
  for (let i = 0; i < days; i++) {
    const jd   = startJD + i;
    const ftrt = parseFloat(computeFTRT(jd).toFixed(1));
    const bary = parseFloat(barycentreOffset(jd).toFixed(2));
    const decoupled = bary > 3.0; // regla de desacoplamiento

    const date = new Date((jd - 2440587.5) * 86400000);
    projection.push({
      day:       i,
      date:      date.toISOString().slice(0, 10),
      dayLabel:  date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
      ftrt,
      baryRsun:  bary,
      decoupled,
    });
  }
  return projection;
}

// ─── Hook principal ───────────────────────────────────────────────────────────

const REFRESH_MS = 5 * 60 * 1000; // refresca cada 5 minutos

export function useFTRTEngine() {
  const [data, setData] = useState(() => {
    const nowJD = dateToJD(new Date());
    return {
      today:      parseFloat(computeFTRT(nowJD).toFixed(1)),
      baryToday:  parseFloat(barycentreOffset(nowJD).toFixed(2)),
      decoupled:  barycentreOffset(nowJD) > 3.0,
      projection: computeProjection(nowJD),
    };
  });

  useEffect(() => {
    const tick = setInterval(() => {
      const nowJD = dateToJD(new Date());
      setData({
        today:      parseFloat(computeFTRT(nowJD).toFixed(1)),
        baryToday:  parseFloat(barycentreOffset(nowJD).toFixed(2)),
        decoupled:  barycentreOffset(nowJD) > 3.0,
        projection: computeProjection(nowJD),
      });
    }, REFRESH_MS);
    return () => clearInterval(tick);
  }, []);

  return data;
  // { today, baryToday, decoupled, projection: [{day,date,dayLabel,ftrt,baryRsun,decoupled}] }
}
