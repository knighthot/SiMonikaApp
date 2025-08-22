// src/Screens/Admins/ManajementPerangkat/PerangkatDetail.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, SafeAreaView, Platform, FlatList, Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { PeralatanIcons } from '../../../Assets/Svg';
import WaveBackground from '../../../Utils/WaveBackground';
import Svg, { Circle } from 'react-native-svg';
import { getPerangkatById, getIotLast, startIotSim } from '../../../api'; // ⬅️ pakai helper

const Row = ({ label, value }) => (
  <View className="mb-4">
    <Text className="text-[16px] text-slate-900">
      {label} <Text className="font-bold">{value ?? '-'}</Text>
    </Text>
  </View>
);


// ------------ rules status ------------
const getMetricStatus = (metric, rawVal) => {
  if (rawVal === null || rawVal === undefined || Number.isNaN(Number(rawVal))) return 'mati';
  const v = Number(rawVal);
  switch (metric) {
    case 'suhu':
      if (v >= 28 && v <= 32) return 'normal';
      if ((v >= 26 && v < 28) || (v > 32 && v <= 34)) return 'warning';
      return 'anomali';
    case 'ph':
      if (v >= 7.5 && v <= 8.5) return 'normal';
      if ((v >= 7 && v < 7.5) || (v > 8.5 && v <= 9)) return 'warning';
      return 'anomali';
    case 'salinitas':
      if (v >= 15 && v <= 25) return 'normal';
      if ((v >= 10 && v < 15) || (v > 25 && v <= 30)) return 'warning';
      return 'anomali';
    case 'kekeruhan':
      if (v <= 100) return 'normal';
      if (v > 100 && v <= 200) return 'warning';
      return 'anomali';
    default:
      return 'normal';
  }
};

const statusStyle = (status) => {
  switch (status) {
    case 'normal':  return { color: '#22c55e', progress: 1.0 };
    case 'warning': return { color: '#f59e0b', progress: 0.5 };
    case 'anomali': return { color: '#ef4444', progress: 0.25 };
    case 'mati':
    default:        return { color: '#9ca3af', progress: 0.0 };
  }
};

// ------------ Gauge ------------
const RingGauge = ({ valueText, progress = 0.35, color = '#22c55e' }) => {
  const SIZE = 120, STROKE = 10;
  const R = (SIZE - STROKE * 2) / 2;
  const C = 2 * Math.PI * R;
  const clamped = Math.max(0, Math.min(1, progress));
  const offset = C * (1 - clamped);

  return (
    <View className="items-center justify-center">
      <View className="rounded-full items-center justify-center relative" style={{ width: SIZE, height: SIZE }}>
        <Svg width={SIZE} height={SIZE}>
          <Circle cx={SIZE/2} cy={SIZE/2} r={R} stroke="#fff" strokeWidth={STROKE} fill="none" />
          <Circle
            cx={SIZE/2} cy={SIZE/2} r={R}
            stroke={color} strokeWidth={STROKE} strokeLinecap="round" fill="none"
            strokeDasharray={C} strokeDashoffset={offset}
            transform={`rotate(-110 ${SIZE/2} ${SIZE/2})`}
          />
        </Svg>
        <View className="absolute inset-0 items-center justify-center">
          <Text className="text-[20px] font-extrabold" style={{ color }}>{valueText}</Text>
        </View>
      </View>
    </View>
  );
};

const GaugeCard = ({ valueText='-', status='normal', label='LABEL' }) => {
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
  // dari list: kamu sudah kirim { perangkat: item }, yang penting ada ID_Perangkat
  const perangkatParam = route?.params?.perangkat ?? {};
  const perangkatId = perangkatParam?.ID_Perangkat;

  const [perangkat, setPerangkat] = useState(perangkatParam || {});
  const [iotId, setIotId] = useState(perangkatParam?.ID_PerangkatIot || null);
  const [loading, setLoading] = useState(true);
  const [sensor, setSensor] = useState({ Suhu: null, pH: null, Salinitas: null, Kekeruhan: null });
  const pollRef = useRef(null);

  const goTambakDetail = () => {
  // Ambil data tambak terhubung dari response backend
  // (bisa datang via flatten: TambakTerhubung/Latitude/Longitude, atau nested TB_Tambaks[0])
  const t0 = Array.isArray(perangkat?.TB_Tambaks) && perangkat.TB_Tambaks.length
    ? perangkat.TB_Tambaks[0]
    : null;

  const tambakObj = t0 ? {
    ID_Tambak: t0.ID_Tambak,
    Nama: t0.Nama,
    Latitude: t0.Latitude,
    Longitude: t0.Longitude,
    ID_Perangkat: perangkat?.ID_Perangkat,
    PerangkatTerhubung: perangkat?.Nama_LokasiPerangkat,
    StatusPerangkat: isActive ? 'Aktif' : 'Non Aktif',
  } : {
    // fallback kalau backend sudah flatten
    ID_Tambak: perangkat?.TambakTerhubungId ?? null,
    Nama: perangkat?.TambakTerhubung ?? null,
    Latitude: perangkat?.Latitude ?? null,
    Longitude: perangkat?.Longitude ?? null,
    ID_Perangkat: perangkat?.ID_Perangkat ?? null,
    PerangkatTerhubung: perangkat?.Nama_LokasiPerangkat ?? null,
    StatusPerangkat: isActive ? 'Aktif' : 'Non Aktif',
  };

  if (!tambakObj?.Nama && !tambakObj?.ID_Tambak) {
    Alert.alert('Tidak ada tambak terhubung');
    return;
  }

  // Pindah ke tab "Tambak" dan langsung buka screen "TambakDetail"
  navigation.getParent()?.navigate('Tambak', {
    screen: 'TambakDetail',
    params: { tambak: tambakObj },
  });
};

  // hit DB perangkat -> dpt ID_PerangkatIot + LastSeenAt (untuk status aktif)
  useEffect(() => {
    let on = true;
    (async () => {
      try {
        if (!perangkatId) return;
        const d = await getPerangkatById(perangkatId);
        if (!on) return;
        setPerangkat(d);
        setIotId(d?.ID_PerangkatIot || null);
      } catch (e) {
        Alert.alert('Gagal muat perangkat', e.message);
      } finally {
        setLoading(false);
      }
    })();
    return () => { on = false; };
  }, [perangkatId]);

  // polling IoT last tiap 2s
  useEffect(() => {
    if (!iotId) return;
    let killed = false;
    const tick = async () => {
      try {
        const res = await getIotLast(iotId); // { Parameter:{Suhu,pH,Salinitas,Kekeruhan}, ts }
        if (killed) return;
        const p = res?.Parameter || {};
        setSensor({
          Suhu: p?.Suhu ?? null,
          pH: p?.pH ?? null,
          Salinitas: p?.Salinitas ?? null,
          Kekeruhan: p?.Kekeruhan ?? null,
        });
      } catch (e) {
        // simulator belum jalan → biarkan nilai null (mati)
      }
    };
    tick();
    pollRef.current = setInterval(tick, 2000);
    return () => { killed = true; clearInterval(pollRef.current); };
  }, [iotId]);

  // status gauge
  const suhuStatus = getMetricStatus('suhu', sensor.Suhu);
  const phStatus = getMetricStatus('ph', sensor.pH ?? sensor.PH); // jaga-jaga
  const salStatus = getMetricStatus('salinitas', sensor.Salinitas);
  const keruhStatus = getMetricStatus('kekeruhan', sensor.Kekeruhan);

  const gaugeData = [
    { label: 'SUHU',       valueText: sensor.Suhu != null ? `${sensor.Suhu.toFixed(1)}°C` : '-',   status: suhuStatus },
    { label: 'PH',         valueText: sensor.pH   != null ? `${sensor.pH.toFixed(2)}` : '-',       status: phStatus },
    { label: 'SALINITAS',  valueText: sensor.Salinitas != null ? `${sensor.Salinitas.toFixed(1)}` : '-', status: salStatus },
    { label: 'KEKERUHAN',  valueText: sensor.Kekeruhan != null ? `${sensor.Kekeruhan.toFixed(0)} NTU` : '-', status: keruhStatus },
  ];

  // status aktif dihitung dari LastSeenAt
  const isActive = useMemo(() => {
    const last = perangkat?.LastSeenAt ? new Date(perangkat.LastSeenAt).getTime() : 0;
    return Date.now() - last <= 10_000; // <=10s dianggap aktif
  }, [perangkat?.LastSeenAt]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="absolute left-0 right-0 mt-32" pointerEvents="none">
        <WaveBackground />
      </View>

      {/* back */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        className={`absolute left-4 z-10 flex-row items-center mt-16 ${Platform.OS === 'ios' ? 'top-2' : 'top-3'}`}
      >
        <Icon name="arrow-back" size={24} color="#111827" />
        <Text className="ml-2 text-[18px] text-slate-900">kembali</Text>
      </TouchableOpacity>

      {/* header icon & judul */}
      <View className="items-center mt-36">
        <View className="w-[137px] h-[129px] rounded-full items-center justify-center bg-[#4E71A6]">
          <PeralatanIcons color="#fff" width={61} height={61} />
        </View>
        <Text className="mt-4 text-[28px] font-extrabold text-slate-900">
          {perangkat?.Nama_LokasiPerangkat ?? '-'}
        </Text>
        <Text className="mt-1 text-[14px] text-slate-600">
          {perangkat?.ID_Perangkat || '-'}
        </Text>

        {/* pill status aktif */}
        <View className="mt-2 px-3 py-1 rounded-full"
          style={{ backgroundColor: isActive ? '#DCFCE7' : '#F5F5F5', borderWidth: 1, borderColor: isActive ? '#22C55E' : '#E5E7EB' }}>
          <Text style={{ color: isActive ? '#16A34A' : '#6B7280', fontWeight: '700' }}>
            {isActive ? 'Aktif' : 'Non Aktif'}
          </Text>
        </View>
      </View>

      {/* endpoint / iot id */}
      <View className="px-6 mt-6">
        <Row label="ID Perangkat IoT :" value={iotId || '-'} />
      </View>

      {/* gauges */}
      <View className="mt-2">
        <FlatList
          data={gaugeData}
          keyExtractor={(it) => it.label}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24 }}
          ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
          renderItem={({ item }) => (
            <GaugeCard valueText={item.valueText} status={item.status} label={item.label} />
          )}
        />
      </View>

      {/* info bawah + tombol */}
      <View className="px-6 mt-8">
        <Row
          label="Tambak Terhubung :"
          value={
            perangkat?.TambakTerhubung
              ? perangkat.TambakTerhubung
              : 'Tidak terhubung'
          }
        />

        <Row
          label="Latitude/Longitude :"
          value={
            (typeof perangkat?.Latitude === 'number' && typeof perangkat?.Longitude === 'number')
              ? `${perangkat.Latitude.toFixed(5)} / ${perangkat.Longitude.toFixed(5)}`
              : 'Tidak tersedia'
          }
        />
      </View>

      <View className="items-center mt-2">
        <TouchableOpacity
          activeOpacity={0.9}
         onPress={goTambakDetail}
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
