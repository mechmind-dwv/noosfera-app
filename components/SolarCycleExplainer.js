// components/SolarCycleExplainer.js
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { colors } from '../theme';

const HEIGHT = 110;
const MIN_WIDTH = 240;

// Ciclo Solar 25: mínimo en diciembre 2019 (NOAA/NASA Prediction Panel),
// máximo anunciado en octubre 2024. Curva ilustrativa de la forma típica
// de un ciclo solar (ascenso más rápido que el descenso), no una predicción
// numérica exacta — eso ya lo cubre el dato Kp/F10.7 en vivo de arriba.
const CYCLE_START_YEAR = 2019.9; // diciembre 2019
const CYCLE_LENGTH_YEARS = 11;
const PEAK_FRACTION = 0.42; // el máximo llegó ~4.6 años tras el mínimo, antes del punto medio

function currentCycleFraction() {
  const now = new Date();
  const yearsSinceStart =
    now.getFullYear() + now.getMonth() / 12 - CYCLE_START_YEAR;
  return Math.max(0, Math.min(1, yearsSinceStart / CYCLE_LENGTH_YEARS));
}

function phaseLabel(fraction) {
  if (fraction < PEAK_FRACTION * 0.6) return 'Fase ascendente';
  if (fraction < PEAK_FRACTION * 1.15) return 'Máximo solar';
  if (fraction < 0.85) return 'Fase descendente';
  return 'Aproximándose al mínimo';
}

export default function SolarCycleExplainer() {
  const { width: screenWidth } = useWindowDimensions();
  const safeScreenWidth = Number.isFinite(screenWidth) && screenWidth > 0 ? screenWidth : MIN_WIDTH + 48;
  const width = Math.max(Math.min(safeScreenWidth - 48, 900), MIN_WIDTH);

  const fraction = useMemo(() => currentCycleFraction(), []);
  const label = phaseLabel(fraction);

  const curvePoints = useMemo(() => {
    const points = [];
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      let y;
      if (t <= PEAK_FRACTION) {
        y = Math.pow(t / PEAK_FRACTION, 0.7);
      } else {
        y = Math.pow(1 - (t - PEAK_FRACTION) / (1 - PEAK_FRACTION), 1.3);
      }
      const x = t * width;
      const py = HEIGHT - 16 - y * (HEIGHT - 32);
      points.push({ x, y: py });
    }
    return points;
  }, [width]);

  const pathD = curvePoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const markerX = fraction * width;
  const markerIndex = Math.round(fraction * 60);
  const markerY = curvePoints[markerIndex] ? curvePoints[markerIndex].y : HEIGHT / 2;

  return (
    <View style={styles.frame}>
      <Svg width={width} height={HEIGHT}>
        <Line x1={0} y1={HEIGHT - 16} x2={width} y2={HEIGHT - 16} stroke={colors.line} strokeWidth={1} />
        <Path d={pathD} stroke={colors.goldDim} strokeWidth={1.5} fill="none" />
        <Line x1={markerX} y1={16} x2={markerX} y2={HEIGHT - 16} stroke={colors.gold} strokeWidth={1} strokeDasharray="2,3" />
        <Circle cx={markerX} cy={markerY} r={5} fill={colors.gold} />
      </Svg>
      <View style={styles.labelsRow}>
        <Text style={styles.yearLabel}>Mín. dic 2019</Text>
        <Text style={styles.yearLabel}>~2030–31</Text>
      </View>
      <View style={styles.phaseBox}>
        <Text style={styles.phaseLabel}>{label.toUpperCase()}</Text>
        <Text style={styles.phaseNote}>
          Ciclo Solar 25 · máximo anunciado por NOAA/NASA en octubre de 2024
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: colors.void2,
    borderWidth: 1,
    borderColor: colors.line,
    paddingTop: 16,
    paddingHorizontal: 0,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 2,
  },
  yearLabel: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 9,
    color: colors.paperDim,
  },
  phaseBox: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    marginTop: 14,
    padding: 14,
  },
  phaseLabel: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    color: colors.gold,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  phaseNote: {
    fontFamily: 'Spectral_300Light',
    fontSize: 12,
    color: colors.paperDim,
    lineHeight: 17,
  },
});
