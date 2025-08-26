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
} from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

import { House_sea, Boat, Alat_IoT } from '../../../Assets/Svg/index';
import { listPerangkatByTambak, getIotLast } from '../../../api';

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/* -------------------- Konstanta & util -------------------- */
const FIELD_STALE_MS = 5000; // >5 detik dianggap stale (kuning)
const POLL_MS = 5000;        // polling IoT tiap 5 detik
const COLOR_OK = '#00FF37';
const COLOR_STALE = '#FFC107';
const COLOR_ERR = '#FF2D2D';

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

/* -------------------- Overlay bar warna di atas Alat_IoT -------------------- */
/** Koordinat batang pada alat (basis 201x355). */
function AlatWithBars({ width = 150, height = 300, status }) {
  const sx = width / 201;
  const sy = height / 35;
  const barColor = (s) => (s === 'ok' ? COLOR_OK : s === 'stale' ? COLOR_STALE : COLOR_ERR);
  const bars = [
    { key: 'PH',         x: 34,  w: 14, y1: 218, y2: 319 },
    { key: 'Suhu',       x: 70,  w: 14, y1: 218, y2: 326 },
    { key: 'Salinitas',  x: 104, w: 14, y1: 218, y2: 306 },
    { key: 'Kekeruhan',  x: 137, w: 14, y1: 218, y2: 340 },
  ];
  return (
    <View style={{ width, height }}>
      <Alat_IoT width={width} height={height} />
      <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
        {bars.map(({ key, x, w, y1, y2 }) => (
          <Rect
            key={key}
            x={x * sx}
            y={y1 * sy}
            width={w * sx}
            height={(y2 - y1) * sy}
            fill={barColor(status?.[key])}
            opacity={0.95}
            rx={2 * sx}
          />
        ))}
      </Svg>
    </View>
  );
}

/* -------------------- Screen -------------------- */
export default function MonitoringIot({ navigation, route }) {
  /* ====== Device discovery (listPerangkatByTambak) ====== */
  const [deviceId, setDeviceId] = useState(
    route?.params?.ID_PerangkatIot ||
    route?.params?.perangkat?.ID_PerangkatIot ||
    route?.params?.deviceId ||
    null
  );
  const tambakId = route?.params?.ID_Tambak || route?.params?.me?.ID_Tambak || null;

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
      } catch {}
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

  const statusPillText = useMemo(() => {
    const bad = Object.entries(sensorStatus).filter(([, s]) => s !== 'ok').map(([k]) => k);
    if (!deviceId) return 'Perangkat belum dipilih';
    if (bad.length === 0) return 'Tidak Ada Kerusakan';
    if (bad.length === 4) return 'Semua sensor tidak merespons';
    return `Sensor bermasalah: ${bad.join(', ')}`;
  }, [sensorStatus, deviceId]);

  const sameStatus = (a, b) =>
    a && b && a.PH === b.PH && a.Suhu === b.Suhu && a.Salinitas === b.Salinitas && a.Kekeruhan === b.Kekeruhan;

  useEffect(() => {
    if (!deviceId) return;
    let mounted = true;
    const timer = setInterval(async () => {
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
    }, POLL_MS);

    return () => { mounted = false; clearInterval(timer); };
  }, [deviceId]);

  /* ====== Animasi ringan: bobbing & drift pakai Animated (native driver) ====== */
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
  const boatBobY   = bob.interpolate({ inputRange: [0, 1], outputRange: [5, -5] });
  const boatDriftX = drift.interpolate({ inputRange: [0, 1], outputRange: [-6, 6] });
  const boatTiltDeg= tilt.interpolate({ inputRange: [0, 1], outputRange: ['-5deg', '5deg'] });
  const houseBobY  = bob.interpolate({ inputRange: [0, 1], outputRange: [-3, 3] });

  /* ====== Water & Waves ====== */
  const WATER_TOP = SCREEN_H * 0.3;
  const WATER_H = SCREEN_H - WATER_TOP;

  // BACKGROUND: laut + ombak belakang (statis)
  const backWavePath = useMemo(
    () => makeWavePath({ width: SCREEN_W, height: SCREEN_H, amplitude: 16, wavelength: 300, baseline: WATER_TOP + WATER_H * 0.08 }),
    [WATER_TOP, WATER_H]
  );

// ===== Ombak depan (bergerak) =====
const FRONT_WAVELENGTH = 300;
const TILE_W = useMemo(
  () => Math.ceil(SCREEN_W / FRONT_WAVELENGTH) * FRONT_WAVELENGTH,
  []
);

const frontWavePath = useMemo(
  () =>
    makeWavePath({
      width: TILE_W,
      height: SCREEN_H,
      amplitude: 16,
      wavelength: FRONT_WAVELENGTH,
      baseline: WATER_TOP + WATER_H * 0.10,
    }),
  [TILE_W, WATER_TOP, WATER_H]
);

const waveShift = useRef(new Animated.Value(0)).current;
useEffect(() => {
  Animated.loop(
    Animated.timing(waveShift, {
      toValue: 1,
      duration: 4500,
      easing: Easing.linear,
      useNativeDriver: true,
    })
  ).start();
}, [waveShift]);

// ke kiri: 0 → -TILE_W
const translateX = waveShift.interpolate({
  inputRange: [0, 1],
  outputRange: [0, -TILE_W],
});


  return (
    <View style={styles.root}>
      {/* Langit */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#EAF2FF' }]} />

      {/* Rumah (bobbing ringan) */}
      <Animated.View style={[styles.houseWrap, { transform: [{ translateY: houseBobY }] }]}>
        <House_sea width={220} height={220} />
      </Animated.View>

      {/* BACKGROUND: Laut + ombak belakang statis */}
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
        <AlatWithBars width={150} height={300} status={sensorStatus} />
      </Animated.View>

    <AnimatedSvg
    width={TILE_W * 2}
    height={SCREEN_H}
    style={{
      transform: [{ translateX }],
      // bonus performa:
      renderToHardwareTextureAndroid: true,
      // @ts-ignore
      shouldRasterizeIOS: true,
    }}
  >
    <Defs>
      <LinearGradient
        id="frontWaveGrad"
        x1="0"
        y1={WATER_TOP}
        x2="0"
        y2={SCREEN_H}
        gradientUnits="userSpaceOnUse"
      >
        <Stop offset="0%" stopColor="#67B6FF" stopOpacity={0.85} />
        <Stop offset="100%" stopColor="#061451" stopOpacity={0.85} />
      </LinearGradient>
    </Defs>

    {/* dua tile identik, path kedua digeser TEPAT TILE_W */}
    <Path d={frontWavePath} fill="url(#frontWaveGrad)" opacity={0.75} />
    <Path
      d={frontWavePath}
      fill="url(#frontWaveGrad)"
      opacity={0.75}
      transform={`translate(${TILE_W}, 0)`}
    />
  </AnimatedSvg>

      {/* KAPAL (di atas ombak depan biar kelihatan) */}
      <Animated.View
        style={[
          styles.boatWrap,
          {
            transform: [
              { translateX: boatDriftX },
              { translateY: boatBobY },
              { rotateZ: boatTiltDeg },
            ],
          },
        ]}
      >
        <Boat width={120} height={120} />
      </Animated.View>

      {/* Status pill & legend & CTA */}
      <View style={styles.statusPill}>
        <Text style={styles.statusPillText}>{statusPillText}</Text>
      </View>

      <View className="absolute left-2 right-2 bottom-10">
        <LegendCard />
      </View>
      <View className="absolute left-2 right-2 bottom-6">
        <StatusCard onPress={() => navigation?.navigate?.('ChatAi')} text={statusPillText} />
      </View>
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
  // statusPill: {
  //   position: 'absolute',
  //   top: SCREEN_H * 0.20 + 66,
  //   left: 120,
  //   backgroundColor: '#FFFFFF',
  //   paddingHorizontal: 14,
  //   paddingVertical: 8,
  //   borderRadius: 12,
  //   shadowColor: '#000',
  //   shadowOpacity: 0.18,
  //   shadowOffset: { width: 0, height: 3 },
  //   shadowRadius: 6,
  //   elevation: 3,
  // },
  statusPillText: { fontWeight: '800', color: '#1B3551', fontSize: 10 },
  boatWrap: {
    position: 'absolute',
    right: 10,
    zIndex: 2, // di atas ombak depan
    top: SCREEN_H * 0.28,
  },
});
