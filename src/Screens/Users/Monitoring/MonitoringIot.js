// MonitoringIot.js
import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  Easing,
  AppState,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  UIManager,
  LayoutAnimation,
} from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

import { House_sea, Boat, Alat_IoT } from '../../../Assets/Svg/index';
import { getMe, listPerangkatByTambak, getIotLast } from '../../../api';

const AnimatedSvg = Animated.createAnimatedComponent(Svg);
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Aktifkan LayoutAnimation di Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/* -------------------- Konstanta & util -------------------- */
// >2 detik = stale (sesuai permintaan → bar jadi merah)
const FIELD_STALE_MS = 2000;
const POLL_MS = 5000; // polling IoT tiap 5 detik

const num = (v) => {
  const n = Number(v);
  if (Number.isFinite(n)) return n;
  if (v && typeof v === 'object' && Number.isFinite(Number(v.p50))) return Number(v.p50);
  return NaN;
};
const parseTs = (t) => {
  if (!t) return NaN;
  if (typeof t === 'number') {
    if (t > 1e12) return t;
    if (t > 1e9) return t * 1000;
    return NaN;
  }
  const ms = +new Date(t);
  return Number.isFinite(ms) ? ms : NaN;
};

/* -------------------- Wave path (precompute, super ringan) -------------------- */
function makeWavePath({ width, height, amplitude = 22, wavelength = 250, baseline = 0 }) {
  const points = [];
  const step = 12; // langkah lebih besar → ringan
  for (let x = 0; x <= width; x += step) {
    const y = baseline + amplitude * Math.sin((2 * Math.PI * x) / wavelength);
    points.push([x, y]);
  }
  const d =
    `M 0 ${height} L 0 ${points[0][1].toFixed(2)} ` +
    points.map(([x, y]) => `L ${x.toFixed(2)} ${y.toFixed(2)}`).join(' ') +
    ` L ${width} ${height} Z`;
  return d;
}

/* -------------------- Mini UI -------------------- */
const StatusChip = ({ color = '#28D35A', text = 'AMAN' }) => (
  <View className="flex-row items-center rounded-full bg-white/70 px-3 py-1">
    <View style={{ backgroundColor: color }} className="w-3 h-3 rounded-full mr-2" />
    <Text className="text-slate-900 font-extrabold text-[12px]">{text}</Text>
  </View>
);

const LegendCard = () => (
  <View className="absolute left-6 right-6" style={{ bottom: Dimensions.get('window').height * 0.33 }}>
    <View className="rounded-2xl border border-black/5 bg-white/80 px-4 py-3 shadow-lg">
      <View className="flex-row items-center justify-between">
        <Text className="text-slate-900 text-[14px]"><Text className="font-extrabold">1 = PH</Text></Text>
        <Text className="text-slate-900 text-[14px]"><Text className="font-extrabold">2 = SUHU</Text></Text>
        <StatusChip color="#28D35A" text="AMAN" />
      </View>
      <View className="h-2" />
      <View className="flex-row items-center justify-between">
        <Text className="text-slate-900 text-[14px]"><Text className="font-extrabold">3 = SALINITAS</Text></Text>
        <Text className="text-slate-900 text-[14px]"><Text className="font-extrabold">4 = KEKERUHAN</Text></Text>
        <StatusChip color="#FF2D2D" text="RUSAK" />
      </View>
    </View>
  </View>
);

const StatusCard = ({ onPress, text }) => (
  <View className="absolute left-6 right-6 rounded-3xl overflow-hidden shadow-xl"
    style={{ bottom: Dimensions.get('window').height * 0.18 }}>
    <View className="bg-[#E2EDF9] px-5 py-6 items-center">
      <Text className="text-slate-900 text-[14px] font-semibold text-center">{text}</Text>
    </View>
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} className="bg-[#5D8FD1] py-4 items-center">
      <Text className="text-white font-extrabold text-[18px] tracking-[0.3px]">Klik Untuk  Chat AI</Text>
    </TouchableOpacity>
  </View>
);

/* -------------------- Dropdown ala dashboard -------------------- */
const Dropdown = ({ label, options = [], value, onChange }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.key === value);
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ fontWeight: '700', color: '#1B3551', marginBottom: 6 }}>{label}</Text>
      <TouchableOpacity
        onPress={() => { LayoutAnimation.easeInEaseOut(); setOpen(!open); }}
        className="bg-slate-200 rounded-xl px-3 py-2 flex-row items-center justify-between"
      >
        <Text className="font-semibold text-slate-800">{selected?.label || '-'}</Text>
        <Text className="text-slate-600">{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {open && (
        <View className="mt-2 bg-slate-100 rounded-xl p-3">
          <View className="flex-row flex-wrap">
            {options.map((it) => (
              <TouchableOpacity
                key={it.key}
                onPress={() => { onChange?.(it.key); LayoutAnimation.easeInEaseOut(); setOpen(false); }}
                className={`px-3 py-2 rounded-xl mr-2 mb-2 ${value === it.key ? 'bg-[#67A9F3]' : 'bg-slate-300'}`}
              >
                <Text className={`${value === it.key ? 'text-white' : 'text-slate-800'} font-semibold`}>
                  {it.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

/* -------------------- Screen -------------------- */
export default function MonitoringIot({ navigation, route }) {
  /* ====== Me & perangkat discovery ====== */
  const [me, setMe] = useState(route?.params?.me || null);
  const [tambakId, setTambakId] = useState(
    route?.params?.ID_Tambak || route?.params?.me?.ID_Tambak || null
  );
  const [deviceId, setDeviceId] = useState(
    route?.params?.ID_PerangkatIot ||
    route?.params?.perangkat?.ID_PerangkatIot ||
    route?.params?.deviceId ||
    null
  );

  // Ambil me + cari perangkat aktif bila belum ada
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!tambakId) {
          const meSrv = await getMe().catch(() => null);
          if (cancelled) return;
          if (meSrv) {
            setMe(meSrv);
            if (meSrv?.ID_Tambak) setTambakId(meSrv.ID_Tambak);
          }
        }
      } catch { }
    })();

    return () => { cancelled = true; };
  }, []); // sekali saat mount

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (deviceId || !tambakId) return;
      try {
        const list = await listPerangkatByTambak(tambakId, { page: 1, limit: 10 }).catch(() => null);
        if (cancelled || !list) return;
        const rows = list?.rows || list?.data || list || [];
        const aktif = rows.find((r) => r.Status === 'Aktif') || rows[0];
        if (aktif?.ID_PerangkatIot) setDeviceId(aktif.ID_PerangkatIot);
      } catch { }
    })();
    return () => { cancelled = true; };
  }, [tambakId, deviceId]);

  /* ====== Status sensor dari IoT (getIotLast) ====== */
  const [sensorStatus, setSensorStatus] = useState({
    PH: 'error',
    Suhu: 'error',
    Salinitas: 'error',
    Kekeruhan: 'error',
  });

  const sameStatus = (a, b) =>
    a && b && a.PH === b.PH && a.Suhu === b.Suhu && a.Salinitas === b.Salinitas && a.Kekeruhan === b.Kekeruhan;

  // polling + pause saat background
  const pollRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    let mounted = true;

    const tick = async () => {
      if (!mounted || !deviceId) return;
      if (appStateRef.current !== 'active') return;

      try {
        const raw = await getIotLast(deviceId).catch(() => null);
        if (!mounted) return;
        const P = raw?.Parameter ?? raw ?? {};
        const now = Date.now();

        const pickTs = (key) => {
          const alts = key === 'PH' ? ['PH', 'pH', 'ph'] : [key, key.toLowerCase()];
          const cands = [
            ...alts.map((k) => P?.[`${k}_ts`]),
            ...alts.map((k) => P?.[`${k}_time`]),
            ...alts.map((k) => P?.[`${k}Time`]),
            P?.Timestamp, P?.timestamp, P?.time, P?.updatedAt, P?.updated_at,
          ];
          for (const c of cands) {
            const ms = parseTs(c);
            if (Number.isFinite(ms)) return ms;
          }
          return NaN;
        };

        const mk = (key) => {
          const v = key === 'PH' ? num(P?.PH ?? P?.pH ?? P?.ph) : num(P?.[key] ?? P?.[String(key).toLowerCase?.()]);
          if (!Number.isFinite(v)) return 'error';
          const t = pickTs(key);
          const stale = Number.isFinite(t) ? now - t > FIELD_STALE_MS : false;
          return stale ? 'stale' : 'ok';
        };

        const next = {
          PH: mk('PH'),
          Suhu: mk('Suhu'),
          Salinitas: mk('Salinitas'),
          Kekeruhan: mk('Kekeruhan'),
        };
        setSensorStatus((prev) => (sameStatus(prev, next) ? prev : next));
      } catch {
        if (!mounted) return;
        const next = { PH: 'error', Suhu: 'error', Salinitas: 'error', Kekeruhan: 'error' };
        setSensorStatus((prev) => (sameStatus(prev, next) ? prev : next));
      }
    };

    // start poller
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(tick, POLL_MS);
    // fire once segera
    tick();

    const sub = AppState.addEventListener('change', (next) => {
      appStateRef.current = next;
      if (next === 'active') tick();
    });

    return () => {
      mounted = false;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      sub?.remove?.();
    };
  }, [deviceId]);

  // label panel putih di Alat_IoT
  const panelLabel = useMemo(() => {
    if (!deviceId) return 'Perangkat belum dipilih';
    const vals = ['PH', 'Suhu', 'Salinitas', 'Kekeruhan'].map(k => (sensorStatus?.[k] || 'error').toLowerCase());
    const allErr = vals.length && vals.every(v => v === 'error');
    const anyErr = vals.some(v => v === 'error');
    const anyStale = vals.some(v => v === 'stale');
    const allOk = vals.length && vals.every(v => v === 'ok');
    if (allErr) return 'Alat Tidak Merespons';
    if (anyErr) return 'Sensor Bermasalah';
    if (anyStale) return 'Sensor Tidak Mengirim (>2s)';
    if (allOk) return 'Tidak Ada Kerusakan';
    return 'Memuat status…';
  }, [sensorStatus, deviceId]);

  // status utk bar warna (stale → merah)
  const statusForBars = useMemo(() => {
    const keys = ['PH', 'Suhu', 'Salinitas', 'Kekeruhan'];
    const out = {};
    keys.forEach(k => {
      const s = (sensorStatus?.[k] || 'error').toLowerCase();
      out[k] = (s === 'stale') ? 'error' : s;
    });
    return out;
  }, [sensorStatus]);

  /* ====== Animasi ringan ====== */
  const bob = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;
  const tilt = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(tilt, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(tilt, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
  }, [bob, drift, tilt]);

  const deviceBobY = bob.interpolate({ inputRange: [0, 1], outputRange: [-6, 6] });
  const boatBobY = bob.interpolate({ inputRange: [0, 1], outputRange: [5, -5] });
  const boatDriftX = drift.interpolate({ inputRange: [0, 1], outputRange: [-6, 6] });
  const boatTiltDeg = tilt.interpolate({ inputRange: [0, 1], outputRange: ['-5deg', '5deg'] });
  const houseBobY = bob.interpolate({ inputRange: [0, 1], outputRange: [-3, 3] });

  /* ====== Water & Waves ====== */
  const WATER_TOP = SCREEN_H * 0.3;
  const WATER_H = SCREEN_H - WATER_TOP;

  const backWavePath = useMemo(
    () => makeWavePath({ width: SCREEN_W, height: SCREEN_H, amplitude: 16, wavelength: 300, baseline: WATER_TOP + WATER_H * 0.08 }),
    [WATER_TOP, WATER_H]
  );

  const FRONT_WAVELENGTH = 300;
  const TILE_W = useMemo(() => Math.ceil(SCREEN_W / FRONT_WAVELENGTH) * FRONT_WAVELENGTH, []);
  const frontWavePath = useMemo(
    () => makeWavePath({ width: TILE_W, height: SCREEN_H, amplitude: 16, wavelength: FRONT_WAVELENGTH, baseline: WATER_TOP + WATER_H * 0.10 }),
    [TILE_W, WATER_TOP, WATER_H]
  );
  const waveShift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(waveShift, { toValue: 1, duration: 4500, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, [waveShift]);
  const translateX = waveShift.interpolate({ inputRange: [0, 1], outputRange: [0, -TILE_W] });

  /* ====== Modal Tanya AI (dropdown gaya dashboard) ====== */
  const [askOpen, setAskOpen] = useState(false);

  const personaList = [
    { key: 'ahli', label: 'Ahli Kualitas Air Tambak' },
    { key: 'operator', label: 'Operator Tambak (praktis)' },
    { key: 'teknisi', label: 'Teknisi Alat IoT' },
  ];
  const [persona, setPersona] = useState('ahli');

  const privacyList = [
    { key: 'status', label: 'Kirim status sensor' },
    { key: 'nodata', label: 'Jangan kirim data' },
  ];
  const [privacy, setPrivacy] = useState('status');

  // Perintah & Format (dropdown)
  const perintahList = [
    { key: 'analisis', label: 'Analisis kondisi & risiko' },
    { key: 'rekom', label: 'Berikan rekomendasi langkah' },
    { key: 'analisis_rekom', label: 'Analisis + Rekomendasi' },
  ];
  const formatList = [
    { key: 'ringkas', label: 'Ringkas: paragraf + 2 tindakan' },
    { key: 'langkah', label: 'Langkah-langkah bernomor' },
    { key: 'tabel', label: 'Ringkas tabel + bullet' },
  ];
  const [perintah, setPerintah] = useState(perintahList[0].key);
  const [format, setFormat] = useState(formatList[0].key);

  const [question, setQuestion] = useState('');

  const sensorSummary = useMemo(() => {
    const mapWord = (s) => (s === 'ok' ? 'OK' : s === 'stale' ? 'Lambat (>2s)' : 'Tidak Merespons');
    return [
      `pH=${mapWord(sensorStatus.PH)}`,
      `Suhu=${mapWord(sensorStatus.Suhu)}`,
      `Salinitas=${mapWord(sensorStatus.Salinitas)}`,
      `Kekeruhan=${mapWord(sensorStatus.Kekeruhan)}`
    ].join(', ');
  }, [sensorStatus]);

  const buildPrompt = () => {
    const yearNow = new Date().getFullYear();
    const yearMin = yearNow - 5;
    const labelOf = (arr, k) => arr.find((x) => x.key === k)?.label || k;
    const lines = [
      `Persona: ${personaList.find(p => p.key === persona)?.label || persona}.`,
      `Konteks: Monitoring perangkat IoT tambak.`,
      `Perangkat: ${deviceId || '-'}.`,
      `Status alat: ${panelLabel}.`,
      privacy === 'status' ? `Status sensor: ${sensorSummary}.` : `Data sensor: (tidak dibagikan).`,
      question.trim()
        ? `Pertanyaan pengguna: "${question.trim()}".`
        : `Perintah: ${labelOf(perintahList, perintah)}.`,
      `Format jawaban: ${labelOf(formatList, format)}.`,
      `Sertakan referensi ≤ ${yearMin}-${yearNow} bila relevan. Jelaskan ketidakpastian bila data kurang.`,
    ];
    return lines.join('\n');
  };

  const previewPrompt = useMemo(buildPrompt, [persona, privacy, question, deviceId, panelLabel, sensorSummary, perintah, format]);

  const onSendToChat = () => {
    try {
      setAskOpen(false);
      navigation.navigate('ChatAi', {
        initialPrompt: previewPrompt,
        autoSend: true,
        preferNewSession: true,
      });
    } catch (e) {
      Alert.alert('Gagal', e?.message || 'Gagal membuka chat');
    }
  };

  return (
    <View style={styles.root}>
      {/* Langit */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#EAF2FF' }]} />

      {/* Rumah */}
      <Animated.View style={[styles.houseWrap, { transform: [{ translateY: houseBobY }] }]}>
        <House_sea width={220} height={220} />
      </Animated.View>

      {/* BACKGROUND: Laut + ombak belakang */}
      <Svg width={SCREEN_W} height={SCREEN_H} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#8EC9FF" stopOpacity="1" />
            <Stop offset="100%" stopColor="#3D6FB4" stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id="backWaveGrad" x1="0" y1={WATER_TOP} x2="0" y2={SCREEN_H} gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#8FC3FF" stopOpacity={0.35} />
            <Stop offset="100%" stopColor="#17396B" stopOpacity={0.35} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={WATER_TOP} width={SCREEN_W} height={SCREEN_H - WATER_TOP} fill="url(#waterGrad)" />
        <Path d={backWavePath} fill="url(#backWaveGrad)" />
      </Svg>

      {/* ALAT IoT (di bawah ombak depan) */}
      <Animated.View style={[styles.deviceWrap, { transform: [{ translateY: deviceBobY }] }]}>
        <Alat_IoT width={150} height={300} status={statusForBars} label={panelLabel} />
      </Animated.View>

      {/* Ombak depan (overlay menimpa alat) */}
      <AnimatedSvg width={TILE_W * 2} height={SCREEN_H} style={{ transform: [{ translateX }] }} pointerEvents="none">
        <Defs>
          <LinearGradient id="frontWaveGrad" x1="0" y1={WATER_TOP} x2="0" y2={SCREEN_H} gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#67B6FF" stopOpacity={0.85} />
            <Stop offset="100%" stopColor="#061451" stopOpacity={0.85} />
          </LinearGradient>
        </Defs>
        <Path d={frontWavePath} fill="url(#frontWaveGrad)" opacity={0.75} />
        <Path d={frontWavePath} fill="url(#frontWaveGrad)" opacity={0.75} transform={`translate(${TILE_W}, 0)`} />
      </AnimatedSvg>

      {/* Kapal */}
      <Animated.View
        style={[
          styles.boatWrap,
          { transform: [{ translateX: boatDriftX }, { translateY: boatBobY }, { rotateZ: boatTiltDeg }] },
        ]}
      >
        <Boat width={120} height={120} />
      </Animated.View>

      {/* Legend & CTA */}
      <View className="absolute left-2 right-2 bottom-10">
        <LegendCard />
      </View>
      <View className="absolute left-2 right-2 bottom-6">
        <StatusCard onPress={() => setAskOpen(true)} text={panelLabel} />
      </View>

      {/* ===== Modal Tanya AI ===== */}
      <Modal visible={askOpen} transparent animationType="fade" onRequestClose={() => setAskOpen(false)}>
        <View className="flex-1 bg-black/40 items-center justify-center px-6">
          <View className="w-full rounded-2xl bg-white p-4">
            <Text className="text-lg font-bold mb-1">Tanya AI</Text>
            <Text className="text-slate-600 mb-3">
              Prompt otomatis memakai status perangkat & sensor saat ini.
            </Text>

            <Dropdown
              label="Persona"
              options={personaList}
              value={persona}
              onChange={setPersona}
            />
            {/* Privasi (chip) */}
            <Dropdown
              label="Privasi"
              options={privacyList}
              value={privacy}
              onChange={setPrivacy}
            />

            {/* Perintah & Format (dropdown ala dashboard) */}
            <Dropdown
              label="Perintah (dipakai jika kolom Pertanyaan kosong)"
              options={perintahList}
              value={perintah}
              onChange={setPerintah}
            />
            <Dropdown
              label="Format jawaban"
              options={formatList}
              value={format}
              onChange={setFormat}
            />

            {/* Pertanyaan opsional */}
            <Text style={styles.groupTitle}>Pertanyaan (opsional)</Text>
            <TextInput
              value={question}
              onChangeText={setQuestion}
              placeholder="contoh: sensor mana yang harus dicek dulu?"
              multiline
              style={styles.textField}
            />

            {/* Preview */}
            <Text style={styles.groupTitle}>Preview sebelum dikirim</Text>
            <View style={{ maxHeight: 160 }} className="rounded-xl bg-slate-100 p-3">
              <ScrollView>
                <Text className="text-slate-800">{previewPrompt}</Text>
              </ScrollView>
            </View>

            {/* Actions */}
            <View className="flex-row justify-end mt-3">
              <TouchableOpacity onPress={() => setAskOpen(false)} className="px-4 py-2 rounded-xl mr-2 bg-slate-200">
                <Text className="font-semibold">Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onSendToChat} className="px-4 py-2 rounded-xl bg-[#5D8FD1]">
                <Text className="text-white font-extrabold">Kirim</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* -------------------- Styles -------------------- */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#EAF2FF' },
  houseWrap: {
    position: 'absolute',
    right: -25,
    top: Platform.select({ ios: 94, android: 80 }),
  },
  deviceWrap: {
    position: 'absolute',
    top: SCREEN_H * 0.20,
    alignSelf: 'center',
    alignItems: 'center',
  },
  boatWrap: {
    position: 'absolute',
    right: 10,
    zIndex: 2, // di atas ombak depan
    top: SCREEN_H * 0.28,
  },
  textField: {
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#D8DEE9',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#fff',
  },
  groupTitle: { fontWeight: '700', color: '#1B3551', marginTop: 10, marginBottom: 6 },
});
