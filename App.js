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
import EquationCard from './components/EquationCard';
import MechanismCard from './components/MechanismCard';
import KpHistoryChart from './components/KpHistoryChart';
import SolarCycleExplainer from './components/SolarCycleExplainer';
import Logbook from './components/Logbook';

const SCOPE_LEN = 60;
const MAG_BASELINE = 48; // μT, aproximación de campo terrestre típico

// Clave de la API de NASA DONKI. Se lee de la variable de entorno EXPO_PUBLIC_NASA_API_KEY
// (definida en .env, nunca commiteada al repo). Si no está configurada, cae a DEMO_KEY
// — funcional pero limitada a 30 peticiones/hora compartidas globalmente.
const NASA_API_KEY = process.env.EXPO_PUBLIC_NASA_API_KEY || 'DEMO_KEY';

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
  const [kpHistory, setKpHistory] = useState([]);
  const [kpIsLive, setKpIsLive] = useState(true);
  const [f107, setF107] = useState(null);
  const [f107IsLive, setF107IsLive] = useState(true);
  const [donki, setDonki] = useState(null); // { type, label, time } del evento más reciente, o null
  const [donkiIsLive, setDonkiIsLive] = useState(true);
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

      // La primera fila es la cabecera (["time_tag","kp",...]); el resto son
      // lecturas de 3h durante ~7 días. Extraemos todo el histórico válido,
      // no solo el último punto, para poder graficar la tendencia.
      const historyValues = [];
      for (let i = 1; i < json.length; i++) {
        const candidate = parseFloat(json[i][1]);
        if (Number.isFinite(candidate)) historyValues.push(candidate);
      }

      if (historyValues.length === 0) throw new Error('no valid Kp row found');

      const kpValue = historyValues[historyValues.length - 1];

      setKp(kpValue);
      setKpHistory(historyValues);
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

  // ---------- NOAA F10.7 (flujo de radio solar, sfu) ----------
  const fetchF107 = useCallback(async () => {
    try {
      const res = await fetch('https://services.swpc.noaa.gov/json/f107_cm_flux.json');
      if (!res.ok) throw new Error('network');
      const json = await res.json();
      if (!Array.isArray(json) || json.length === 0) throw new Error('empty');

      // El esquema exacto de campo puede variar; probamos los nombres más probables
      // y validamos que el resultado sea un número real antes de aceptarlo.
      let f107Value = null;
      for (let i = json.length - 1; i >= 0; i--) {
        const row = json[i];
        const candidate = parseFloat(
          row.flux ?? row.f107 ?? row.observed_flux ?? row.f107_flux ?? row.value
        );
        if (Number.isFinite(candidate)) {
          f107Value = candidate;
          break;
        }
      }

      if (f107Value === null) throw new Error('no valid F10.7 row found');

      setF107(f107Value);
      setF107IsLive(true);
    } catch (e) {
      // Rango típico real: ~65 (mínimo solar) a ~300 (máximo solar), en sfu
      setF107(70 + Math.random() * 40);
      setF107IsLive(false);
    }
  }, []);

  useEffect(() => {
    fetchF107();
    const interval = setInterval(fetchF107, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchF107]);

  // ---------- NASA DONKI (eyecciones de masa coronal y llamaradas recientes) ----------
  const fetchDonki = useCallback(async () => {
    try {
      const today = new Date();
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fmt = (d) => d.toISOString().slice(0, 10);

      const url =
        `https://api.nasa.gov/DONKI/notifications?startDate=${fmt(sevenDaysAgo)}` +
        `&endDate=${fmt(today)}&type=all&api_key=${NASA_API_KEY}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('network');
      const json = await res.json();
      if (!Array.isArray(json) || json.length === 0) {
        setDonki(null); // sin eventos recientes es un resultado válido, no un error
        setDonkiIsLive(true);
        return;
      }

      const latest = json[json.length - 1];
      setDonki({
        type: latest.messageType || 'Evento',
        label: (latest.messageBody || '').slice(0, 140),
        time: latest.messageIssueTime || null,
      });
      setDonkiIsLive(true);
    } catch (e) {
      setDonki(null);
      setDonkiIsLive(false);
    }
  }, []);

  useEffect(() => {
    fetchDonki();
    const interval = setInterval(fetchDonki, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchDonki]);

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
    if (Platform.OS === 'web') {
      // El módulo nativo de Magnetometer no existe en navegador.
      // No lo intentamos: pasamos directo al modo simulado, sin errores en consola.
      setSensorAvailable(false);
      return;
    }
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
              value={Number.isFinite(kp) ? kp.toFixed(1) : '—'}
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
              label="Flujo solar F10.7 (NOAA)"
              value={Number.isFinite(f107) ? f107.toFixed(0) : '—'}
              unit={f107IsLive ? 'sfu' : 'sfu*'}
              note="Flujo de radio a 2800 MHz, proxy clásico de actividad solar."
            />
            <ReadingCell
              label="Evento solar reciente (NASA DONKI)"
              value={donki ? donki.type : 'Sin eventos'}
              note={
                donkiIsLive
                  ? donki
                    ? 'Últimos 7 días, vía NASA DONKI.'
                    : 'Sin notificaciones DONKI en los últimos 7 días.'
                  : 'NASA DONKI no disponible — reintentando.'
              }
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
                : Platform.OS === 'web'
                ? 'El navegador no expone el magnetómetro — descarga la app para lectura real del dispositivo.'
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

        {/* Kp History */}
        <Section num="02 · TENDENCIA" title="Los últimos " em="7 días de campo">
          <KpHistoryChart history={kpHistory} />
        </Section>

        {/* Solar Cycle */}
        <Section num="03 · ESCALA LARGA" title="Dónde estamos en el " em="ciclo de 11 años">
          <SolarCycleExplainer />
        </Section>

        {/* Layers */}
        <Section num="04 · MODELO" title="Tres capas de " em="acoplamiento">
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
        <Section num="05 · FORMALISMO" title="La ecuación que " em="gobierna el índice">
          <EquationCard index={indexValue} />
        </Section>

        {/* Mechanisms */}
        <Section num="06 · MECANISMOS" title="Cómo el cosmos " em="toca la célula">
          <Text style={styles.mechanismsIntro}>
            Cuatro vías documentadas de acoplamiento entre el entorno físico y la
            fisiología. Cada una con su propio grado de certeza científica — no
            todas están igual de establecidas, y ese matiz importa.
          </Text>
          <MechanismCard
            title="Luz → ritmo circadiano y hormonal"
            evidence="established"
            mechanism="Células ganglionares de la retina, sensibles a la luz, informan al núcleo supraquiasmático (SCN) del hipotálamo. El SCN sincroniza relojes periféricos en todo el cuerpo y regula la secreción nocturna de melatonina y el ritmo de cortisol."
            source="Zisapel, 2018 · Br J Pharmacol — mecanismo bien establecido"
          />
          <MechanismCard
            title="Aero-ionización → sangre y sistema nervioso"
            evidence="hypothesis"
            mechanism="Chizhevsky propuso una cadena causal: erupciones solares inducen tormentas geomagnéticas, que alteran la ionización atmosférica; los aero-iones inhalados influirían en la agregación de eritrocitos y la transmisión de impulsos nerviosos."
            source="Chizhevsky, fundador de la aero-ionización — hipótesis histórica, en debate"
          />
          <MechanismCard
            title="Resonancia Schumann → ondas cerebrales"
            evidence="partial"
            mechanism="La cavidad Tierra-ionosfera resuena a ~7.83 Hz, en el rango de las ondas alfa cerebrales. Estudios de EEG han hallado coherencia espectral entre la resonancia Schumann y la actividad cortical en algunos sujetos, de forma no continua."
            source="Pobachenko et al., 2006; Saroka & Persinger — evidencia correlacional, no concluyente"
          />
          <MechanismCard
            title="Geomagnetismo → viscosidad sanguínea"
            evidence="hypothesis"
            mechanism="La hipótesis de Chizhevsky extiende el mecanismo de aero-ionización: cambios en el campo geomagnético modularían la carga eléctrica superficial (potencial zeta) de los eritrocitos, afectando su tendencia a agregarse y la viscosidad de la sangre."
            source="Tradición de la electrohematología de Chizhevsky — requiere más validación moderna"
          />
        </Section>

        {/* Logbook */}
        <Section num="07 · BITÁCORA" title="Tu propio " em="registro">
          <Logbook currentIndex={indexValue} currentKp={kp} />
        </Section>

        {/* Lineage */}
        <Section num="08 · LINAJE" title="Sobre los hombros de " em="quienes vieron primero">
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
  mechanismsIntro: {
    fontFamily: 'Spectral_300Light',
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.paperDim,
    marginBottom: 4,
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
