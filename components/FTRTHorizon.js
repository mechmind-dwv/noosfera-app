// components/FTRTHorizon.js
// Panel FTRT — Fuerza de Marea Relativa Total (normalizada respecto a Júpiter).
// Escala real del paper original: ~0.5 (calma) a 5+ (extremo histórico).
// Modelo original: Benjamín Cabeza Durán / Chizhevsky Foundation [HYPOTHESIS]

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { FTRT_THRESHOLDS } from '../hooks/useFTRTEngine';

// ─── Colores por nivel ────────────────────────────────────────────────────────
const LEVEL_COLOR = {
  NORMAL:   '#81c784',
  MODERADO: '#fff176',
  ALTO:     '#ffb74d',
  EXTREMO:  '#ef5350',
};

function ftrtColor(level, decoupled) {
  if (decoupled) return '#6e7681';
  return LEVEL_COLOR[level] || '#8b949e';
}

// Escala visual: normalizamos contra un techo de referencia (5.0 ≈ Halloween 2003)
const VISUAL_CEILING = 5.0;

// ─── Barra vertical para el gráfico de 14 días ───────────────────────────────
function DayBar({ entry }) {
  const fillH = Math.max((entry.ftrt / VISUAL_CEILING) * 80, 2);
  const col   = ftrtColor(entry.level, entry.decoupled);
  const isToday = entry.day === 0;

  return (
    <View style={styles.dayCol}>
      <Text style={[styles.barValue, { color: col }]}>
        {entry.decoupled ? '—' : entry.ftrt.toFixed(2)}
      </Text>
      <View style={styles.barTrackV}>
        <View style={[
          styles.barFillV,
          { height: fillH, backgroundColor: col, opacity: entry.decoupled ? 0.3 : 1 }
        ]} />
      </View>
      <Text style={styles.baryLabel}>{entry.baryRsun.toFixed(2)}R</Text>
      <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
        {entry.dayLabel}
      </Text>
      {entry.decoupled && <Text style={styles.decoupledDot}>⊗</Text>}
    </View>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function FTRTHorizon({ today, level, baryToday, decoupled, projection }) {
  const [showInfo, setShowInfo] = useState(false);
  const todayColor = ftrtColor(level, decoupled);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>⊛ FTRT — MAREAS PLANETARIAS</Text>
      <Text style={styles.subtitle}>
        Fuerza de Marea Relativa Total · normalizada vs Júpiter · 14 días
      </Text>
      <Text style={styles.evidenceBadge}>[HYPOTHESIS] ρ=0.894 p&lt;0.0001</Text>

      <View style={styles.todayRow}>
        <View>
          <Text style={[styles.todayValue, { color: todayColor }]}>
            {decoupled ? '—' : today.toFixed(2)}
          </Text>
          <Text style={styles.todayLabel}>FTRT HOY · {level}</Text>
        </View>
        <View style={styles.baryBox}>
          <Text style={[styles.baryValue, { color: baryToday > 3 ? '#6e7681' : '#4fc3f7' }]}>
            {baryToday.toFixed(2)} R☉
          </Text>
          <Text style={styles.baryTitle}>BARICENTRO</Text>
          {decoupled && <Text style={styles.decoupledWarn}>⊗ DESACOPLADO</Text>}
        </View>
      </View>

      <Text style={styles.sectionTitle}>PROYECCIÓN 14 DÍAS</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chartRow}>
          {projection.map((entry) => <DayBar key={entry.day} entry={entry} />)}
        </View>
      </ScrollView>

      <TouchableOpacity onPress={() => setShowInfo(!showInfo)} style={styles.infoBtn}>
        <Text style={styles.infoLabel}>
          {showInfo ? '▲ ocultar modelo' : '▼ ver modelo FTRT'}
        </Text>
      </TouchableOpacity>

      {showInfo && (
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Fórmula (paper original, oct. 2025)</Text>
          <Text style={styles.infoText}>
            FTRT_planeta = (M_planeta · R☉) / d³{'\n'}
            FTRT_normalizada = Σ FTRT_planeta / FTRT_Júpiter{'\n\n'}
            Umbrales validados:{'\n'}
            Normal   {'<'} {FTRT_THRESHOLDS.normal}{'\n'}
            Moderado {FTRT_THRESHOLDS.normal}–{FTRT_THRESHOLDS.moderado}{'\n'}
            Alto     {FTRT_THRESHOLDS.moderado}–{FTRT_THRESHOLDS.alto}{'\n'}
            Extremo  ≥ {FTRT_THRESHOLDS.alto}{'\n\n'}
            Regla desacoplamiento: si baricentro {'>'} 3 R☉,{'\n'}
            el Sol no responde a FTRT alto (⊗)
          </Text>
          <Text style={styles.infoNote}>
            Casos históricos de referencia:{'\n'}
            Carrington 1859 → 3.21 · Halloween 2003 → 4.87{'\n'}
            Tormenta mayo 2024 → 2.94{'\n\n'}
            Correlación: Spearman ρ=0.894, p{'<'}0.0001{'\n'}
            Cabeza Durán · Chizhevsky Foundation, 2025
          </Text>
        </View>
      )}

      <View style={styles.legend}>
        {[
          { col: '#ef5350', label: `≥${FTRT_THRESHOLDS.alto} Extremo` },
          { col: '#ffb74d', label: `≥${FTRT_THRESHOLDS.moderado} Alto` },
          { col: '#fff176', label: `≥${FTRT_THRESHOLDS.normal} Moderado` },
          { col: '#81c784', label: 'Normal' },
          { col: '#6e7681', label: '⊗ Desac.' },
        ].map(({ col, label }) => (
          <View key={label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: col }]} />
            <Text style={styles.legendText}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#0d1117', borderWidth: 1, borderColor: '#30363d', borderRadius: 8, padding: 16, marginVertical: 10 },
  title: { fontFamily: 'JetBrainsMono_500Medium', color: '#e6edf3', fontSize: 13, letterSpacing: 2, marginBottom: 2 },
  subtitle: { fontFamily: 'JetBrainsMono_400Regular', color: '#8b949e', fontSize: 10, letterSpacing: 1, marginBottom: 4 },
  evidenceBadge: { fontFamily: 'JetBrainsMono_400Regular', color: '#ce93d8', fontSize: 9, letterSpacing: 1, marginBottom: 12 },
  todayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  todayValue: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 52, lineHeight: 56 },
  todayLabel: { fontFamily: 'JetBrainsMono_400Regular', color: '#8b949e', fontSize: 9, letterSpacing: 1.5 },
  baryBox: { alignItems: 'flex-end' },
  baryValue: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 22 },
  baryTitle: { fontFamily: 'JetBrainsMono_400Regular', color: '#8b949e', fontSize: 9, letterSpacing: 1 },
  decoupledWarn: { fontFamily: 'JetBrainsMono_500Medium', color: '#6e7681', fontSize: 10, letterSpacing: 1, marginTop: 2 },
  sectionTitle: { fontFamily: 'JetBrainsMono_500Medium', color: '#8b949e', fontSize: 9, letterSpacing: 2, marginBottom: 8 },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 4, gap: 6 },
  dayCol: { alignItems: 'center', width: 38 },
  barValue: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 9, marginBottom: 2 },
  barTrackV: { width: 20, height: 80, backgroundColor: '#21262d', borderRadius: 3, justifyContent: 'flex-end', overflow: 'hidden' },
  barFillV: { width: '100%', borderRadius: 3 },
  baryLabel: { fontFamily: 'JetBrainsMono_400Regular', color: '#6e7681', fontSize: 8, marginTop: 3 },
  dayLabel: { fontFamily: 'JetBrainsMono_400Regular', color: '#6e7681', fontSize: 8, marginTop: 2, textAlign: 'center' },
  dayLabelToday: { color: '#58a6ff' },
  decoupledDot: { color: '#6e7681', fontSize: 8, marginTop: 1 },
  infoBtn: { marginTop: 10, marginBottom: 4 },
  infoLabel: { fontFamily: 'JetBrainsMono_400Regular', color: '#58a6ff', fontSize: 10, letterSpacing: 1 },
  infoBox: { backgroundColor: '#161b22', borderRadius: 6, padding: 10, marginBottom: 8 },
  infoTitle: { fontFamily: 'JetBrainsMono_500Medium', color: '#e6edf3', fontSize: 10, marginBottom: 6 },
  infoText: { fontFamily: 'JetBrainsMono_400Regular', color: '#8b949e', fontSize: 9, lineHeight: 14, marginBottom: 6 },
  infoNote: { fontFamily: 'JetBrainsMono_400Regular', color: '#ce93d8', fontSize: 9, lineHeight: 13 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#21262d' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendText: { fontFamily: 'JetBrainsMono_400Regular', color: '#6e7681', fontSize: 8 },
});
