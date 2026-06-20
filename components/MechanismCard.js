// components/MechanismCard.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

// Tres niveles de certeza epistémica — declarados explícitamente en vez de
// presentar todo el contenido con el mismo peso de verdad. Esto es lo que
// distingue a un instrumento honesto de una afirmación de marketing.
const EVIDENCE_LEVELS = {
  established: { label: 'MECANISMO ESTABLECIDO', color: colors.equilibrium },
  partial: { label: 'EVIDENCIA PARCIAL', color: colors.gold },
  hypothesis: { label: 'HIPÓTESIS ACTIVA', color: colors.perturbation },
};

export default function MechanismCard({ title, evidence, mechanism, source }) {
  const level = EVIDENCE_LEVELS[evidence] || EVIDENCE_LEVELS.hypothesis;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        <View style={[styles.badge, { borderColor: level.color }]}>
          <View style={[styles.dot, { backgroundColor: level.color }]} />
          <Text style={[styles.badgeText, { color: level.color }]}>{level.label}</Text>
        </View>
      </View>
      <Text style={styles.mechanism}>{mechanism}</Text>
      <Text style={styles.source}>{source}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingVertical: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  title: {
    fontFamily: 'Spectral_500Medium',
    fontSize: 16,
    color: colors.paper,
    flexShrink: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  badgeText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 9,
    letterSpacing: 0.6,
  },
  mechanism: {
    fontFamily: 'Spectral_300Light',
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.paperDim,
    marginBottom: 8,
  },
  source: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    color: colors.goldDim,
  },
});
