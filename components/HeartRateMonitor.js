// components/HeartRateMonitor.js
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors } from '../theme';
import { usePPGHeartRate } from '../hooks/usePPGHeartRate';

export default function HeartRateMonitor() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const {
    attachCameraRef,
    startMeasurement,
    isRecording,
    progress,
    bpm,
    quality,
    error,
  } = usePPGHeartRate();

  if (Platform.OS === 'web') {
    return (
      <View style={styles.box}>
        <Text style={styles.unavailableText}>
          La medición de pulso por cámara no está disponible en la versión web —
          descarga la app para usarla en tu móvil.
        </Text>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={styles.box}>
        <Text style={styles.loadingText}>Comprobando permisos de cámara…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.box}>
        <Text style={styles.prompt}>
          Esta función necesita la cámara para detectar tu pulso a través de la
          luz reflejada en tu dedo.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Conceder permiso de cámara</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          Estimación experimental, no es un dispositivo médico. No la uses para
          decisiones de salud — consulta a un profesional si te preocupa tu
          ritmo cardíaco.
        </Text>
      </View>

      <View style={styles.cameraWrap}>
        <CameraView
          ref={(ref) => {
            cameraRef.current = ref;
            attachCameraRef(ref);
          }}
          style={styles.camera}
          facing="back"
          enableTorch={isRecording}
        />
      </View>

      <Text style={styles.instructions}>
        Tapa por completo el lente trasero y el flash con la yema del dedo,
        sin presionar fuerte. Mantén quieto el teléfono durante 15 segundos.
      </Text>

      {!isRecording && bpm === null && (
        <TouchableOpacity style={styles.btn} onPress={startMeasurement}>
          <Text style={styles.btnText}>Iniciar medición (15s)</Text>
        </TouchableOpacity>
      )}

      {isRecording && (
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>{Math.round(progress * 15)}s / 15s</Text>
        </View>
      )}

      {bpm !== null && (
        <View style={styles.resultBox}>
          <Text style={styles.resultValue}>{bpm}</Text>
          <Text style={styles.resultUnit}>PPM estimadas</Text>
          {quality === 'poor' && (
            <Text style={styles.qualityWarning}>
              Señal débil — el resultado puede ser poco fiable. Intenta de nuevo
              ajustando la posición del dedo.
            </Text>
          )}
          <TouchableOpacity style={styles.retryBtn} onPress={startMeasurement}>
            <Text style={styles.retryText}>Medir de nuevo</Text>
          </TouchableOpacity>
        </View>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={startMeasurement}>
            <Text style={styles.retryText}>Intentar de nuevo</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.void2,
    padding: 18,
  },
  unavailableText: {
    fontFamily: 'Spectral_300Light',
    fontSize: 13,
    color: colors.paperDim,
    fontStyle: 'italic',
    lineHeight: 19,
  },
  loadingText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 11,
    color: colors.paperDim,
  },
  prompt: {
    fontFamily: 'Spectral_400Regular',
    fontSize: 14,
    color: colors.paper,
    lineHeight: 20,
    marginBottom: 14,
  },
  disclaimer: {
    borderWidth: 1,
    borderColor: colors.perturbation,
    borderRadius: 2,
    padding: 10,
    marginBottom: 14,
  },
  disclaimerText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    color: colors.perturbation,
    lineHeight: 15,
  },
  cameraWrap: {
    height: 90,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  instructions: {
    fontFamily: 'Spectral_300Light',
    fontSize: 12.5,
    color: colors.paperDim,
    lineHeight: 18,
    marginBottom: 14,
  },
  btn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.lineBright,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 2,
  },
  btnText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 11,
    letterSpacing: 0.6,
    color: colors.gold,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: colors.line,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.perturbation,
  },
  progressText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    color: colors.paperDim,
  },
  resultBox: {
    alignItems: 'center',
    paddingTop: 10,
  },
  resultValue: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 38,
    color: colors.perturbation,
  },
  resultUnit: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 11,
    color: colors.paperDim,
    marginTop: 2,
    marginBottom: 10,
  },
  qualityWarning: {
    fontFamily: 'Spectral_400Regular_Italic',
    fontStyle: 'italic',
    fontSize: 11.5,
    color: colors.gold,
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  retryBtn: {
    marginTop: 4,
  },
  retryText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    color: colors.paperDim,
    textDecorationLine: 'underline',
  },
  errorBox: {
    alignItems: 'center',
    paddingTop: 6,
  },
  errorText: {
    fontFamily: 'Spectral_300Light',
    fontSize: 12.5,
    color: colors.perturbation,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 10,
  },
});
