import React, { useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const COLORS = {
  d2f8ff: '#D2F8FF',
  c0f5ff: '#C0F5FF',
  lightblue: '#94D8E5',
  teal: '#7BD1E0',
  darkblue: '#0A3455',
  white: '#FFFFFF',
};

export default function SplashAnimation() {
  const d2f8ffSize = useSharedValue(150);
  const c0f5ffSize = useSharedValue(0);
  const lightblueSize = useSharedValue(0);
  const bgBubbleSize = useSharedValue(0);
  const bgColor = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    // Step 1-2: Titik pertama pop ke 100
    d2f8ffSize.value = withTiming(100, {
      duration: 500,
      easing: Easing.out(Easing.exp),
    });

    // Step 4: Titik kedua pop keluar dari tengah titik pertama
    setTimeout(() => {
      c0f5ffSize.value = withTiming(200, {
        duration: 500,
        easing: Easing.out(Easing.exp),
      });
    }, 1000);

    // Step 5: Titik ketiga lightblue muncul dari belakang
    setTimeout(() => {
      lightblueSize.value = withTiming(400, {
        duration: 500,
        easing: Easing.out(Easing.exp),
      });
    }, 1600);

    // Step 6: Bubble besar mengembang mengganti background
    setTimeout(() => {
      bgBubbleSize.value = withTiming(Math.sqrt(width ** 2 + height ** 2) * 2, {
        duration: 700,
        easing: Easing.out(Easing.exp),
      }, () => {
        bgColor.value = 1;
      });
    }, 2200);

    // Step 7: Logo muncul dengan efek pop
    setTimeout(() => {
      logoOpacity.value = withTiming(1, { duration: 100 });
      logoScale.value = withSpring(1, {
        damping: 6,
        stiffness: 120,
        mass: 0.4,
      });
    }, 3000);

    // Step 7.5: Background kembali putih
    setTimeout(() => {
      bgColor.value = withTiming(0, { duration: 600 });
    }, 3700);

    // Step 7.6: Hapus titik lain, sisakan c0f5ff dan logo
    setTimeout(() => {
      d2f8ffSize.value = withTiming(0, { duration: 300 });
      c0f5ffSize.value = withTiming(200, { duration: 300 });
      lightblueSize.value = withTiming(0, { duration: 300 });
      bgBubbleSize.value = withTiming(0, { duration: 300 });
    }, 4300);

    // Step 8: Tampilkan teks
    setTimeout(() => {
      textOpacity.value = withTiming(1, { duration: 400 });
    }, 4700);
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    backgroundColor: bgColor.value === 1 ? COLORS.teal : COLORS.white,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }));

  const bubbleBackgroundStyle = useAnimatedStyle(() => ({
    width: bgBubbleSize.value,
    height: bgBubbleSize.value,
    backgroundColor: COLORS.teal,
    borderRadius: bgBubbleSize.value / 2,
    position: 'absolute',
    top: height / 2 - bgBubbleSize.value / 2,
    left: width / 2 - bgBubbleSize.value / 2,
    zIndex: -3,
  }));

  const d2f8ffStyle = useAnimatedStyle(() => ({
    width: d2f8ffSize.value,
    height: d2f8ffSize.value,
    backgroundColor: COLORS.d2f8ff,
    borderRadius: d2f8ffSize.value / 2,
    position: 'absolute',
    top: height / 2 - d2f8ffSize.value / 2,
    left: width / 2 - d2f8ffSize.value / 2,
    zIndex: -1,
  }));

  const c0f5ffStyle = useAnimatedStyle(() => ({
    width: c0f5ffSize.value,
    height: c0f5ffSize.value,
    backgroundColor: COLORS.c0f5ff,
    borderRadius: c0f5ffSize.value / 2,
    position: 'absolute',
    top: height / 2 - c0f5ffSize.value / 2,
    left: width / 2 - c0f5ffSize.value / 2,
    zIndex: -2,
  }));

  const lightblueStyle = useAnimatedStyle(() => ({
    width: lightblueSize.value,
    height: lightblueSize.value,
    backgroundColor: COLORS.lightblue,
    borderRadius: lightblueSize.value / 2,
    position: 'absolute',
    top: height / 2 - lightblueSize.value / 2,
    left: width / 2 - lightblueSize.value / 2,
    zIndex: -3,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return (
    <Animated.View style={[containerStyle]}>
      <Animated.View style={bubbleBackgroundStyle} />
      <Animated.View style={lightblueStyle} />
      <Animated.View style={c0f5ffStyle} />
      <Animated.View style={d2f8ffStyle} />

      <Animated.View style={logoStyle}>
        <Image
          source={require('../../Assets/Image/Logo.png')}
          style={{ width: 100, height: 100, resizeMode: 'contain' }}
        />
      </Animated.View>

  
      <Animated.View style={[textStyle, styles.textContainer]}>
  <Text style={styles.title}>SiMonika</Text>
  <Text style={styles.subtitle}>Sistem Monitoring Ikan</Text>
</Animated.View>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
    textContainer: {
        alignItems: 'center',
        position: 'absolute',
        top: height / 2 + 120,
      },
      
      title: {
        fontSize: 28,
        fontWeight: '700',
        color: COLORS.darkblue,
        fontFamily: 'Poppins-Bold', // pastikan font ini tersedia atau install via expo-font
      },
      
      subtitle: {
        fontSize: 16,
        fontWeight: '400',
        color: COLORS.darkblue,
        fontFamily: 'Poppins-Regular',
      },
      
});
