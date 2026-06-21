// components/Logbook.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, stateForIndex } from '../theme';

const STORAGE_KEY = '@noosfera/logbook_entries';
const MAX_ENTRIES = 200; // límite razonable para no crecer sin fin en el dispositivo

const FEELINGS = [
  { key: 'calm', label: 'Calma', color: colors.equilibrium },
  { key: 'energized', label: 'Energía', color: colors.gold },
  { key: 'tense', label: 'Tensión', color: colors.perturbation },
  { key: 'foggy', label: 'Niebla mental', color: colors.paperDim },
];

function safeNumber(n, fallback = 0) {
  return Number.isFinite(n) ? n : fallback;
}

export default function Logbook({ currentIndex, currentKp }) {
  const [entries, setEntries] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (mounted && Array.isArray(parsed)) setEntries(parsed);
      } catch (e) {
        // Si el storage está corrupto o vacío, simplemente empezamos de cero
        // en vez de romper la pantalla.
        if (mounted) setEntries([]);
      } finally {
        if (mounted) setLoaded(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const persist = useCallback(async (next) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      // Falla silenciosa de escritura: el estado en memoria sigue siendo correcto
      // para esta sesión, aunque no sobreviva a un reinicio. No bloqueamos la UI.
    }
  }, []);

  const addEntry = async (feelingKey) => {
    if (saving) return;
    setSaving(true);
    const entry = {
      id: `${Date.now()}`,
      timestamp: new Date().toISOString(),
      feeling: feelingKey,
      index: safeNumber(currentIndex, null),
      kp: safeNumber(currentKp, null),
    };
    const next = [entry, ...entries].slice(0, MAX_ENTRIES);
    setEntries(next);
    await persist(next);
    setSaving(false);
  };

  const clearAll = async () => {
    setEntries([]);
    await persist([]);
  };

  if (!loaded) {
    return (
      <View style={styles.box}>
        <Text style={styles.loadingText}>Cargando bitácora…</Text>
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <Text style={styles.prompt}>¿Cómo te sientes ahora mismo?</Text>
      <View style={styles.feelingsRow}>
        {FEELINGS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.feelingBtn, { borderColor: f.color }]}
            onPress={() => addEntry(f.key)}
            disabled={saving}
          >
            <View style={[styles.feelingDot, { backgroundColor: f.color }]} />
            <Text style={[styles.feelingText, { color: f.color }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {entries.length === 0 ? (
        <Text style={styles.emptyText}>
          Aún no hay registros. Cada entrada queda asociada al índice de carga
          disipativa del momento, para que con el tiempo puedas ver tus propias
          correlaciones — o ausencia de ellas.
        </Text>
      ) : (
        <>
          <ScrollView style={styles.list} nestedScrollEnabled>
            {entries.slice(0, 12).map((e) => {
              const feeling = FEELINGS.find((f) => f.key === e.feeling) || FEELINGS[0];
              const state = stateForIndex(safeNumber(e.index, 0));
              const date = new Date(e.timestamp);
              return (
                <View key={e.id} style={styles.entryRow}>
                  <View style={[styles.entryDot, { backgroundColor: feeling.color }]} />
                  <View style={styles.entryBody}>
                    <Text style={styles.entryFeeling}>{feeling.label}</Text>
                    <Text style={styles.entryMeta}>
                      {date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                      {'  ·  '}
                      {date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      {'  ·  '}índice {Number.isFinite(e.index) ? e.index.toFixed(0) : '—'}
                      {'  ·  '}
                      <Text style={{ color: state.color }}>{state.label}</Text>
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={styles.clearBtn} onPress={clearAll}>
            <Text style={styles.clearText}>Borrar bitácora</Text>
          </TouchableOpacity>
        </>
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
  loadingText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 11,
    color: colors.paperDim,
    textAlign: 'center',
    paddingVertical: 20,
  },
  prompt: {
    fontFamily: 'Spectral_400Regular',
    fontSize: 14.5,
    color: colors.paper,
    marginBottom: 14,
  },
  feelingsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  feelingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  feelingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  feelingText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 11,
    letterSpacing: 0.3,
  },
  emptyText: {
    fontFamily: 'Spectral_300Light',
    fontSize: 12.5,
    color: colors.paperDim,
    lineHeight: 19,
    fontStyle: 'italic',
  },
  list: {
    maxHeight: 280,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.line,
  },
  entryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 5,
  },
  entryBody: {
    flex: 1,
  },
  entryFeeling: {
    fontFamily: 'Spectral_500Medium',
    fontSize: 13,
    color: colors.paper,
  },
  entryMeta: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    color: colors.paperDim,
    marginTop: 2,
  },
  clearBtn: {
    alignSelf: 'center',
    marginTop: 12,
  },
  clearText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    color: colors.paperDim,
    textDecorationLine: 'underline',
  },
});
