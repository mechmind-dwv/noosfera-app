// App.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Magnetometer } from 'expo-sensors';
import {
  useFonts,
  Spectral_300Light,
  Spectral_400Regular,
  Spectral_500Medium,
  Spectral_400Regular_Italic,
} from '@expo-google-fonts/spectral';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono';

import { colors, clamp, stateForIndex } from './theme';
import Gauge from './components/Gauge';
import Oscilloscope from './components/Oscilloscope';
import ReadingCell from './components/ReadingCell';

const SCOPE_LEN = 60;
const MAG_BASELINE = 48; // μT, aproximación de campo terrestre típico

export default function App() {
  const [fontsLoaded] = useFonts({
    Spectral_300Light,
    Spectral_400Regular,
    Spectral_500Medium,
    Spectral_400Regular_Italic,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  const [kp, setKp] = useState(null);
  const [kpIsLive, setKpIsLive] = useState(true);
  const [mag, setMag] = useState(MAG_BASELINE);
  const [sensorActive, setSensorActive] = useState(false);
  const [sensorAvailable, setSensorAvailable] = useState(true);
  const [scopeData, setScopeData] = useState(
    Array.from({ length: SCOPE_LEN }, () => 0.3 + Math.random() * 0.05)
  );
  const [lastUpdate, setLastUpdate] = useState(null);

  const magSubscription = useRef(null);
  const magRef = useRef(MAG_BASELINE);

  // ---------- NOAA Kp fetch ----------
  const fetchKp = useCallback(async () => {
    try {
      const res = await fetch(
        'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json'
      );
      if (!res.ok) throw new Error('network');
      const json = await res.json();
      const last = json[json.length - 1];
      const kpValue = parseFloat(last[1]);
      setKp(kpValue);
      setKpIsLive(true);
      setLastUpdate(new Date());
    } catch (e) {
      setKp(2 + Math.random() * 1.5);
      setKpIsLive(false);
    }
  }, []);

  useEffect(() => {
    fetchKp();
    const interval = setInterval(fetchKp, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchKp]);

  // ---------- Magnetometer ----------
  const startSimulatedMag = useCallback(() => {
    const interval = setInterval(() => {
      const next = MAG_BASELINE + (Math.random() - 0.5) * 6;
      magRef.current = next;
      setMag(next);
    }, 2000);
    return interval;
  }, []);

  useEffect(() => {
    const simInterval = sensorActive ? null : startSimulatedMag();
    return () => simInterval && clearInterval(simInterval);
  }, [sensorActive, startSimulatedMag]);

  const activateSensor = async () => {
    try {
      const { status } = await Magnetometer.requestPermissionsAsync();
      if (status !== 'granted') {
        setSensorAvailable(false);
        return;
      }
      Magnetometer.setUpdateInterval(800);
      magSubscription.current = Magnetometer.addListener((data) => {
        const magnitude = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);
        magRef.current = magnitude;
        setMag(magnitude);
      });
      setSensorActive(true);
    } catch (e) {
      setSensorAvailable(false);
    }
  };

  useEffect(() => {
    return () => {
      if (magSubscription.current) magSubscription.current.remove();
    };
  }, []);

  // ---------- Index calculation + scope tick ----------
  useEffect(() => {
    const tick = setInterval(() => {
      const magDeviation = clamp(Math.abs(magRef.current - MAG_BASELINE) / 25, 0, 1);
      const kpNorm = kp !== null ? clamp(kp / 9, 0, 1) : 0.25;
      const rfSim = 0.15 + Math.sin(Date.now() / 9000) * 0.08;
      const idx = clamp((magDeviation * 0.5 + kpNorm * 0.3 + rfSim * 0.2) * 100, 0, 100);

      setScopeData((prev) => {
        const next = [...prev.slice(1), clamp(idx / 100 + (Math.random() - 0.5) * 0.04, 0, 1)];
        return next;
      });
    }, 800);
    return () => clearInterval(tick);
  }, [kp]);

  const indexValue = clamp(
    (clamp(Math.abs(mag - MAG_BASELINE) / 25, 0, 1) * 0.5 +
      (kp !== null ? clamp(kp / 9, 0, 1) : 0.25) * 0.3 +
      (0.15 + Math.sin(Date.now() / 9000) * 0.08) * 0.2) *
      100,
    0,
    100
  );

  const state = stateForIndex(indexValue);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.liveDot, { backgroundColor: state.color }]} />
          <Text style={styles.brand}>NOÓSFERA</Text>
        </View>
        <Text style={styles.brandSub}>OBSERVATORIO CIUDADANO · SOL / CAMPO / VIDA</Text>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.eyebrowRow}>
            <View style={styles.eyebrowLine} />
            <Text style={styles.eyebrow}>CUARTA LEY · MÁXIMA PRODUCCIÓN DE ENTROPÍA</Text>
          </View>
          <Text style={styles.h1}>
            El pulso del Sol, leído en{' '}
            <Text style={styles.h1Em}>tu propia biología</Text>.
          </Text>
          <Text style={styles.heroDesc}>
            Noósfera mide el acoplamiento entre la actividad solar, el campo geomagnético
            local y tu carga disipativa instantánea — el trabajo termodinámico que tu cuerpo
            realiza para mantener su estructura frente al ruido del entorno.
          </Text>
        </View>

        {/* Instrument */}
        <View style={styles.instrument}>
          <Gauge index={indexValue} />

          <View style={styles.readingsGrid}>
            <ReadingCell
              label="Índice Kp (NOAA)"
              value={kp !== null ? kp.toFixed(1) : '—'}
              unit={kpIsLive ? '/9' : '/9*'}
              note="Actividad geomagnética planetaria, datos del SWPC."
            />
            <ReadingCell
              label="Campo magnético local"
              value={mag.toFixed(1)}
              unit={sensorActive ? 'μT' : 'μT*'}
              note="Magnetómetro del dispositivo. Requiere permiso de sensores."
            />
            <ReadingCell
              label="Estado de equilibrio"
              value={indexValue < 25 ? 'Régimen lineal' : 'Régimen no-lineal'}
              note="min. σ cerca del equilibrio, max. σ lejos de él."
            />
            <ReadingCell
              label="Última actualización"
              value={
                lastUpdate
                  ? lastUpdate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                  : 'estimado'
              }
              note="El índice Kp se actualiza cada 3 horas."
            />
          </View>

          <View style={styles.sensorRow}>
            <Text style={styles.sensorStatus}>
              {sensorActive
                ? 'Magnetómetro activo — lectura en tiempo real.'
                : sensorAvailable
                ? 'Magnetómetro no activado — mostrando estimación basal.'
                : 'Sensor no disponible o permiso denegado.'}
            </Text>
            {!sensorActive && sensorAvailable && (
              <TouchableOpacity style={styles.btn} onPress={activateSensor}>
                <Text style={styles.btnText}>Activar magnetómetro</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Oscilloscope */}
        <Section num="01 · REGISTRO CONTINUO" title="El osciloscopio de la " em="Cronosfera">
          <Oscilloscope data={scopeData} />
        </Section>

        {/* Layers */}
        <Section num="02 · MODELO" title="Tres capas de " em="acoplamiento">
          <Layer
            tag="Sol"
            title="El gradiente de origen"
            body="Las eyecciones de masa coronal y el viento solar imponen un gradiente de energía sobre la magnetosfera terrestre. Es la fuerza termodinámica externa que pone en marcha todo el sistema."
            ref="Chizhevsky, 1897–1964 — Heliobiología"
          />
          <Layer
            tag="Campo"
            title="La Cronosfera como medio"
            body="El campo geomagnético transmite y modula ese gradiente. Sus fluctuaciones — naturales o artificiales — determinan cuánto ruido termodinámico llega a los sistemas vivos."
            ref="Halberg, 1919–2013 — Cronobiología"
          />
          <Layer
            tag="Vida"
            title="La estructura disipativa"
            body="Tu cuerpo responde como toda estructura disipativa lejos del equilibrio: maximiza su producción de entropía para absorber el flujo entrante. Eso es, literalmente, estar vivo."
            ref="Prigogine, 1917–2003 — Estructuras disipativas"
          />
        </Section>

        {/* Equation */}
        <Section num="03 · FORMALISMO" title="La ecuación que " em="gobierna el índice">
          <View style={styles.eqBox}>
            <Text style={styles.eqMain}>σ = Σ Jᵢ Xᵢ ≥ 0</Text>
            <Text style={styles.eqCaption}>
              La producción de entropía es el producto de los flujos por las fuerzas que los
              originan. El Índice de Carga Disipativa es una aproximación normalizada (0–100)
              de este principio.
            </Text>
          </View>
        </Section>

        {/* Lineage */}
        <Section num="04 · LINAJE" title="Sobre los hombros de " em="quienes vieron primero">
          <LineageCell name="A. L. Chizhevsky" years="1897 – 1964" desc="Fundador de la Heliobiología." />
          <LineageCell name="Franz Halberg" years="1919 – 2013" desc="Fundador de la Cronobiología." />
          <LineageCell name="Vladimir Vernadsky" years="1863 – 1945" desc="Concibió la Noósfera." />
          <LineageCell name="Ilya Prigogine" years="1917 – 2003" desc="Estructuras disipativas." />
        </Section>

        <View style={styles.footer}>
          <Text style={styles.footerQuote}>
            "En la acción de organizar, el universo no solo se disipa; se enriquece."
          </Text>
          <Text style={styles.footerBrand}>NOÓSFERA · Chizhevsky Foundation</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ num, title, em, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionNum}>{num}</Text>
      <Text style={styles.sectionTitle}>
        {title}
        <Text style={styles.sectionTitleEm}>{em}</Text>
      </Text>
      {children}
    </View>
  );
}

function Layer({ tag, title, body, ref }) {
  return (
    <View style={styles.layer}>
      <Text style={styles.layerTag}>{tag}</Text>
      <View style={styles.layerBody}>
        <Text style={styles.layerTitle}>{title}</Text>
        <Text style={styles.layerText}>{body}</Text>
        <Text style={styles.layerRef}>{ref}</Text>
      </View>
    </View>
  );
}

function LineageCell({ name, years, desc }) {
  return (
    <View style={styles.lineageCell}>
      <Text style={styles.lineageName}>{name}</Text>
      <Text style={styles.lineageYears}>{years}</Text>
      <Text style={styles.lineageDesc}>{desc}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.void },
  scroll: { paddingBottom: 60 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 24 : 12,
    gap: 10,
  },
  liveDot: { width: 9, height: 9, borderRadius: 5 },
  brand: {
    fontFamily: 'Spectral_500Medium',
    fontSize: 16,
    letterSpacing: 3,
    color: colors.paper,
  },
  brandSub: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 9,
    color: colors.paperDim,
    paddingHorizontal: 20,
    paddingTop: 4,
    letterSpacing: 0.5,
  },

  hero: { padding: 20, paddingTop: 28 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  eyebrowLine: { width: 20, height: 1, backgroundColor: colors.goldDim },
  eyebrow: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.gold,
  },
  h1: {
    fontFamily: 'Spectral_400Regular',
    fontSize: 30,
    lineHeight: 36,
    color: colors.paper,
    marginBottom: 14,
  },
  h1Em: {
    fontFamily: 'Spectral_400Regular_Italic',
    fontStyle: 'italic',
    color: colors.gold,
  },
  heroDesc: {
    fontFamily: 'Spectral_300Light',
    fontSize: 15,
    lineHeight: 23,
    color: colors.paperDim,
  },

  instrument: {
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.void2,
  },
  readingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sensorRow: {
    padding: 16,
    borderTopWidth: 0.5,
    borderTopColor: colors.line,
    gap: 12,
  },
  sensorStatus: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 11,
    color: colors.paperDim,
    lineHeight: 16,
  },
  btn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.lineBright,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 2,
  },
  btnText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 11,
    letterSpacing: 0.6,
    color: colors.gold,
  },

  section: {
    paddingHorizontal: 20,
    paddingVertical: 32,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    marginTop: 12,
  },
  sectionNum: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    color: colors.goldDim,
    letterSpacing: 1,
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: 'Spectral_400Regular',
    fontSize: 20,
    color: colors.paper,
    marginBottom: 20,
  },
  sectionTitleEm: {
    fontFamily: 'Spectral_400Regular_Italic',
    fontStyle: 'italic',
    color: colors.gold,
  },

  layer: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingVertical: 20,
  },
  layerTag: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    letterSpacing: 1,
    color: colors.gold,
    marginBottom: 8,
  },
  layerBody: {},
  layerTitle: {
    fontFamily: 'Spectral_500Medium',
    fontSize: 16,
    color: colors.paper,
    marginBottom: 6,
  },
  layerText: {
    fontFamily: 'Spectral_300Light',
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.paperDim,
  },
  layerRef: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    color: colors.goldDim,
    marginTop: 8,
  },

  eqBox: {
    borderWidth: 1,
    borderColor: colors.lineBright,
    backgroundColor: colors.void2,
    padding: 24,
    alignItems: 'center',
  },
  eqMain: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 20,
    color: colors.gold,
    letterSpacing: 0.5,
  },
  eqCaption: {
    fontFamily: 'Spectral_400Regular_Italic',
    fontStyle: 'italic',
    fontSize: 12,
    color: colors.paperDim,
    marginTop: 14,
    textAlign: 'center',
    lineHeight: 18,
  },

  lineageCell: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingVertical: 16,
  },
  lineageName: { fontFamily: 'Spectral_500Medium', fontSize: 14.5, color: colors.paper },
  lineageYears: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    color: colors.goldDim,
    marginTop: 2,
    marginBottom: 6,
  },
  lineageDesc: {
    fontFamily: 'Spectral_300Light',
    fontSize: 12.5,
    color: colors.paperDim,
    lineHeight: 18,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 30,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    gap: 8,
  },
  footerQuote: {
    fontFamily: 'Spectral_400Regular_Italic',
    fontStyle: 'italic',
    fontSize: 12.5,
    color: colors.paperDim,
  },
  footerBrand: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    color: colors.paperDim,
  },
});
