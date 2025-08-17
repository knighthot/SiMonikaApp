import React, { useMemo } from 'react';
import { Dimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// Gelombang halus pakai Bezier (tanpa animasi)
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

const { width: SCREEN_W } = Dimensions.get('window');

const CardWave = ({
  height = 96,
  paddingX = 32, // mx-4 pada kartu -> 16 kiri + 16 kanan
  mainColor = '#9ED0FF',   // biru bawah
  bandColor = '#67B6FF',   // pita gelombang muda di atas
}) => {
  // lebar area dalam kartu = lebar layar - padding horizontal
  const W = SCREEN_W - paddingX;
  const H = height;

  const mainPath = useMemo(
    () => makeWavePathBezier(W, H, 10, W * 0.70, 0.85),
    [W, H]
  );
  const bandPath = useMemo(
    () => makeWavePathBezier(W, H, 12, W * 0.80, 0.75),
    [W, H]
  );

  return (
    <View style={{ width: W, height: H }}>
      <Svg width={W} height={H}>
        {/* Biru utama (paling bawah) */}
        <Path d={mainPath} fill={mainColor} />
        {/* Pita gelombang muda di atasnya */}
        <Path d={bandPath} fill={bandColor} />
      </Svg>
    </View>
  );
};

export default CardWave;
