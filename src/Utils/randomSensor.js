export const getRandomSensorData = () => {
  return {
    Suhu: (Math.random() * (34 - 28) + 28).toFixed(1),         // 28°C - 34°C
    PH: (Math.random() * (9 - 6) + 6).toFixed(1),              // 6 - 9
    Salinitas: (Math.random() * (35 - 15) + 15).toFixed(1),    // 15 - 35 ppt
    Kekeruhan: (Math.random() * (300 - 10) + 10).toFixed(0),   // 10 - 300 NTU
  };
};
