// components/ReadingCell.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

export default function ReadingCell({ label, value, unit, note }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>
        {value} {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </Text>
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    width: '50%',
    backgroundColor: colors.void2,
    padding: 16,
    borderWidth: 0.5,
    borderColor: colors.line,
  },
  label: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    letterSpacing: 1,
    color: colors.paperDim,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  value: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 20,
    color: colors.paper,
  },
  unit: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    color: colors.paperDim,
  },
  note: {
    fontFamily: 'Spectral_400Regular',
    fontSize: 12,
    color: colors.paperDim,
    marginTop: 6,
    lineHeight: 16,
  },
});
