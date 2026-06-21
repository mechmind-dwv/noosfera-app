// components/KpHistoryChart.js
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { colors } from '../theme';

const HEIGHT = 130;
const MIN_WIDTH = 240;
const MAX_KP = 9;

// Umbrales NOAA G-scale para colorear las barras por severidad real,
// no solo por estética: G1 (Kp5) ya es tormenta geomagnética menor.
function colorForKp(kp) {
  if (kp >= 7) return colors.perturbation; // G3+
  if (kp >= 5) return colors.gold; // G1-G2
  return colors.equilibrium; // por debajo de tormenta
}

function safeNumber(n, fallback = 0) {
  return Number.isFinite(n) ? n : fallback;
}

export default function KpHistoryChart({ history }) {
  const { width: screenWidth } = useWindowDimensions();
  const safeScreenWidth = Number.isFinite(screenWidth) && screenWidth > 0 ? screenWidth : MIN_WIDTH + 48;
  const width = Math.max(Math.min(safeScreenWidth - 48, 900), MIN_WIDTH);

  const bars = useMemo(() => {
    if (!history || history.length === 0) return [];
    const trimmed = history.slice(-56);
    const barWidth = width / trimmed.length;
    return trimmed.map((kp, i) => {
      const value = safeNumber(kp, 0);
      const barHeight = safeNumber((value / MAX_KP) * (HEIGHT - 20), 0);
      return {
        x: i * barWidth,
        y: HEIGHT - barHeight,
        width: Math.max(barWidth - 1, 1),
        height: barHeight,
        color: colorForKp(value),
        value,
      };
    });
  }, [history, width]);

  if (bars.length === 0) {
    return (
      <View style={styles.frame}>
        <Text style={styles.emptyText}>Cargando histórico de 7 días…</Text>
      </View>
    );
  }

  const g1Y = HEIGHT - (5 / MAX_KP) * (HEIGHT - 20);
  const g3Y = HEIGHT - (7 / MAX_KP) * (HEIGHT - 20);

  return (
    <View style={styles.frame}>
      <Svg width={width} height={HEIGHT}>
        <Line x1={0} y1={g1Y} x2={width} y2={g1Y} stroke={colors.goldDim} strokeWidth={0.5} strokeDasharray="3,3" />
        <Line x1={0} y1={g3Y} x2={width} y2={g3Y} stroke={colors.perturbation} strokeWidth={0.5} strokeDasharray="3,3" />
        {bars.map((b, i) => (
          <Rect key={i} x={b.x} y={b.y} width={b.width} height={b.height} fill={b.color} opacity={0.85} />
        ))}
      </Svg>
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.equilibrium }]} />
          <Text style={styles.legendText}>Kp &lt; 5</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.gold }]} />
          <Text style={styles.legendText}>G1–G2</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.perturbation }]} />
          <Text style={styles.legendText}>G3+</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: colors.void2,
    borderWidth: 1,
    borderColor: colors.line,
    paddingTop: 12,
  },
  emptyText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 11,
    color: colors.paperDim,
    textAlign: 'center',
    paddingVertical: 40,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    color: colors.paperDim,
  },
});
