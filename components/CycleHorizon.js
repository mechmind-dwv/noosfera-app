// components/CycleHorizon.js
// Panel "Horizonte Predictivo" — muestra el índice compuesto de ciclos solares
// y planetarios con matemáticas completamente visibles (fases, pesos, valores).

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CYCLE_META } from '../hooks/useCycleEngine';
import { colors } from '../theme';

// ─── Color por nivel de evidencia ────────────────────────────────────────────
const EVIDENCE_COLOR = {
  ESTABLISHED: '#4fc3f7',
  PARTIAL:     '#ffb74d',
  HYPOTHESIS:  '#ce93d8',
};

// ─── Color por intensidad del índice (0–100) ──────────────────────────────────
function compositeColor(value) {
  if (value >= 75) return '#ef5350'; // alta carga
  if (value >= 50) return '#ffb74d'; // moderada
  if (value >= 25) return '#fff176'; // baja-moderada
  return '#81c784';                  // calma
}

// ─── Barra de progreso numérica ───────────────────────────────────────────────
function ProgressBar({ value, color }) {
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${value}%`, backgroundColor: color }]} />
    </View>
  );
}

// ─── Fila de un módulo individual ────────────────────────────────────────────
function ModuleRow({ id, mod }) {
  const meta   = CYCLE_META[id];
  const evCol  = EVIDENCE_COLOR[meta.evidence] || '#aaa';
  const actCol = compositeColor(mod.activity);

  return (
    <View style={styles.moduleRow}>
      {/* Nombre + badge evidencia */}
      <View style={styles.moduleHeader}>
        <Text style={styles.moduleName}>{meta.name}</Text>
        <Text style={[styles.evidenceBadge, { color: evCol }]}>{meta.evidence}</Text>
      </View>

      {/* Barra de actividad propia */}
      <ProgressBar value={mod.activity} color={actCol} />

      {/* Números detallados */}
      <View style={styles.moduleNums}>
        <Text style={styles.numLabel}>
          Fase <Text style={styles.numValue}>{(mod.phase * 100).toFixed(1)}%</Text>
        </Text>
        <Text style={styles.numLabel}>
          Actividad <Text style={styles.numValue}>{mod.activity}</Text>/100
        </Text>
        <Text style={styles.numLabel}>
          Peso <Text style={styles.numValue}>{(mod.weight * 100).toFixed(0)}%</Text>
        </Text>
        <Text style={styles.numLabel}>
          Aporte <Text style={styles.numValue}>{mod.weighted}</Text>
        </Text>
      </View>
    </View>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function CycleHorizon({ composite, modules }) {
  const [expanded, setExpanded] = useState(false);
  const compColor = compositeColor(composite);

  // Fórmula como string para mostrar las matemáticas
  const formulaStr = Object.keys(modules)
    .map((k) => `${modules[k].activity}×${(modules[k].weight * 100).toFixed(0)}%`)
    .join(' + ');

  return (
    <View style={styles.card}>
      {/* ── Cabecera ── */}
      <Text style={styles.title}>⊙ HORIZONTE PREDICTIVO</Text>
      <Text style={styles.subtitle}>Ciclos solares · Planetarios · Temporal</Text>

      {/* ── Índice compuesto grande ── */}
      <View style={styles.compositeRow}>
        <Text style={[styles.compositeValue, { color: compColor }]}>
          {composite}
        </Text>
        <Text style={styles.compositeUnit}>/100</Text>
      </View>
      <Text style={styles.compositeLabel}>ÍNDICE COMPUESTO DE CARGA ENERGÉTICA</Text>
      <ProgressBar value={composite} color={compColor} />

      {/* ── Fórmula visible ── */}
      <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.formulaBtn}>
        <Text style={styles.formulaLabel}>
          {expanded ? '▲ ocultar matemáticas' : '▼ ver matemáticas'}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.formulaBox}>
          <Text style={styles.formulaTitle}>Σ (actividad × peso) =</Text>
          <Text style={styles.formulaText}>{formulaStr}</Text>
          <Text style={styles.formulaResult}>= {composite} / 100</Text>
          <Text style={styles.formulaNote}>
            Pesos reflejan nivel de evidencia científica.{'\n'}
            Fase 0% = inicio ciclo · 50% = máximo · 100% = fin
          </Text>
        </View>
      )}

      {/* ── Desglose por módulo ── */}
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        activeOpacity={1}
      >
        <Text style={styles.sectionTitle}>DESGLOSE POR CICLO</Text>
      </TouchableOpacity>

      {Object.entries(modules).map(([id, mod]) => (
        <ModuleRow key={id} id={id} mod={mod} />
      ))}

      {/* ── Leyenda evidencia ── */}
      <View style={styles.legend}>
        {Object.entries(EVIDENCE_COLOR).map(([lvl, col]) => (
          <View key={lvl} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: col }]} />
            <Text style={styles.legendText}>{lvl}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    padding: 16,
    marginVertical: 10,
  },
  title: {
    fontFamily: 'JetBrainsMono_500Medium',
    color: '#e6edf3',
    fontSize: 13,
    letterSpacing: 2,
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: 'JetBrainsMono_400Regular',
    color: '#8b949e',
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 12,
  },
  compositeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 2,
  },
  compositeValue: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 56,
    lineHeight: 60,
  },
  compositeUnit: {
    fontFamily: 'JetBrainsMono_400Regular',
    color: '#8b949e',
    fontSize: 18,
    marginBottom: 8,
    marginLeft: 4,
  },
  compositeLabel: {
    fontFamily: 'JetBrainsMono_400Regular',
    color: '#8b949e',
    fontSize: 9,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  barTrack: {
    height: 4,
    backgroundColor: '#21262d',
    borderRadius: 2,
    marginVertical: 6,
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    borderRadius: 2,
  },
  formulaBtn: {
    marginTop: 8,
    marginBottom: 4,
  },
  formulaLabel: {
    fontFamily: 'JetBrainsMono_400Regular',
    color: '#58a6ff',
    fontSize: 10,
    letterSpacing: 1,
  },
  formulaBox: {
    backgroundColor: '#161b22',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  formulaTitle: {
    fontFamily: 'JetBrainsMono_400Regular',
    color: '#8b949e',
    fontSize: 9,
    marginBottom: 4,
  },
  formulaText: {
    fontFamily: 'JetBrainsMono_400Regular',
    color: '#e6edf3',
    fontSize: 9,
    lineHeight: 14,
    marginBottom: 4,
  },
  formulaResult: {
    fontFamily: 'JetBrainsMono_500Medium',
    color: '#58a6ff',
    fontSize: 11,
    marginBottom: 6,
  },
  formulaNote: {
    fontFamily: 'JetBrainsMono_400Regular',
    color: '#6e7681',
    fontSize: 9,
    lineHeight: 13,
  },
  sectionTitle: {
    fontFamily: 'JetBrainsMono_500Medium',
    color: '#8b949e',
    fontSize: 9,
    letterSpacing: 2,
    marginTop: 12,
    marginBottom: 8,
  },
  moduleRow: {
    borderTopWidth: 1,
    borderTopColor: '#21262d',
    paddingTop: 8,
    marginBottom: 4,
  },
  moduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  moduleName: {
    fontFamily: 'JetBrainsMono_500Medium',
    color: '#e6edf3',
    fontSize: 11,
  },
  evidenceBadge: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 8,
    letterSpacing: 1,
  },
  moduleNums: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  numLabel: {
    fontFamily: 'JetBrainsMono_400Regular',
    color: '#6e7681',
    fontSize: 9,
  },
  numValue: {
    color: '#e6edf3',
    fontFamily: 'JetBrainsMono_500Medium',
  },
  legend: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#21262d',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontFamily: 'JetBrainsMono_400Regular',
    color: '#6e7681',
    fontSize: 8,
  },
});
