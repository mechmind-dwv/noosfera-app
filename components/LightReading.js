// components/LightReading.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { colors } from '../theme';

function uvCategory(uv) {
  if (uv === null || !Number.isFinite(uv)) return { label: '—', color: colors.paperDim };
  if (uv < 3) return { label: 'BAJO', color: colors.equilibrium };
  if (uv < 6) return { label: 'MODERADO', color: colors.gold };
  if (uv < 8) return { label: 'ALTO', color: colors.gold };
  return { label: 'MUY ALTO', color: colors.perturbation };
}

export function LightCell({ lux, sensorActive, sensorAvailable, platformSupported, activateSensor }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.label}>Luz ambiental</Text>
      <Text style={styles.value}>
        {lux.toFixed(0)} <Text style={styles.unit}>{sensorActive ? 'lux' : 'lux*'}</Text>
      </Text>
      {!platformSupported ? (
        <Text style={styles.note}>
          El sensor de luz de Android no está disponible en iOS — estimación basal.
        </Text>
      ) : sensorActive ? (
        <Text style={styles.note}>Sensor de luz activo — lectura en tiempo real.</Text>
      ) : sensorAvailable ? (
        <TouchableOpacity onPress={activateSensor}>
          <Text style={styles.activateText}>Activar sensor de luz</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.note}>Sensor no disponible en este dispositivo.</Text>
      )}
    </View>
  );
}

export function UVCell({ uvIndex, isLive, locationLabel, permissionStatus, refetch }) {
  const cat = uvCategory(uvIndex);
  return (
    <View style={styles.cell}>
      <Text style={styles.label}>Índice UV (pronóstico)</Text>
      <View style={styles.uvRow}>
        <Text style={styles.value}>
          {Number.isFinite(uvIndex) ? uvIndex.toFixed(1) : '—'}{' '}
          <Text style={styles.unit}>{isLive ? '' : '*'}</Text>
        </Text>
        <View style={[styles.uvBadge, { borderColor: cat.color }]}>
          <Text style={[styles.uvBadgeText, { color: cat.color }]}>{cat.label}</Text>
        </View>
      </View>
      <Text style={styles.note}>
        {permissionStatus === 'granted'
          ? `Pronóstico por ubicación (${locationLabel || '—'}), no medido por el dispositivo.`
          : 'Requiere permiso de ubicación para tu zona — toca para activar.'}
      </Text>
      {permissionStatus !== 'granted' && (
        <TouchableOpacity onPress={refetch}>
          <Text style={styles.activateText}>Activar ubicación</Text>
        </TouchableOpacity>
      )}
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
  activateText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    color: colors.gold,
    marginTop: 6,
    textDecorationLine: 'underline',
  },
  uvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  uvBadge: {
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  uvBadgeText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 9,
    letterSpacing: 0.4,
  },
});
