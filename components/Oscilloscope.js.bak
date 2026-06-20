// components/Oscilloscope.js
import React, { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Path, Line, Defs, Filter, FeGaussianBlur } from 'react-native-svg';
import { colors, stateForIndex } from '../theme';

const HEIGHT = 140;

export default function Oscilloscope({ data }) {
  const { width: screenWidth } = useWindowDimensions();
  const width = Math.min(screenWidth - 48, 900);

  const pathD = useMemo(() => {
    if (!data || data.length < 2) return '';
    const step = width / (data.length - 1);
    return data
      .map((v, i) => {
        const x = i * step;
        const y = HEIGHT - v * HEIGHT * 0.85 - HEIGHT * 0.05;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [data, width]);

  const lastValue = data && data.length ? data[data.length - 1] : 0;
  const state = stateForIndex(lastValue * 100);

  const gridLines = [];
  for (let i = 0; i <= 12; i++) {
    const x = (i / 12) * width;
    gridLines.push(
      <Line key={`v${i}`} x1={x} y1={0} x2={x} y2={HEIGHT} stroke="rgba(232,226,212,0.06)" strokeWidth={1} />
    );
  }
  for (let i = 0; i <= 6; i++) {
    const y = (i / 6) * HEIGHT;
    gridLines.push(
      <Line key={`h${i}`} x1={0} y1={y} x2={width} y2={y} stroke="rgba(232,226,212,0.06)" strokeWidth={1} />
    );
  }

  return (
    <View style={styles.frame}>
      <Svg width={width} height={HEIGHT}>
        {gridLines}
        <Path d={pathD} stroke={state.color} strokeWidth={1.5} fill="none" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: colors.void2,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
