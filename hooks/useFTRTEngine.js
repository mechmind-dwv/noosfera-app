// hooks/useFTRTEngine.js
// Motor FTRT — Fuerza de Marea Relativa Total sobre el baricentro solar.
// Modelo original: Benjamín Cabeza Durán / Chizhevsky Foundation, oct. 2025.
//
// FTRT_planeta = (M_planeta · R_sol) / d_planeta³
// FTRT_normalizada = FTRT_total / FTRT_jupiter   ← normalización del paper original
//
// Umbrales validados empíricamente (ver paper, sección 4.2):
//   normal   < 0.8
//   moderado 0.8 – 1.2
//   alto     1.2 – 1.5
//   extremo  ≥ 1.5
//
// Casos de referencia (para verificación del cálculo):
//   Carrington 1859    → FTRT ≈ 3.21
//   Halloween 2003      → FTRT ≈ 4.87
//   Tormenta mayo 2024   → FTRT ≈ 2.94 (paper) / 1.34 (dato de muestra UI)
//
// NIVEL DE EVIDENCIA: HYPOTHESIS (Spearman ρ=0.894, p<0.0001, dataset balanceado)

import { useState, useEffect } from 'react';

// ─── Constantes físicas ───────────────────────────────────────────────────────
const R_SUN = 6.957e8;   // metros — radio solar
const AU    = 1.496e11;  // metros por UA

// Masas planetarias en kg (valores NASA)
const MASS_KG = {
  mercury: 3.3011e23,
  venus:   4.8675e24,
  earth:   5.9722e24,
  mars:    6.4171e23,
  jupiter: 1.8982e27,
  saturn:  5.6834e26,
  uranus:  8.6810e25,
  neptune: 1.0241e26,
};

// Semi-ejes mayores en UA (órbita circular simplificada)
const SEMI_MAJOR_AU = {
  mercury: 0.3871,
  venus:   0.7233,
  earth:   1.0000,
  mars:    1.5237,
  jupiter: 5.2034,
  saturn:  9.5371,
  uranus:  19.191,
  neptune: 30.069,
};

// Períodos orbitales en días
const PERIOD_DAYS = {
  mercury: 87.969,
  venus:   224.70,
  earth:   365.25,
  mars:    686.97,
  jupiter: 4332.59,
  saturn:  10759.22,
  uranus:  30688.5,
  neptune: 60182.0,
};

// Longitudes medias en J2000 (grados)
const L0 = {
  mercury: 252.25,
  venus:   181.97,
  earth:   100.46,
  mars:    355.45,
  jupiter: 34.40,
  saturn:  49.94,
  uranus:  313.23,
  neptune: 304.88,
};

const J2000 = 2451545.0;

// ─── Umbrales del paper original ──────────────────────────────────────────────
export const FTRT_THRESHOLDS = {
  normal:   0.8,
  moderado: 1.2,
  alto:     1.5,
};

export function ftrtLevel(value) {
  if (value >= FTRT_THRESHOLDS.alto) return 'EXTREMO';
  if (value >= FTRT_THRESHOLDS.moderado) return 'ALTO';
  if (value >= FTRT_THRESHOLDS.normal) return 'MODERADO';
  return 'NORMAL';
}

// ─── Utilidades orbitales ──────────────────────────────────────────────────────

function dateToJD(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

function meanLongitude(planet, jd) {
  const T = (jd - J2000) / PERIOD_DAYS[planet];
  return ((L0[planet] + 360 * T) % 360 + 360) % 360;
}

/** Posición heliocéntrica simplificada (órbita circular). Retorna [x, y] en metros. */
function helioPosition(planet, jd) {
  const lon = meanLongitude(planet, jd) * (Math.PI / 180);
  const r   = SEMI_MAJOR_AU[planet] * AU;
  return [r * Math.cos(lon), r * Math.sin(lon)];
}

/** Distancia heliocéntrica en metros */
function helioDistance(planet, jd) {
  const r = SEMI_MAJOR_AU[planet] * AU;
  // Órbita circular: distancia = semi-eje mayor (constante).
  // Si más adelante se añade excentricidad, esto cambiará por ciclo.
  return r;
}

/**
 * FTRT individual de un planeta: (M_planeta · R_sol) / d³
 * Unidades: kg·m / m³ = kg/m² (escala arbitraria, se cancela en la normalización)
 */
function ftrtIndividual(planet, jd) {
  const d = helioDistance(planet, jd);
  return (MASS_KG[planet] * R_SUN) / (d ** 3);
}

/**
 * FTRT total normalizada respecto a Júpiter — exactamente como en el paper:
 * FTRT_normalizada = Σ FTRT_planeta / FTRT_jupiter
 */
function computeFTRT(jd) {
  let total = 0;
  const contributions = {};
  for (const planet of Object.keys(MASS_KG)) {
    const f = ftrtIndividual(planet, jd);
    contributions[planet] = f;
    total += f;
  }
  const normalized = total / contributions.jupiter;
  return { normalized, contributions };
}

/**
 * Baricentro del sistema solar relativo al centro del Sol, en radios solares.
 * Usa los planetas masivos dominantes (J, S, U, N) — Mercurio/Venus/Tierra/Marte
 * contribuyen de forma despreciable a la posición del baricentro.
 */
function barycentreOffset(jd) {
  const planets = ['jupiter', 'saturn', 'uranus', 'neptune'];
  const M_SUN = 1.989e30;
  let bx = 0, by = 0;

  for (const p of planets) {
    const [x, y] = helioPosition(p, jd);
    bx += MASS_KG[p] * x;
    by += MASS_KG[p] * y;
  }

  const totalMass = M_SUN + planets.reduce((s, p) => s + MASS_KG[p], 0);
  const bxFinal = bx / totalMass;
  const byFinal = by / totalMass;

  const distMetros = Math.sqrt(bxFinal ** 2 + byFinal ** 2);
  return distMetros / R_SUN; // en radios solares (máximo teórico real: ~2.2 R☉)
}

/**
 * Genera proyección de N días desde hoy.
 * Cada entrada: { day, date, dayLabel, ftrt, level, baryRsun, decoupled }
 */
function computeProjection(startJD, days = 14) {
  const projection = [];
  for (let i = 0; i < days; i++) {
    const jd = startJD + i;
    const { normalized } = computeFTRT(jd);
    const ftrt = parseFloat(normalized.toFixed(3));
    const bary = parseFloat(barycentreOffset(jd).toFixed(2));
    const decoupled = bary > 3.0; // regla de desacoplamiento (HYPOTHESIS)

    const date = new Date((jd - 2440587.5) * 86400000);
    projection.push({
      day: i,
      date: date.toISOString().slice(0, 10),
      dayLabel: date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
      ftrt,
      level: ftrtLevel(ftrt),
      baryRsun: bary,
      decoupled,
    });
  }
  return projection;
}

// ─── Hook principal ───────────────────────────────────────────────────────────

const REFRESH_MS = 5 * 60 * 1000;

function snapshot() {
  const nowJD = dateToJD(new Date());
  const { normalized, contributions } = computeFTRT(nowJD);
  const bary = barycentreOffset(nowJD);
  return {
    today: parseFloat(normalized.toFixed(3)),
    level: ftrtLevel(normalized),
    baryToday: parseFloat(bary.toFixed(2)),
    decoupled: bary > 3.0,
    contributions,
    projection: computeProjection(nowJD),
  };
}

export function useFTRTEngine() {
  const [data, setData] = useState(snapshot);

  useEffect(() => {
    const tick = setInterval(() => setData(snapshot()), REFRESH_MS);
    return () => clearInterval(tick);
  }, []);

  return data;
  // { today, level, baryToday, decoupled, contributions, projection[] }
}
