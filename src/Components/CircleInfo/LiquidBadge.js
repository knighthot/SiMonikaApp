// Components/CircleInfo/LiquidBadge.js
import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// gelombang halus pakai quadratic bezier
function makeWavePathBezier(totalW, totalH, amp, waveLen, levelRatio = 0.5) {
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const levelY = clamp(totalH * (1 - levelRatio), 0, totalH);
  const half = waveLen / 2;

  let d = `M 0 ${totalH} L 0 ${levelY}`;
  let x = 0;
  let crestUp = true;

  while (x <= totalW + half) {
    const cx = x + half / 2;
    const cy = levelY + (crestUp ? -amp : amp);
    const x2 = x + half;
    d += ` Q ${cx} ${cy} ${x2} ${levelY}`;
    crestUp = !crestUp;
    x = x2;
  }
  d += ` L ${totalW} ${totalH} Z`;
  return d;
}

const STATUS = {
  baik:   { ring: '#9AE6B4', text: '#22c55e', waves: ['#70B8FF', '#539EE8'], level: 0.75, amp: 0.11 },
  sedang: { ring: '#F7D58E', text: '#f59e0b', waves: ['#C7EEFF', '#80D6F1'], level: 0.45, amp: 0.10 },
  buruk:  { ring: '#F87171', text: '#ef4444', waves: ['#C7EEFF', '#99DBFF'], level: 0.15, amp: 0.09 },
};

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const LiquidBadge = ({ size = 120, status = 'baik', label = 'Baik' }) => {
  const cfg = useMemo(() => STATUS[status] || STATUS.baik, [status]);

  // wavelength lebih pendek → terasa lebih “hidup”
  const WAVELEN_FRONT = size * 0.85;
  const WAVELEN_BACK  = size * 1.05;

  // kanvas dibuat lebih lebar supaya loop mulus
  const waveW = size + WAVELEN_BACK;
  const waveH = size;

  // driver translateX (acak durasi setiap loop)
  const a1 = useRef(new Animated.Value(0)).current;
  const a2 = useRef(new Animated.Value(0)).current;

  // bobbing naik–turun lembut
  const bob1 = useRef(new Animated.Value(0)).current;
  const bob2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // fungsi loop dengan durasi acak (lebih natural)
    const startLoop = (val, minDur, maxDur) => {
      const run = () => {
        val.setValue(0);
        Animated.timing(val, {
          toValue: 1,
          duration: rand(minDur, maxDur),
          easing: Easing.linear,
          useNativeDriver: true,
        }).start(({ finished }) => finished && run());
      };
      run();
    };

    // kecepatan “nyata”: 1.8–2.8s (front), 2.4–3.6s (back) per panjang gelombang
    startLoop(a1, 1800, 2800);
    startLoop(a2, 2400, 3600);

    // bobbing sinus lembut (fase berbeda antar layer)
    const bobAmp = Math.max(2, size * 0.02);

    const loopBob = (val, delay = 0) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, { toValue: 1, duration: 900, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(val, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start();

    loopBob(bob1, 0);
    loopBob(bob2, 450);

    return () => {
      a1.stopAnimation(); a2.stopAnimation();
      bob1.stopAnimation(); bob2.stopAnimation();
    };
  }, [a1, a2, bob1, bob2, size]);

  const t1x = a1.interpolate({ inputRange: [0, 1], outputRange: [0, -WAVELEN_BACK] });
  const t2x = a2.interpolate({ inputRange: [0, 1], outputRange: [0, -WAVELEN_FRONT] });

  const bobAmpPx = Math.max(2, size * 0.02);
  const t1y = bob1.interpolate({ inputRange: [0, 1], outputRange: [-bobAmpPx, bobAmpPx] });
  const t2y = bob2.interpolate({ inputRange: [0, 1], outputRange: [bobAmpPx * 0.6, -bobAmpPx * 0.6] });

  // path gelombang (dua layer)
  const pathBack = useMemo(
    () => makeWavePathBezier(waveW, waveH, Math.max(6, size * cfg.amp), WAVELEN_BACK, cfg.level),
    [waveW, waveH, size, cfg.amp, cfg.level]
  );
  const pathFront = useMemo(
    () => makeWavePathBezier(waveW, waveH, Math.max(8, size * (cfg.amp + 0.03)), WAVELEN_FRONT, cfg.level + 0.02),
    [waveW, waveH, size, cfg.amp, cfg.level]
  );

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 6,
        borderColor: cfg.ring,
        overflow: 'hidden',
        backgroundColor: '#fff',
      }}
    >
      {/* Wave belakang */}
      <Animated.View
        style={{
          position: 'absolute',
          width: waveW,
          height: waveH,
          transform: [{ translateX: t1x }, { translateY: t1y }],
        }}
      >
        <Svg width={waveW} height={waveH}>
          <Path d={pathBack} fill={cfg.waves[0]} />
        </Svg>
      </Animated.View>

      {/* Wave depan */}
      <Animated.View
        style={{
          position: 'absolute',
          width: waveW,
          height: waveH,
          transform: [{ translateX: t2x }, { translateY: t2y }],
        }}
      >
        <Svg width={waveW} height={waveH}>
          <Path d={pathFront} fill={cfg.waves[1]} />
        </Svg>
      </Animated.View>

      {/* Label */}
      <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' ,}}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: cfg.text }}>{label}</Text>
      </View>
    </View>
  );
};

export default LiquidBadge;
