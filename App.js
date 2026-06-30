// App.js
import React from 'react';
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

import { colors, stateForIndex } from './theme';

import { useKpData } from './hooks/useKpData';
import { useF107Data } from './hooks/useF107Data';
import { useDonkiData } from './hooks/useDonkiData';
import { useMagnetometer } from './hooks/useMagnetometer';
import { useDissipativeIndex } from './hooks/useDissipativeIndex';
import { useLightSensor } from './hooks/useLightSensor';
import { useUVIndex } from './hooks/useUVIndex';

import Gauge from './components/Gauge';
import Oscilloscope from './components/Oscilloscope';
import ReadingCell from './components/ReadingCell';
import EquationCard from './components/EquationCard';
import MechanismCard from './components/MechanismCard';
import KpHistoryChart from './components/KpHistoryChart';
import SolarCycleExplainer from './components/SolarCycleExplainer';
import Logbook from './components/Logbook';
import { LightCell, UVCell } from './components/LightReading';
import HeartRateMonitor from './components/HeartRateMonitor';
import DataDiagnostic from './components/DataDiagnostic';
import CycleHorizon from './components/CycleHorizon';
import { useCycleEngine } from './hooks/useCycleEngine';

export default function App() {
  const [fontsLoaded] = useFonts({
    Spectral_300Light,
    Spectral_400Regular,
    Spectral_500Medium,
    Spectral_400Regular_Italic,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  const { kp, kpHistory, isLive: kpIsLive, lastUpdate } = useKpData();
  const { f107, isLive: f107IsLive } = useF107Data();
  const { donki, isLive: donkiIsLive } = useDonkiData();
  const { mag, magRef, sensorActive, sensorAvailable, activateSensor } = useMagnetometer();
  const { indexValue, scopeData } = useDissipativeIndex({ mag, magRef, kp });
  const { composite, modules } = useCycleEngine();
  const lightSensor = useLightSensor();
  const uv = useUVIndex();

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
            <LightCell
              lux={lightSensor.lux}
              sensorActive={lightSensor.sensorActive}
              sensorAvailable={lightSensor.sensorAvailable}
              platformSupported={lightSensor.platformSupported}
              activateSensor={lightSensor.activateSensor}
            />
            <UVCell
              uvIndex={uv.uvIndex}
              isLive={uv.isLive}
              locationLabel={uv.locationLabel}
              permissionStatus={uv.permissionStatus}
              refetch={uv.refetch}
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

        {/* Diagnostic */}
        <Section num="00 · DIAGNÓSTICO" title="Estado de las " em="fuentes de datos">
          <CycleHorizon composite={composite} modules={modules} />
          <DataDiagnostic />
        </Section>

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

        {/* Heart Rate */}
        <Section num="08 · PULSO" title="Tu propia " em="señal biológica">
          <HeartRateMonitor />
        </Section>

        {/* Lineage */}
        <Section num="09 · LINAJE" title="Sobre los hombros de " em="quienes vieron primero">
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
