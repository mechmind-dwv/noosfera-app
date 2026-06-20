// components/EquationCard.js
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, stateForIndex } from '../theme';

export default function EquationCard({ index }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const state = stateForIndex(Number.isFinite(index) ? index : 0);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.9] });
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });

  return (
    <View style={styles.box}>
      <View style={styles.eqRow}>
        <Animated.Text
          style={[styles.sigma, { color: state.color, opacity: glowOpacity, transform: [{ scale }] }]}
        >
          σ
        </Animated.Text>
        <Text style={styles.eq}> = </Text>
        <Text style={styles.sum}>Σ</Text>
        <View style={styles.termGroup}>
          <Text style={styles.eq}>
            J<Text style={styles.sub}>i</Text> X<Text style={styles.sub}>i</Text>
          </Text>
        </View>
        <Text style={styles.eq}> ≥ 0</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.termsRow}>
        <View style={styles.term}>
          <Text style={[styles.termSymbol, { color: colors.gold }]}>
            J<Text style={styles.sub}>i</Text>
          </Text>
          <Text style={styles.termLabel}>flujos — campo, señal RF, exposición</Text>
        </View>
        <View style={styles.term}>
          <Text style={[styles.termSymbol, { color: colors.gold }]}>
            X<Text style={styles.sub}>i</Text>
          </Text>
          <Text style={styles.termLabel}>fuerzas — gradientes que los originan</Text>
        </View>
      </View>

      <Text style={styles.caption}>
        La producción de entropía es el producto de los flujos por las fuerzas que los
        originan. El Índice de Carga Disipativa es una aproximación normalizada (0–100)
        de este principio, calculada en vivo a partir de tus sensores y el contexto solar.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderColor: colors.lineBright,
    backgroundColor: colors.void2,
    padding: 24,
  },
  eqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    paddingVertical: 12,
  },
  sigma: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 44,
  },
  sum: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 30,
    color: colors.gold,
    marginHorizontal: 2,
  },
  eq: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 26,
    color: colors.gold,
  },
  termGroup: {
    marginLeft: 4,
  },
  sub: {
    fontSize: 14,
    lineHeight: 14,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: 16,
  },
  termsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 16,
  },
  term: {
    flex: 1,
  },
  termSymbol: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 18,
    marginBottom: 4,
  },
  termLabel: {
    fontFamily: 'Spectral_300Light',
    fontSize: 12,
    color: colors.paperDim,
    lineHeight: 17,
  },
  caption: {
    fontFamily: 'Spectral_400Regular_Italic',
    fontStyle: 'italic',
    fontSize: 12.5,
    color: colors.paperDim,
    textAlign: 'center',
    lineHeight: 19,
  },
});
