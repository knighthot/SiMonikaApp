// src/Utils/BubblesBackground.js
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const BubblesBackground = () => {
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        pointerEvents: 'none',
      }}
    >
      <Svg height="100%" width="100%">
        {/* Bubbles kiri */}
        <Circle cx="20" cy="100" r="8" fill="#BFE9FF" opacity="0.7" />
        <Circle cx="40" cy="200" r="5" fill="#BFE9FF" opacity="0.5" />
        <Circle cx="30" cy="300" r="10" fill="#BFE9FF" opacity="0.6" />
        <Circle cx="50" cy="450" r="6" fill="#BFE9FF" opacity="0.4" />

        {/* Bubbles kanan */}
        <Circle cx="360" cy="150" r="7" fill="#BFE9FF" opacity="0.7" />
        <Circle cx="340" cy="280" r="5" fill="#BFE9FF" opacity="0.6" />
        <Circle cx="350" cy="400" r="9" fill="#BFE9FF" opacity="0.5" />
        <Circle cx="370" cy="500" r="6" fill="#BFE9FF" opacity="0.4" />
      </Svg>
    </View>
  );
};

export default BubblesBackground;
