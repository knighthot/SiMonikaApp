
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  G,
  Rect,
  Circle,
} from 'react-native-svg';


import { House_sea, Boat, Alat_IoT } from '../../../Assets/Svg/index';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');


function makeWavePath({
  width,
  height,
  amplitude = 16,
  wavelength = 220,
  phase = 0,
  baseline = 0,
}) {
  // gambar sin wave 0..width
  const points = [];
  const step = 6; // semakin kecil semakin halus
  for (let x = 0; x <= width; x += step) {
    const y =
      baseline + amplitude * Math.sin((2 * Math.PI * x) / wavelength + phase);
    points.push([x, y]);
  }
  // tutup path ke bawah layar agar bisa di-fill
  const d =
    `M 0 ${height} ` +
    `L 0 ${points[0][1].toFixed(2)} ` +
    points.map(([x, y]) => `L ${x.toFixed(2)} ${y.toFixed(2)}`).join(' ') +
    ` L ${width} ${height} Z`;
  return d;
}

// --- Badge status mini
const StatusChip = ({ color = '#28D35A', text = 'AMAN' }) => (
  <View className="flex-row items-center rounded-full bg-white/70 px-3 py-1">
    <View style={{ backgroundColor: color }} className="w-3 h-3 rounded-full mr-2" />
    <Text className="text-slate-900 font-extrabold text-[12px]">{text}</Text>
  </View>
);

// --- Card legenda
const LegendCard = () => (
  <View className="absolute left-6 right-6"
    style={{ bottom: Dimensions.get('window').height * 0.33 }}>
    <View className="rounded-2xl border border-black/5 bg-white/80 px-4 py-3 shadow-lg">
      {/* Row 1 */}
      <View className="flex-row items-center justify-between">
        <Text className="text-slate-900 text-[14px]">
          <Text className="font-extrabold">1 = PH</Text>
        </Text>
        <Text className="text-slate-900 text-[14px]">
          <Text className="font-extrabold">2 = SUHU</Text>
        </Text>
        <StatusChip color="#28D35A" text="AMAN" />
      </View>

      <View className="h-2" />

      {/* Row 2 */}
      <View className="flex-row items-center justify-between">
        <Text className="text-slate-900 text-[14px]">
          <Text className="font-extrabold">3 = SALINITAS</Text>
        </Text>
        <Text className="text-slate-900 text-[14px]">
          <Text className="font-extrabold">4 = KEKERUHAN</Text>
        </Text>
        <StatusChip color="#FF2D2D" text="RUSAK" />
      </View>
    </View>
  </View>
);

// --- Card status + CTA Chat AI
const StatusCard = ({ onPress, text = 'Kondisi Alat Anda “Tidak Rusak”' }) => (
  <View className="absolute left-6 right-6 rounded-3xl overflow-hidden shadow-xl"
    style={{ bottom: Dimensions.get('window').height * 0.18 }}>
    <View className="bg-[#E2EDF9] px-5 py-6 items-center">
      <Text className="text-slate-900 text-[14px] font-semibold text-center">
        {text}
      </Text>
    </View>

    <TouchableOpacity onPress={onPress} activeOpacity={0.9}
      className="bg-[#5D8FD1] py-4 items-center">
      <Text className="text-white font-extrabold text-[18px] tracking-[0.3px]">
        Klik Untuk  Chat AI
      </Text>
    </TouchableOpacity>
  </View>
);


export default function MonitoringIot({ navigation }) {
  // phase animasi global → dipakai bersama untuk ombak & bobbing
  const [phase, setPhase] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    let last = Date.now();
    const tick = () => {
      const now = Date.now();
      const dt = (now - last) / 1000; // detik
      last = now;
      // speed putaran (radian/detik)
      setPhase((p) => p + dt * 1.2);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // bobbing offset (untuk kapal & alat)
  const bobY = Math.sin(phase) * 8; // ±8 px
  const bobSmall = Math.sin(phase * 1.6) * 4; // variasi kecil

  // dimensi area “air”
  const WATER_TOP = SCREEN_H * 0.3; // garis atas area air (biar sesuai mockup)
  const WATER_H = SCREEN_H - WATER_TOP;

  const toDeg = (rad) => (rad * 180) / Math.PI;

  // Param ombak depan (SAMA dengan wave1 kamu)
  const W1 = { A: 16, L: 220 }; // amplitude & wavelength
  // Baseline wave1 kamu: WATER_TOP + WATER_H * 0.15  (lihat kodenya)
  function waveAt({ x, phase, baseline }) {
    const k = (2 * Math.PI) / W1.L;
    const y = baseline + W1.A * Math.sin(k * x + phase);        // tinggi gelombang di X
    const slope = W1.A * k * Math.cos(k * x + phase);           // dy/dx (kemiringan)
    const angleRad = Math.atan(slope);                          // sudut permukaan air
    return { y, angleRad };
  }

  // Baseline & phase wave1 kamu
  const baseline1 = WATER_TOP + WATER_H * 0.1;  // sama seperti wave1 baseline
  const phase1 = phase * 1.0;                    // pakai phase yang sama dengan wave1

  // Posisi X objek di layar (kira-kira): alat di kiri, boat di kanan
  const deviceX = SCREEN_W * 0.22;
  const boatX = SCREEN_W * 0.68;

  // Sample gelombang di titik X masing-masing
  const dev = waveAt({ x: deviceX, phase: phase1, baseline: baseline1 });
  const boat = waveAt({ x: boatX, phase: phase1, baseline: baseline1 });

  // Translate Y = ketinggian gelombang relatif baseline (efek bobbing)
  const deviceBobY = dev.y - baseline1;
  const boatBobY = boat.y - baseline1;

  // Rotasi mengikuti/“melawan” kemiringan gelombang
  const deviceAngleDeg = Math.max(-5, Math.min(5, toDeg(dev.angleRad) * 0.5));
  const boatAngleDeg = Math.max(-8, Math.min(8, -toDeg(boat.angleRad) * 0.8)); // minus = “melawan arus”

  // Drift kecil di sumbu X biar terasa didorong arus (lawan arah gerak wave)
  const counterCurrentX = -Math.cos(phase * 0.6) * 6;  // ±6 px

  // 2 layer ombak (parallax)
  const wave1 = makeWavePath({
    width: SCREEN_W,
    height: SCREEN_H,
    amplitude: 16,
    wavelength: 220,
    phase: phase * 1.0,
    baseline: WATER_TOP + WATER_H * 0.1,
  });

  const wave2 = makeWavePath({
    width: SCREEN_W,
    height: SCREEN_H,
    amplitude: 24,
    wavelength: 320,
    phase: phase * 0.7 + Math.PI / 2,
    baseline: WATER_TOP + WATER_H * 0.100,
  });

  return (
    <View style={styles.root}>
      {/* Latar langit */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#EAF2FF' }]} />

      {/* Rumah di tepi laut */}
      <View style={[styles.houseWrap, { transform: [{ translateY: bobSmall }] }]}>
        <House_sea width={220} height={220} />
      </View>

      {/* === SVG BACK: AIR + OMBAK BELAKANG === */}
      <Svg width={SCREEN_W} height={SCREEN_H} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#8EC9FF" stopOpacity="1" />
            <Stop offset="100%" stopColor="#3D6FB4" stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Laut */}
        <Rect x={0} y={WATER_TOP} width={SCREEN_W} height={SCREEN_H - WATER_TOP} fill="url(#waterGrad)" />

        {/* Ombak belakang (putih tipis) */}
        <G opacity={0.4}>
           {[...Array(6)].map((_, i) => (<Circle key={i} cx={20 + (i % 2) * 18} cy={WATER_TOP + 80 + i * 60 + (i % 2 ? bobY : -bobY)} r={10 + (i % 3) * 3} fill="#FFFFFF" />))} 
        </G>
        <Path d={wave2} fill="rgba(255,255,255,0.15)" />
      </Svg>

      
      <View
        style={[
          styles.deviceWrap,
          {
            transform: [
              { translateY: deviceBobY },        // ikut naik-turun gelombang di X ala
            ],
          },
        ]}
      >

        
        <Alat_IoT width={150} height={300} />
        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>Tidak Ada Kerusakan</Text>
        </View>
      </View>


      {/* === SVG FRONT: OMBAK MERAH MENIMPA ALAT === */}
      <Svg width={SCREEN_W} height={SCREEN_H} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient
            id="waveGrad"
            x1="0" y1={WATER_TOP} x2="0" y2={SCREEN_H}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0%" stopColor="#67B6FF" stopOpacity={1} />
            <Stop offset="100%" stopColor="#061451" stopOpacity={1} />
          </LinearGradient>
        </Defs>

        <Path d={wave1} fill="url(#waveGrad)" opacity={0.6} />
      </Svg>


      <View
        style={[
          styles.boatWrap,
          {
            transform: [
              { translateX: counterCurrentX },   // drift kecil lawan arus
              { translateY: boatBobY },          // naik-turun sesuai gelombang di X boat
              { rotateZ: `${boatAngleDeg}deg` }, // miring lawan kemiringan permukaan
            ],
          },
        ]}
      >
        <Boat width={120} height={120} />
      </View>

      <View className='absolute left-2 right-2 bottom-10'>
        <LegendCard />
      </View>
      <View className='absolute left-2 right-2 bottom-6'>
        <StatusCard onPress={() => navigation?.navigate?.('ChatAi')} />
      </View>


    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#EAF2FF',
  },

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
  statusPill: {
    position: 'absolute',
    top: 62,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    left: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  statusPillText: {
    fontWeight: '800',
    color: '#1B3551',
    fontSize: 8,
  },

  boatWrap: {
    position: 'absolute',
    right: 10,
    zIndex: 0,
    top: SCREEN_H * 0.28,
  },


});

