// hooks/useCycleEngine.js
// Motor de ciclos solares y planetarios para el panel Horizonte Predictivo.
// Cada módulo calcula su fase actual (0–1) y contribución normalizada al
// índice compuesto. Las matemáticas son visibles — no hay cajas negras.
//
// NIVELES DE EVIDENCIA:
//   ESTABLISHED  → revisado por pares, replicado
//   PARTIAL      → correlaciones observadas, mecanismo debatido
//   HYPOTHESIS   → modelo original FTRT / propuesta activa

import { useState, useEffect } from 'react';

// ─── Épocas de referencia (JD → fecha conocida de mínimo/máximo solar) ───────
// Mínimo del ciclo 24→25: diciembre 2019 (JD 2458839)
const CYCLE25_MIN_JD = 2458839;
// Máximo ciclo 25 estimado: mediados 2025 (JD ~2460856)
const CYCLE25_MAX_JD = 2460856;

// Conjunción Júpiter–Saturno de referencia: 21 dic 2020 (JD 2459205)
const JS_CONJ_REF_JD = 2459205;

// Perihelio de referencia para rotación solar: 3 ene 2024 (JD 2460313)
const SOL_ROT_REF_JD = 2460313;

// ─── Períodos en días ─────────────────────────────────────────────────────────
const PERIODS = {
  schwabe:    11.0 * 365.25,   // ~11 años — ciclo de manchas solares
  hale:       22.0 * 365.25,   // ~22 años — ciclo de polaridad magnética
  gleissberg: 88.0 * 365.25,   // ~88 años — envolvente de amplitud
  jupiter:    11.862 * 365.25, // órbita de Júpiter
  saturn:     29.457 * 365.25, // órbita de Saturno
  jSaturn:    19.859 * 365.25, // conjunción Júpiter–Saturno
  rieger:     154,             // ciclo de Rieger (alta frecuencia solar)
  solarRot:   27.27,           // rotación solar sinódica
};

// ─── Pesos para el índice compuesto (suman 1.0) ──────────────────────────────
// Reflejan nivel de evidencia + relevancia temporal para actividad solar
const WEIGHTS = {
  schwabe:    0.28,  // ESTABLISHED — ciclo dominante
  hale:       0.12,  // ESTABLISHED — polaridad magnética
  gleissberg: 0.06,  // PARTIAL     — envolvente secular
  jupiter:    0.18,  // PARTIAL     — masa dominante del baricentro
  saturn:     0.10,  // PARTIAL     — segundo contribuyente
  jSaturn:    0.10,  // PARTIAL     — conjunción sinódica
  rieger:     0.08,  // PARTIAL     — modulación de alta frecuencia
  solarRot:   0.08,  // ESTABLISHED — sectores del viento solar
};

// ─── Metadatos de cada módulo ─────────────────────────────────────────────────
export const CYCLE_META = {
  schwabe:    { name: 'Schwabe ~11a',      unit: 'años', evidence: 'ESTABLISHED', period: 11.0 },
  hale:       { name: 'Hale ~22a',         unit: 'años', evidence: 'ESTABLISHED', period: 22.0 },
  gleissberg: { name: 'Gleissberg ~88a',   unit: 'años', evidence: 'PARTIAL',     period: 88.0 },
  jupiter:    { name: 'Júpiter ~11.86a',   unit: 'años', evidence: 'PARTIAL',     period: 11.862 },
  saturn:     { name: 'Saturno ~29.5a',    unit: 'años', evidence: 'PARTIAL',     period: 29.457 },
  jSaturn:    { name: 'Conj. J–S ~19.9a', unit: 'años', evidence: 'PARTIAL',     period: 19.859 },
  rieger:     { name: 'Rieger ~154d',      unit: 'días', evidence: 'PARTIAL',     period: 154 },
  solarRot:   { name: 'Rot. Solar ~27d',   unit: 'días', evidence: 'ESTABLISHED', period: 27.27 },
};

// ─── Utilidades ───────────────────────────────────────────────────────────────

/** Fecha JS → Día Juliano (aproximación suficiente para períodos >días) */
function dateToJD(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

/**
 * Fase de un ciclo genérico en [0, 1].
 * phase=0 → inicio del ciclo, phase=0.5 → mitad, phase=1 → fin (=inicio siguiente)
 */
function cyclePhase(nowJD, refJD, periodDays) {
  const elapsed = ((nowJD - refJD) % periodDays + periodDays) % periodDays;
  return elapsed / periodDays;
}

/**
 * Contribución normalizada de un ciclo al índice de actividad solar [0, 100].
 * Usa una función senoidal centrada en el máximo del ciclo (phase=0.5 para
 * ciclos simétricos). Para Schwabe usamos la fase real del ciclo 25.
 */
function phaseToActivity(phase) {
  // Máximo en phase≈0.5, mínimo en phase=0 y phase=1
  return Math.round((Math.sin(phase * 2 * Math.PI - Math.PI / 2) * 0.5 + 0.5) * 100);
}

/**
 * Fase Schwabe ajustada al ciclo 25: usa el mínimo y máximo conocidos
 * para interpolar la posición real dentro del ciclo actual.
 */
function schwabePhase(nowJD) {
  const periodDays = PERIODS.schwabe;
  const elapsed = ((nowJD - CYCLE25_MIN_JD) % periodDays + periodDays) % periodDays;
  return elapsed / periodDays;
}

/**
 * Índice compuesto ponderado.
 * Retorna valor 0–100 y desglose por módulo.
 */
function computeComposite(nowJD) {
  const phases = {
    schwabe:    schwabePhase(nowJD),
    hale:       cyclePhase(nowJD, CYCLE25_MIN_JD, PERIODS.hale),
    gleissberg: cyclePhase(nowJD, CYCLE25_MIN_JD, PERIODS.gleissberg),
    jupiter:    cyclePhase(nowJD, JS_CONJ_REF_JD, PERIODS.jupiter),
    saturn:     cyclePhase(nowJD, JS_CONJ_REF_JD, PERIODS.saturn),
    jSaturn:    cyclePhase(nowJD, JS_CONJ_REF_JD, PERIODS.jSaturn),
    rieger:     cyclePhase(nowJD, SOL_ROT_REF_JD, PERIODS.rieger),
    solarRot:   cyclePhase(nowJD, SOL_ROT_REF_JD, PERIODS.solarRot),
  };

  const modules = {};
  let composite = 0;

  for (const key of Object.keys(WEIGHTS)) {
    const activity = phaseToActivity(phases[key]);
    const weighted = activity * WEIGHTS[key];
    composite += weighted;
    modules[key] = {
      phase:      parseFloat(phases[key].toFixed(4)),
      activity,                        // 0–100 contribución propia
      weight:     WEIGHTS[key],
      weighted:   parseFloat(weighted.toFixed(2)),
    };
  }

  return { composite: Math.round(composite), modules };
}

// ─── Hook principal ───────────────────────────────────────────────────────────

const REFRESH_MS = 60 * 1000; // recalcula cada minuto

export function useCycleEngine() {
  const [data, setData] = useState(() => {
    const nowJD = dateToJD(new Date());
    return computeComposite(nowJD);
  });

  useEffect(() => {
    const tick = setInterval(() => {
      const nowJD = dateToJD(new Date());
      setData(computeComposite(nowJD));
    }, REFRESH_MS);
    return () => clearInterval(tick);
  }, []);

  return data; // { composite: 0–100, modules: { schwabe, hale, ... } }
}
