
import React, { useEffect } from 'react';
import { Dimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_W } = Dimensions.get('window');

function Wave({ color, opacity, W, H }) {
  const midY = H * 0.5;
  const d = `M0,${midY}
             C${W * 0.25},${midY - H * 0.5} ${W * 0.5},${midY + H * 0.5} ${W},${midY}
             V${H} H0 Z`;
  return (
    <Svg width={W} height={H}>
      <Path d={d} fill={color} opacity={opacity} />
    </Svg>
  );
}

export default function WaveBackground({
  height = 120,
  whiteOnTop = true,
  whiteOffset = 10,   // ➜ turunin layer putih beberapa px
}) {
  const WAVELEN = SCREEN_W;

  const x1 = useSharedValue(0);
  const x2 = useSharedValue(0);
  const x3 = useSharedValue(0);
  const y = useSharedValue(0);

  useEffect(() => {
    const loop = (sv, duration) => {
      sv.value = withRepeat(withTiming(-WAVELEN, { duration, easing: Easing.linear }), -1, false);
    };
    loop(x3, 12000);
    loop(x2, 8000);
    loop(x1, 5000);

    y.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(5,  { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const style = (x, factor, base = 0) =>
    useAnimatedStyle(() => ({
      transform: [{ translateX: x.value }, { translateY: y.value * factor + base }],
    }));

  // susunan: belakang → depan
  const layers = whiteOnTop
    ? [
        { key: 'blueDark', color: '#67B6FF', opacity: 0.7, x: x3, factor: 1,    base: 0,  z: 1 },
        { key: 'blueLite', color: '#9ED0FF', opacity: 0.7, x: x2, factor: 1/2,  base: 0,  z: 2 },
        // putih paling depan + diturunin
        { key: 'white',    color: '#FFFFFF', opacity: 1.0, x: x1, factor: 1/3,  base: whiteOffset, z: 3 },
      ]
    : [
        { key: 'white',    color: '#FFFFFF', opacity: 1.0, x: x1, factor: 1/3,  base: 0,  z: 1 },
        { key: 'blueLite', color: '#9ED0FF', opacity: 0.7, x: x2, factor: 1/2,  base: 0,  z: 2 },
        { key: 'blueDark', color: '#67B6FF', opacity: 0.7, x: x3, factor: 1,    base: 0,  z: 3 },
      ];

  return (
    <View style={{ position: 'absolute', left: 0, right: 0, height }}>
      {layers.map(l => (
        <Animated.View
          key={l.key}
          style={[{ position: 'absolute', top: 0, flexDirection: 'row', zIndex: l.z }, style(l.x, l.factor, l.base)]}
        >
          <Wave color={l.color} opacity={l.opacity} W={WAVELEN} H={height} />
          <Wave color={l.color} opacity={l.opacity} W={WAVELEN} H={height} />
        </Animated.View>
      ))}
    </View>
  );
}
