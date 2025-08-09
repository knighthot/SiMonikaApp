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

const { width } = Dimensions.get('window');
const height = 120;

function Wave({ color, opacity }) {
  return (
    <Svg width={width} height={height}>
      <Path
        d={`M0,60 C150,0 ${width / 2},120 ${width},60 V${height} H0 Z`}
        fill={color}
        opacity={opacity}
      />
    </Svg>
  );
}

export default function WaveBackground() {
  // Geser horizontal tiap layer
  const x1 = useSharedValue(0);
  const x2 = useSharedValue(0);
  const x3 = useSharedValue(0);

  // Gerak naik-turun
  const yOffset = useSharedValue(0);

  useEffect(() => {
    const moveWave = (shared, speed) => {
      shared.value = withRepeat(
        withTiming(-width, { duration: speed, easing: Easing.linear }),
        -1,
        false
      );
    };
    moveWave(x1, 12000);
    moveWave(x2, 8000);
    moveWave(x3, 5000);

    // Ombak naik-turun
    yOffset.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(5, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const style1 = useAnimatedStyle(() => ({
    transform: [{ translateX: x1.value }, { translateY: yOffset.value }],
  }));
  const style2 = useAnimatedStyle(() => ({
    transform: [{ translateX: x2.value }, { translateY: yOffset.value / 2 }],
  }));
  const style3 = useAnimatedStyle(() => ({
    transform: [{ translateX: x3.value }, { translateY: yOffset.value / 3 }],
  }));

  return (
    <View style={{ position: 'absolute', width: '100%', height, zIndex: 1 }}>
      {/* Layer 1 */}
      <Animated.View style={[{ flexDirection: 'row' }, style1]}>
        <Wave color="#FFFFFF" opacity={0.9} />
        <Wave color="#FFFFFF" opacity={0.9} />
      </Animated.View>

      {/* Layer 2 */}
      <Animated.View style={[{ flexDirection: 'row', position: 'absolute', top: 0 ,zIndex: 2}, style2]}>
        <Wave color="#9ED0FF" opacity={0.7} />
        <Wave color="#9ED0FF" opacity={0.7} />
      </Animated.View>

      {/* Layer 3 */}
      <Animated.View style={[{ flexDirection: 'row', position: 'absolute', top: 0 ,zIndex: 3 }, style3]}>
        <Wave color="#67B6FF" opacity={0.7} />
        <Wave color="#67B6FF" opacity={0.7} />
      </Animated.View>
    </View>
  );
}
