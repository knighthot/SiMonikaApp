// WaveBackground.js
import React from 'react';
import { Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export default function WaveBackground() {
  // Shared values for each wave layer
  const translateX1 = useSharedValue(0);
  const translateX2 = useSharedValue(0);
  const translateX3 = useSharedValue(0);

  // Start the animations
  React.useEffect(() => {
    translateX1.value = withRepeat(
      withTiming(-width, { duration: 12000 }),
      -1,
      false
    );
    translateX2.value = withRepeat(
      withTiming(-width, { duration: 8000 }),
      -1,
      false
    );
    translateX3.value = withRepeat(
      withTiming(-width, { duration: 5000 }),
      -1,
      false
    );
  }, []);

  // Animated styles for each wave
  const animatedStyle1 = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX1.value }],
  }));
  const animatedStyle2 = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX2.value }],
  }));
  const animatedStyle3 = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX3.value }],
  }));

  return (
    <>
      {/* Wave Layer 1 - White */}
      <Animated.View style={[{ position: 'absolute', top: 10 }, animatedStyle1]}>
        <Svg width={width * 2} height={120} viewBox={`0 0 ${width * 2} 120`}>
          <Path
            d={`M0,60 C150,0 ${width},120 ${width * 2},60 V120 H0 Z`}
            fill="#FFFFFF"
            opacity="0.9"
          />
        </Svg>
      </Animated.View>

      {/* Wave Layer 2 - #9ED0FF */}
      <Animated.View style={[{ position: 'absolute', top: 0 }, animatedStyle2]}>
        <Svg width={width * 2} height={120} viewBox={`0 0 ${width * 2} 120`}>
          <Path
            d={`M0,60 C200,120 ${width},0 ${width * 2},60 V120 H0 Z`}
            fill="#9ED0FF"
            opacity="0.7"
          />
        </Svg>
      </Animated.View>

      {/* Wave Layer 3 - #67B6FF */}
      <Animated.View style={[{ position: 'absolute', top: 0 }, animatedStyle3]}>
        <Svg width={width * 2} height={120} viewBox={`0 0 ${width * 2} 120`}>
          <Path
            d={`M0,60 C100,0 ${width},120 ${width * 2},60 V120 H0 Z`}
            fill="#67B6FF"
            opacity="0.7"
          />
        </Svg>
      </Animated.View>
    </>
  );
}
