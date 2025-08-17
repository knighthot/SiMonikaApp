// src/Screens/Admins/ManajementPerangkat/PerangkatDetail.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { PeralatanIcons } from '../../../Assets/Svg';
import WaveBackground from '../../../Utils/WaveBackground';
import Svg, { Circle } from 'react-native-svg';
import { getRandomSensorData } from '../../../Utils/randomSensor';

const Row = ({ label, value }) => (
  <View className="mb-4">
    <Text className="text-[16px] text-slate-900">
      {label} <Text className="font-bold">{value ?? '-'}</Text>
    </Text>
  </View>
);

/** --- Status rules per metric --- */
const getMetricStatus = (metric, rawVal) => {
  // mati jika tidak ada nilai
  if (rawVal === null || rawVal === undefined || Number.isNaN(Number(rawVal))) {
    return 'mati';
  }
  const v = Number(rawVal);

  switch (metric) {
    case 'suhu': {
      // normal 28-32, warning 26-28 / 32-34, anomali di luar itu
      if (v >= 28 && v <= 32) return 'normal';
      if ((v >= 26 && v < 28) || (v > 32 && v <= 34)) return 'warning';
      return 'anomali';
    }
    case 'ph': {
      // normal 7.5-8.5, warning 7-7.5 / 8.5-9, anomali di luar itu
      if (v >= 7.5 && v <= 8.5) return 'normal';
      if ((v >= 7 && v < 7.5) || (v > 8.5 && v <= 9)) return 'warning';
      return 'anomali';
    }
    case 'salinitas': {
      // normal 15-25 ppt, warning 10-15 / 25-30, anomali di luar itu
      if (v >= 15 && v <= 25) return 'normal';
      if ((v >= 10 && v < 15) || (v > 25 && v <= 30)) return 'warning';
      return 'anomali';
    }
    case 'kekeruhan': {
      // normal 0-100 NTU, warning 100-200, anomali >200
      if (v <= 100) return 'normal';
      if (v > 100 && v <= 200) return 'warning';
      return 'anomali';
    }
    default:
      return 'normal';
  }
};

const statusStyle = (status) => {
  switch (status) {
    case 'normal':
      return { color: '#22c55e', progress: 1.0 };
    case 'warning':
      return { color: '#f59e0b', progress: 0.5 };
    case 'anomali':
      return { color: '#ef4444', progress: 0.25 };
    case 'mati':
    default:
      return { color: '#9ca3af', progress: 0.0 };
  }
};

/** Gauge melingkar (SVG) */
const RingGauge = ({ valueText, progress = 0.35, color = '#22c55e' }) => {
  const SIZE = 120;
  const STROKE = 10;
  const R = (SIZE - STROKE * 2) / 2; // radius
  const C = 2 * Math.PI * R; // keliling
  const clamped = Math.max(0, Math.min(1, progress));
  const offset = C * (1 - clamped);

  return (
    <View className="items-center justify-center">
      <View
        className="rounded-full items-center justify-center shadow relative"
        style={{ width: SIZE, height: SIZE, }}
      >
        <Svg width={SIZE} height={SIZE}>
          {/* ring putih background */}
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke="white"
            strokeWidth={STROKE}
            fill="none"
          />
          {/* arc berwarna */}
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={C}
            strokeDashoffset={offset}
            // start di kiri-bawah ± seperti mockup
            transform={`rotate(-110 ${SIZE / 2} ${SIZE / 2})`}
          />
        </Svg>

        {/* text tepat di tengah */}
        <View className="absolute inset-0 items-center justify-center">
          <Text className="text-[20px] font-extrabold" style={{ color }}>
            {valueText}
          </Text>
        </View>
      </View>
    </View>
  );
};

// Kartu Gauge
const GaugeCard = ({ valueText = '-', status = 'normal', label = 'LABEL' }) => {
  const { color, progress } = statusStyle(status);
  return (
    <View className="w-[260px] max-w-[260px] rounded-2xl overflow-hidden bg-[#cfe8ff]">
      <View className="items-center justify-center py-6">
        <RingGauge valueText={valueText} progress={progress} color={color} />
      </View>
      <View className="bg-[#67A9F3] items-center py-3">
        <Text className="text-white font-extrabold text-[18px]">{label}</Text>
      </View>
    </View>
  );
};

const PerangkatDetail = ({ route, navigation }) => {
  const perangkat = route?.params?.perangkat ?? {};
  const namaTambak = perangkat?.Nama ?? perangkat?.Nama_LokasiPerangkat ?? '-';

 // 🔌 sambungkan ke data sensor dari dummyPerangkatList
  const [sensor, setSensor] = useState({
    Suhu: perangkat?.Suhu ?? null,
    PH: perangkat?.PH ?? null,
    Salinitas: perangkat?.Salinitas ?? null,
    Kekeruhan: perangkat?.Kekeruhan ?? null,
  });

  // 🔄 update otomatis setiap 3 detik (simulasi IoT)
  useEffect(() => {
    const id = setInterval(() => {
      setSensor((prev) => ({ ...prev, ...getRandomSensorData() }));
    }, 3000);
    return () => clearInterval(id);
  }, []);

// tentukan status
  const suhuStatus = getMetricStatus('suhu', sensor.Suhu);
  const phStatus = getMetricStatus('ph', sensor.PH);
  const salStatus = getMetricStatus('salinitas', sensor.Salinitas);
  const keruhStatus = getMetricStatus('kekeruhan', sensor.Kekeruhan);

  const gaugeData = [
    { label: 'SUHU',       valueText: `${sensor.Suhu ?? '-' }°C`,  status: suhuStatus },
    { label: 'PH',         valueText: `${sensor.PH ?? '-'}`,       status: phStatus },
    { label: 'SALINITAS',  valueText: `${sensor.Salinitas ?? '-'}`,status: salStatus },
    { label: 'KEKERUHAN',  valueText: `${sensor.Kekeruhan ?? '-'} NTU`, status: keruhStatus },
  ];

  const CARD_W = 100;
  const GAP = 10;

  const endpointData = perangkat?.Endpoint_Data ?? perangkat?.EndpointData ?? '-';
  const endpointFirebase =
    perangkat?.Endpoint_firebase ??
    perangkat?.Endpoint_Firebase ??
    perangkat?.EndpointFirebase ??
    '-';

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* wave atas */}
      <View className="absolute left-0 right-0  mt-32" pointerEvents="none">
        <WaveBackground />
      </View>

      {/* back kiri atas */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        className={`absolute left-4 z-10 flex-row items-center mt-16 ${
          Platform.OS === 'ios' ? 'top-2' : 'top-3'
        }`}
      >
        <Icon name="arrow-back" size={24} color="#111827" />
        <Text className="ml-2 text-[18px] text-slate-900">kembali</Text>
      </TouchableOpacity>

      {/* icon bulat + judul */}
      <View className="items-center mt-36">
        <View className="w-[137px] h-[129px] rounded-full items-center justify-center bg-[#4E71A6]">
          <PeralatanIcons color="#fff" width={61} height={61} />
        </View>
        <Text className="mt-4 text-[36px] font-extrabold text-slate-900">
          {perangkat?.Nama_LokasiPerangkat}
        </Text>
        <Text className="mt-1 text-[14px] text-slate-600">
          {perangkat?.ID_Perangkat ?? '1u2892y98'}
        </Text>
      </View>

      {/* endpoints */}
      <View className="px-6 mt-8">
        <Row label="Endpoint_Data :" value={endpointData} />
        <Row label="Endpoint_firebase :" value={endpointFirebase} />
      </View>

      {/* gauges (scroll kiri–kanan, snap) */}
      <View className="mt-2">
        <FlatList
          data={gaugeData}
          keyExtractor={(it) => it.label}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24 }}
          ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
          snapToInterval={CARD_W + GAP}
          snapToAlignment="start"
          decelerationRate="fast"
          renderItem={({ item }) => (
            <GaugeCard
              valueText={item.valueText}
              status={item.status}
              label={item.label}
            />
          )}
        />
      </View>

      {/* info bawah + tombol */}
      <View className="px-6 mt-8">
        <Row label="Tambak Terhubung :" value={namaTambak} />
        <Row
          label="Latitude/Longitude :"
          value={
            typeof perangkat?.Latitude === 'number' && typeof perangkat?.Longitude === 'number'
              ? `${perangkat.Latitude.toFixed(5)} / ${perangkat.Longitude.toFixed(5)}`
              : '-'
          }
        />
      </View>

      <View className="items-center mt-2">
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {}}
          className="bg-[#67A9F3] px-6 py-3 rounded-xl shadow"
          style={{ shadowOpacity: 0.15, shadowRadius: 6, shadowColor: '#000', elevation: 3 }}
        >
          <Text className="text-white font-extrabold text-[16px]">Cek Tambak</Text>
        </TouchableOpacity>
      </View>

      <View className="h-[120px]" />
    </SafeAreaView>
  );
};

export default PerangkatDetail;
