import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Platform, Alert, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { FishIcons } from '../../../Assets/Svg';
import WaveBackground from '../../../Utils/WaveBackground';
import { getPerangkatById, getIotLast } from '../../../api';

const Row = ({ label, value }) => (
  <View className="mb-4">
    <Text className="text-[16px] text-slate-900">
      {label} <Text className="font-bold text-slate-900">{value ?? '-'}</Text>
    </Text>
  </View>
);

function formatLastSeen(ts) {
  if (!ts) return '-';
  const d = typeof ts === 'number' ? new Date(ts) : new Date(ts);
  if (isNaN(d.getTime())) return '-';
  const diffMs = Date.now() - d.getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 1) return 'baru saja';
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}


const TambakDetail = ({ route, navigation }) => {
  const tambak = route?.params?.tambak ?? {};

  const [perangkat, setPerangkat] = useState(null); // detail perangkat
  const [status, setStatus] = useState('-');        // Online / Offline / -
  const [lastSeen, setLastSeen] = useState(null);   // timestamp terakhir
  const [checking, setChecking] = useState(false);  // loading cek status

  const goPerangkatDetail = () => {
    const perangkatObj = {
      ID_Perangkat: tambak?.ID_Perangkat ?? null,
      Nama_LokasiPerangkat: perangkat?.Nama_LokasiPerangkat ?? tambak?.PerangkatTerhubung ?? null,
      Latitude: tambak?.Latitude ?? null,
      Longitude: tambak?.Longitude ?? null,
    };
    if (!perangkatObj.ID_Perangkat) {
      Alert.alert('Perangkat tidak tersedia');
      return;
    }
    navigation.getParent()?.navigate('Perangkat', {
      screen: 'PerangkatDetail',
      params: { perangkat: perangkatObj },
    });
  };

  // load perangkat + status awal
  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!tambak?.ID_Perangkat) return;
      try {
        const p = await getPerangkatById(tambak.ID_Perangkat); // { ID_PerangkatIot, Nama_LokasiPerangkat, ...}
        if (!mounted) return;
        setPerangkat(p);
        await refreshStatus(p?.ID_PerangkatIot);
      } catch (e) {
        if (!mounted) return;
        setPerangkat(null);
        setStatus('Offline');
      }
    }
    load();
    return () => { mounted = false; };
  }, [tambak?.ID_Perangkat]);

// atur ambang online di menit
const ONLINE_WINDOW_MIN = 10; // coba 10 dulu

function parseTimestamp(raw) {
  if (!raw) return null;
  // string ISO?
  if (typeof raw === 'string') {
    // contoh: "2025-08-23T06:40:12.345Z" atau "2025-08-23 06:40:12"
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d.getTime();
  }
  // number? bisa detik atau milidetik
  if (typeof raw === 'number') {
    // heuristik: kalau < 10^12, anggap detik → konversi ke ms
    return raw < 1e12 ? raw * 1000 : raw;
  }
  return null;
}

async function refreshStatus(iotId) {
  if (!iotId) {
    setStatus('Offline');
    setLastSeen(null);
    return;
  }
  setChecking(true);
  try {
    const last = await getIotLast(iotId);
    // DEBUG: lihat bentuk respon sebenarnya
    console.log('getIotLast raw =', last);

    // coba beberapa nama field umum
    const rawTs =
      last?.time ??
      last?.timestamp ??
      last?.ts ??
      last?.updatedAt ??
      last?.updated_at ??
      null;

    const ms = parseTimestamp(rawTs);
    setLastSeen(ms ? new Date(ms).toISOString() : null);

    if (!ms) {
      setStatus('Offline');
    } else {
      const diffMs = Date.now() - ms;
      const online = diffMs <= ONLINE_WINDOW_MIN * 60 * 1000;
      setStatus(online ? 'Online' : 'Offline');
    }
  } catch (e) {
    console.log('getIotLast error =', e);
    setStatus('Offline');
    setLastSeen(null);
  } finally {
    setChecking(false);
  }
}

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* wave atas */}
      <View className="absolute left-0 right-0 mt-32" pointerEvents="none">
        <WaveBackground />
      </View>

      {/* back */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        className={`absolute left-4 z-10 flex-row items-center ${Platform.OS === 'ios' ? 'top-2' : 'top-20'}`}
      >
        <Icon name="arrow-back" size={24} color="#111827" />
        <Text className="ml-2 text-[18px] text-slate-900">kembali</Text>
      </TouchableOpacity>

      {/* icon + judul */}
      <View className="items-center mt-36">
        <View className="w-[133px] h-[131px] rounded-full items-center justify-center bg-[#4E71A6]">
          <FishIcons color="#fff" width={61} height={61} />
        </View>

        <Text className="mt-4 text-[36px] font-extrabold text-slate-900">
          {tambak?.Nama ?? 'Tambak'}
        </Text>
        <Text className="mt-1 text-[14px] text-slate-600">
          {tambak?.ID_Perangkat ?? '-'}
        </Text>
      </View>

      {/* detail */}
      <View className="px-6 mt-8">
        <Row label="Substrat :" value={tambak?.Substrat ?? '-'} />
        <Row
          label="Latitude :"
          value={typeof tambak?.Latitude === 'number' ? tambak.Latitude.toFixed(5) : '-'}
        />
        <Row
          label="Longitude :"
          value={typeof tambak?.Longitude === 'number' ? tambak.Longitude.toFixed(5) : '-'}
        />

        <View className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
          <Text className="mb-3 text-[16px] font-extrabold text-slate-900">Perangkat</Text>
          <Row
            label="Perangkat Terhubung :"
            value={
              perangkat?.Nama_LokasiPerangkat
                || tambak?.PerangkatTerhubung
                || perangkat?.ID_PerangkatIot
                || '-'
            }
          />
          <Row label="Status Perangkat :" value={status} />
          <Row label="Terakhir Aktif :" value={formatLastSeen(lastSeen)} />

          <View className="mt-2 flex-row">
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => refreshStatus(perangkat?.ID_PerangkatIot)}
              className="mr-2 flex-row items-center rounded-xl bg-[#67A9F3] px-4 py-3"
              style={{ shadowOpacity: 0.15, shadowRadius: 6, shadowColor: '#000', elevation: 3 }}
            >
              {checking ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Icon name="refresh" size={18} color="#fff" />
              )}
              <Text className="ml-2 text-[14px] font-extrabold text-white">Cek Perangkat</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={goPerangkatDetail}
              className="flex-row items-center rounded-xl bg-emerald-600 px-4 py-3"
              style={{ shadowOpacity: 0.15, shadowRadius: 6, shadowColor: '#000', elevation: 3 }}
            >
              <Icon name="eye" size={18} color="#fff" />
              <Text className="ml-2 text-[14px] font-extrabold text-white">Detail Perangkat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View className="h-[120px]" />
    </SafeAreaView>
  );
};

export default TambakDetail;
