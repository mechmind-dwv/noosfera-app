// components/Gauge.js
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import { colors, stateForIndex } from '../theme';

const AnimatedLine = Animated.createAnimatedComponent(Line);
const ARC_LEN = 251.2; // longitud aproximada del semicírculo r=80

export default function Gauge({ index }) {
  const animValue = useRef(new Animated.Value(index)).current;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: index,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [index]);

  const state = stateForIndex(index);
  const frac = index / 100;
  const angleDeg = -90 + frac * 180;
  const rad = (angleDeg * Math.PI) / 180;
  const needleLen = 68;
  const cx = 100, cy = 100;
  const nx = cx + needleLen * Math.cos(rad - Math.PI / 2);
  const ny = cy + needleLen * Math.sin(rad - Math.PI / 2);

  const dashOffset = ARC_LEN * (1 - frac);

  return (
    <View style={styles.panel}>
      <Svg width={200} height={120} viewBox="0 0 200 120">
        <Path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={colors.line}
          strokeWidth={8}
        />
        <Path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={state.color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={`${ARC_LEN}`}
          strokeDashoffset={dashOffset}
        />
        <Line
          x1={cx} y1={cy} x2={nx} y2={ny}
          stroke={colors.paper}
          strokeWidth={2}
        />
        <Circle cx={cx} cy={cy} r={5} fill={colors.gold} />
      </Svg>

      <View style={styles.readout}>
        <Text style={styles.value}>{index.toFixed(1)}</Text>
        <Text style={styles.unit}>ÍNDICE DE CARGA DISIPATIVA</Text>
        <View style={[styles.statePill, { borderColor: state.color }]}>
          <Text style={[styles.stateText, { color: state.color }]}>{state.label}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  readout: {
    alignItems: 'center',
    marginTop: 8,
  },
  value: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 42,
    color: colors.paper,
    lineHeight: 46,
  },
  unit: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 11,
    color: colors.paperDim,
    letterSpacing: 1,
    marginTop: 6,
  },
  statePill: {
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderRadius: 2,
  },
  stateText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 11,
    letterSpacing: 1,
  },
});
