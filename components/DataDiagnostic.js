// components/DataDiagnostic.js
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import { colors } from '../theme';

const NASA_API_KEY = process.env.EXPO_PUBLIC_NASA_API_KEY || 'DEMO_KEY';

const CHECKS = [
  {
    id: 'kp',
    label: 'NOAA Kp + histórico 7 días',
    url: 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',
    validate: (json) => {
      if (!Array.isArray(json) || json.length === 0) return 'array vacío';
      const vals = json.map((r) => parseFloat(r.Kp)).filter(Number.isFinite);
      if (vals.length === 0) return 'campo .Kp no encontrado — formato inesperado';
      return `OK — ${vals.length} lecturas, último Kp: ${vals[vals.length - 1]}`;
    },
  },
  {
    id: 'f107',
    label: 'NOAA F10.7 flujo solar',
    url: 'https://services.swpc.noaa.gov/json/f107_cm_flux.json',
    validate: (json) => {
      if (!Array.isArray(json) || json.length === 0) return 'array vacío';
      const row = json[json.length - 1];
      const val = row.flux ?? row.f107 ?? row.observed_flux ?? row.f107_flux ?? row.value;
      if (!Number.isFinite(parseFloat(val))) return `campo numérico no encontrado en: ${JSON.stringify(Object.keys(row))}`;
      return `OK — valor: ${parseFloat(val)} sfu`;
    },
  },
  {
    id: 'donki',
    label: 'NASA DONKI (con tu API key)',
    url: () => {
      const today = new Date();
      const ago = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fmt = (d) => d.toISOString().slice(0, 10);
      return `https://api.nasa.gov/DONKI/notifications?startDate=${fmt(ago)}&endDate=${fmt(today)}&type=all&api_key=${NASA_API_KEY}`;
    },
    validate: (json) => {
      if (!Array.isArray(json)) return `respuesta no es array: ${JSON.stringify(json).slice(0, 120)}`;
      if (json.length === 0) return 'OK — sin eventos en los últimos 7 días (válido)';
      const last = json[json.length - 1];
      return `OK — ${json.length} eventos, último: ${last.messageType} (${last.messageIssueTime || '—'})`;
    },
  },
  {
    id: 'uv',
    label: 'UV por ubicación (currentuvindex.com)',
    url: null,
    dynamic: true,
    validate: (json) => {
      if (!json.ok || !json.now) return `estructura inesperada: ${JSON.stringify(json).slice(0, 120)}`;
      if (!Number.isFinite(json.now.uvi)) return `json.now.uvi no es número: ${json.now.uvi}`;
      return `OK — UV actual: ${json.now.uvi} (${json.now.time})`;
    },
  },
];

const STATUS = {
  idle: { color: colors.paperDim, label: 'pendiente' },
  running: { color: colors.gold, label: 'comprobando…' },
  ok: { color: colors.equilibrium, label: 'OK' },
  fail: { color: colors.perturbation, label: 'FALLO' },
};

export default function DataDiagnostic() {
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(false);

  const runCheck = useCallback(async (check) => {
    setResults((prev) => ({ ...prev, [check.id]: { status: 'running', detail: '' } }));
    try {
      let url = typeof check.url === 'function' ? check.url() : check.url;
      if (check.dynamic) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') throw new Error('permiso de ubicación denegado');
        let pos = await Location.getLastKnownPositionAsync({ maxAge: 60*60*1000, requiredAccuracy: 10000 });
        if (!pos) {
          pos = await Promise.race([
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
            new Promise((_, rej) => setTimeout(() => rej(new Error('GPS timeout (10s)')), 10000)),
          ]);
        }
        const { latitude, longitude } = pos.coords;
        url = `https://currentuvindex.com/api/v1/uvi?latitude=${latitude}&longitude=${longitude}`;
      }
      const res = await fetch(url);
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 100)}`);
      let json;
      try { json = JSON.parse(text); }
      catch (e) { throw new Error(`respuesta no es JSON válido: ${text.slice(0, 100)}`); }
      const detail = check.validate(json);
      const isOk = detail.startsWith('OK');
      setResults((prev) => ({ ...prev, [check.id]: { status: isOk ? 'ok' : 'fail', detail } }));
    } catch (e) {
      setResults((prev) => ({ ...prev, [check.id]: { status: 'fail', detail: e.message || String(e) } }));
    }
  }, []);

  const runAll = useCallback(async () => {
    setRunning(true);
    await Promise.all(CHECKS.map((c) => runCheck(c)));
    setRunning(false);
  }, [runCheck]);

  return (
    <View style={styles.box}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Diagnóstico de fuentes de datos</Text>
        <TouchableOpacity style={styles.runBtn} onPress={runAll} disabled={running}>
          <Text style={styles.runBtnText}>{running ? 'Comprobando…' : 'Ejecutar todo'}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.caption}>
        Clave NASA activa: {NASA_API_KEY === 'DEMO_KEY' ? 'DEMO_KEY (limitada)' : '✓ clave propia'}
      </Text>
      {CHECKS.map((check) => {
        const result = results[check.id] || { status: 'idle', detail: '' };
        const st = STATUS[result.status] || STATUS.idle;
        return (
          <View key={check.id} style={styles.checkRow}>
            <View style={styles.checkHeader}>
              <View style={[styles.dot, { backgroundColor: st.color }]} />
              <Text style={styles.checkLabel}>{check.label}</Text>
              <Text style={[styles.checkStatus, { color: st.color }]}>{st.label}</Text>
            </View>
            {result.detail ? (
              <Text style={[styles.checkDetail, { color: result.status === 'ok' ? colors.equilibrium : result.status === 'fail' ? colors.perturbation : colors.paperDim }]}>
                {result.detail}
              </Text>
            ) : null}
            <TouchableOpacity onPress={() => runCheck(check)}>
              <Text style={styles.retryText}>Comprobar</Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth:1, borderColor:colors.line, backgroundColor:colors.void2, padding:18 },
  headerRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:10, flexWrap:'wrap', gap:8 },
  title: { fontFamily:'Spectral_500Medium', fontSize:14, color:colors.paper, flexShrink:1 },
  runBtn: { borderWidth:1, borderColor:colors.lineBright, paddingHorizontal:14, paddingVertical:7, borderRadius:2 },
  runBtnText: { fontFamily:'JetBrainsMono_500Medium', fontSize:11, color:colors.gold, letterSpacing:0.4 },
  caption: { fontFamily:'Spectral_300Light', fontSize:12, color:colors.paperDim, lineHeight:17, marginBottom:16 },
  checkRow: { borderTopWidth:1, borderTopColor:colors.line, paddingVertical:12, gap:5 },
  checkHeader: { flexDirection:'row', alignItems:'center', gap:8, flexWrap:'wrap' },
  dot: { width:6, height:6, borderRadius:3, flexShrink:0 },
  checkLabel: { fontFamily:'JetBrainsMono_400Regular', fontSize:11, color:colors.paper, flex:1 },
  checkStatus: { fontFamily:'JetBrainsMono_500Medium', fontSize:10, letterSpacing:0.5 },
  checkDetail: { fontFamily:'JetBrainsMono_400Regular', fontSize:10, lineHeight:15, paddingLeft:14 },
  retryText: { fontFamily:'JetBrainsMono_400Regular', fontSize:10, color:colors.goldDim, textDecorationLine:'underline', paddingLeft:14 },
});
