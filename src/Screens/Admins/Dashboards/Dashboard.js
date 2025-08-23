// src/Screens/Admins/Dashboards/Dashboard.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, Dimensions, Image, StyleSheet, StatusBar,
  Platform, PermissionsAndroid, Alert, ActivityIndicator
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { Tambak, Reciver, Logo } from '../../../Assets/Image/Index';
import lightMapStyle from '../../../Utils/customMapStyle';
import '../../../../global.css';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetToLogin } from '../../../Navigations/navigationService';
import { tambakApi } from '../../../api';

const { height } = Dimensions.get('window');

/** ---------- helpers ---------- **/
const isFiniteNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isValidCoord = (lat, lng) =>
  isFiniteNum(lat) && isFiniteNum(lng) &&
  lat <= 90 && lat >= -90 && lng <= 180 && lng >= -180 &&
  !(Math.abs(lat) < 0.5 && Math.abs(lng) < 0.5); // buang ~0,0 yg sering jadi default

export default function AdminDashboardScreen() {
  const navigation = useNavigation();
  const mapRef = useRef(null);

  // state data
  const [tambaks, setTambaks] = useState([]);
  const [userPos, setUserPos] = useState(null);               // { latitude, longitude }
  const [selectedTambak, setSelectedTambak] = useState(null);

  // state UI
  const [loadingGate, setLoadingGate] = useState(true);       // gate untuk loading sebelum render map
  const [mapReady, setMapReady] = useState(false);            // onMapReady
  const [radiusOn, setRadiusOn] = useState(false);            // toggle radius receiver

  /** ---------- load data ---------- **/
  const loadTambaks = useCallback(async () => {
    const res = await tambakApi.list({ limit: 200 });
    const rows = res?.rows ?? res?.data ?? [];
    // pastikan lat/lng number (bukan string) dan valid
    return rows
      .map(r => ({
        ...r,
        Latitude: r.Latitude != null ? Number(r.Latitude) : null,
        Longitude: r.Longitude != null ? Number(r.Longitude) : null,
      }));
  }, []);

  /** ---------- izin lokasi ---------- **/
  const requestLocationPermission = useCallback(async () => {
    if (Platform.OS === 'ios') {
      const status = await Geolocation.requestAuthorization('whenInUse');
      return status === 'granted' || status === 'authorized';
    }
    try {
      const result = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ]);
      const fine = result[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
      const coarse = result[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION];
      return fine === PermissionsAndroid.RESULTS.GRANTED || coarse === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }, []);

  /** ---------- saat screen fokus: ambil data & lokasi ---------- **/
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      setSelectedTambak(null);
      setLoadingGate(true);   // kunci loading sampai initial region siap

      (async () => {
        try {
          // ambil paralel
          const [rows, canLoc] = await Promise.all([
            loadTambaks().catch((e) => {
              Alert.alert('Gagal memuat tambak', e?.message || 'Unknown error');
              return [];
            }),
            requestLocationPermission(),
          ]);

          if (!alive) return;

          // filter tampilan (hilangkan admin & hanya koordinat valid)
          const filtered = rows.filter(t => {
            if (t?.Role === 'ADMIN' || t?.isAdmin) return false;
            if (typeof t?.Nama === 'string' && /admin/i.test(t.Nama)) return false;
            return isValidCoord(Number(t?.Latitude), Number(t?.Longitude));
          });

          setTambaks(filtered);

          // coba dapatkan posisi user
          if (canLoc) {
            Geolocation.getCurrentPosition(
              (pos) => {
                if (!alive) return;
                const { latitude, longitude } = pos?.coords || {};
                if (isValidCoord(latitude, longitude)) {
                  setUserPos({ latitude, longitude });
                }
                setLoadingGate(false);
              },
              () => {
                // kalau gagal lokasi, tetap lanjut (pakai tambak pertama/fallback)
                setLoadingGate(false);
              },
              { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
            );
          } else {
            // tanpa izin lokasi → tetap lanjut
            setLoadingGate(false);
          }
        } catch {
          setLoadingGate(false);
        }
      })();

      return () => { alive = false; };
    }, [loadTambaks, requestLocationPermission])
  );

  /** ---------- list untuk marker ---------- **/
  const visibleTambaks = useMemo(() => tambaks, [tambaks]);

  /** ---------- titik receiver (mengandung kata "penerima") ---------- **/
  const receiverCoord = useMemo(() => {
    const r = (visibleTambaks || []).find((obj) => {
      const nama = String(obj?.Nama || '');
      const ket  = String(obj?.keterangan || obj?.Keterangan || '');
      return /penerima/i.test(nama) || /penerima/i.test(ket);
    });
    if (!r) return null;
    const lat = Number(r.Latitude), lng = Number(r.Longitude);
    return isValidCoord(lat, lng) ? { latitude: lat, longitude: lng } : null;
  }, [visibleTambaks]);

  /** ---------- initialRegion aman ---------- **/
  const safeInitialRegion = useMemo(() => {
    // prioritas 1: user
    if (isValidCoord(userPos?.latitude, userPos?.longitude)) {
      return { latitude: userPos.latitude, longitude: userPos.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 };
    }
    // prioritas 2: titik tambak pertama yang valid
    const first = visibleTambaks[0];
    if (first && isValidCoord(Number(first.Latitude), Number(first.Longitude))) {
      return { latitude: Number(first.Latitude), longitude: Number(first.Longitude), latitudeDelta: 0.05, longitudeDelta: 0.05 };
    }
    // fallback: Jakarta
    return { latitude: -6.2, longitude: 106.8, latitudeDelta: 0.1, longitudeDelta: 0.1 };
  }, [userPos?.latitude, userPos?.longitude, visibleTambaks]);

  /** ---------- buka map hanya kalau siap ---------- **/
  const readyToShowMap = useMemo(
    () => !loadingGate && (isValidCoord(userPos?.latitude, userPos?.longitude) || visibleTambaks.length > 0),
    [loadingGate, userPos?.latitude, userPos?.longitude, visibleTambaks.length]
  );

  /** ---------- animasi awal setelah mapReady ---------- **/
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    // 1) snap ke initial region biar cepat render
    mapRef.current.animateToRegion(safeInitialRegion, 0);

    // 2) kalau ada >1 titik (user + tambak), fit semuanya
    const coords = [];
    if (isValidCoord(userPos?.latitude, userPos?.longitude)) {
      coords.push({ latitude: userPos.latitude, longitude: userPos.longitude });
    }
    visibleTambaks.forEach(t => {
      const lat = Number(t.Latitude), lng = Number(t.Longitude);
      if (isValidCoord(lat, lng)) coords.push({ latitude: lat, longitude: lng });
    });
    if (coords.length >= 2) {
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(coords, {
          edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
          animated: true,
        });
      }, 80);
    }
  }, [mapReady, safeInitialRegion, userPos?.latitude, userPos?.longitude, visibleTambaks]);

  /** ---------- handlers tombol ---------- **/
  const focusToUser = useCallback(() => {
    if (!mapReady || !userPos) return;
    mapRef.current?.animateToRegion(
      { ...userPos, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      400
    );
  }, [mapReady, userPos]);

  const toggleRadius = useCallback(() => setRadiusOn(s => !s), []);

  const focusReceiver = useCallback(() => {
    if (!mapReady || !receiverCoord) return;
    mapRef.current?.animateToRegion(
      { ...receiverCoord, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      400
    );
  }, [mapReady, receiverCoord]);

  const handleLogout = useCallback(async () => {
    await AsyncStorage.multiRemove(['auth_token', 'auth_user']);
    resetToLogin();
  }, []);

  return (
    <View className="flex-1">
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* Loading gate: jangan render MapView sebelum siap */}
      {!readyToShowMap ? (
        <View style={[StyleSheet.absoluteFill, styles.loadingWrap]}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Sedang mengambil data…</Text>
        </View>
      ) : (
        <MapView
          ref={mapRef}
          provider="google"
          style={StyleSheet.absoluteFill}
          userInterfaceStyle="light"
          showsUserLocation
          customMapStyle={lightMapStyle}
          initialRegion={safeInitialRegion}
          onMapReady={() => setMapReady(true)}
        >
          {/* Marker tambak */}
          {visibleTambaks.map((t) => (
            <Marker
              key={t.ID_Tambak}
              coordinate={{ latitude: Number(t.Latitude), longitude: Number(t.Longitude) }}
              title={t.Nama}
              image={
    /penerima/i.test(t.Nama || '') || /penerima/i.test(t.keterangan || '')
      ? Reciver
      : Tambak
  }
              description={t.keterangan || t.Keterangan || ''}
              onPress={() => setSelectedTambak(t)}
            />
          ))}

          {/* Radius untuk receiver (opsional) */}
          {radiusOn && receiverCoord && (
            <Circle
              center={receiverCoord}
              radius={500}
              fillColor="rgba(59,130,246,0.20)"
              strokeColor="rgba(59,130,246,0.60)"
              strokeWidth={2}
            />
          )}
        </MapView>
      )}

      {/* Header */}
      <View className="absolute top-10 left-5 bg-blue-500 rounded-xl px-4 py-2 flex-row items-center space-x-2 z-10 w-[90%] h-20">
        <View className="bg-white rounded-full p-1">
          <Image source={Logo} className="w-10 h-10" resizeMode="contain" />
        </View>
        <Text className="text-white font-bold text-xl pl-2">Simonika{'\n'}Welcome Admin !!</Text>
        <TouchableOpacity
          onPress={handleLogout}
          className="ml-auto bg-white/15 border border-white/30 px-3 py-2 rounded-lg flex-row items-center"
        >
          <Icon name="log-out" size={16} color="#fff" />
          <Text className="text-white font-semibold ml-2">Keluar</Text>
        </TouchableOpacity>
      </View>

      {/* 3 Tombol aksi kanan */}
      <TouchableOpacity
        onPress={focusToUser}
        className="absolute z-10 right-5 w-[50px] h-[50px] rounded-xl justify-center items-center bg-blue-600"
        style={{ top: height / 2 - 70 }}
        disabled={!userPos || !mapReady}
      >
        <Icon name="crosshair" size={18} color="#fff" />
        <Text className="text-white text-[10px] mt-1">Fokus</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={toggleRadius}
        className="absolute z-10 right-5 w-[50px] h-[50px] rounded-xl justify-center items-center"
        style={{ top: height / 2 - 10, backgroundColor: radiusOn ? '#16a34a' : '#b91c1c' }}
        disabled={!mapReady}
      >
        <Icon name="radio" size={18} color="#fff" />
        <Text className="text-white text-[10px] mt-1">{radiusOn ? 'Radius' : 'No Rad.'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={focusReceiver}
        disabled={!receiverCoord || !mapReady}
        className="absolute z-10 right-5 w-[50px] h-[50px] rounded-xl justify-center items-center"
        style={{ top: height / 2 + 50, backgroundColor: receiverCoord ? '#0ea5e9' : '#94a3b8' }}
      >
        <Icon name="map-pin" size={18} color="#fff" />
        <Text className="text-white text-[10px] mt-1">Receiver</Text>
      </TouchableOpacity>

      {/* Detail Card */}
 {selectedTambak && (
  <View className="absolute left-0 right-0 bottom-5 px-4 mb-32">
    <View className="bg-white rounded-2xl p-4 shadow-lg border border-slate-100">
      <View className="flex-row items-start">
        {/* Kiri: judul + info */}
        <View className="flex-1 pr-3">
          <Text className="text-[20px] font-extrabold text-sky-500" numberOfLines={1}>
            {selectedTambak.Nama || 'Tambak'}
          </Text>

          {/* Lokasi */}
          <View className="flex-row items-center mt-1">
            <Text className="text-[12px] text-sky-500 font-semibold">Lokasi : </Text>
            <Text className="text-[12px] text-slate-600">
              {isFiniteNum(Number(selectedTambak?.Latitude))
                ? Number(selectedTambak.Latitude).toFixed(5)
                : '-'}
              {', '}
              {isFiniteNum(Number(selectedTambak?.Longitude))
                ? Number(selectedTambak.Longitude).toFixed(5)
                : '-'}
            </Text>
          </View>

          {/* Substrat -> tampilkan hanya kalau BUKAN penerima */}
          {!/penerima/i.test(String(selectedTambak?.Keterangan || selectedTambak?.keterangan || '')) && (
            <View className="flex-row items-center mt-1">
              <Text className="text-[12px] text-sky-500 font-semibold">Substrat : </Text>
              <Text className="text-[12px] text-slate-600">
                {selectedTambak?.Substrat || '-'}
              </Text>
            </View>
          )}
        </View>

        {/* Kanan: status perangkat -> tampilkan hanya kalau BUKAN penerima */}
        {!/penerima/i.test(String(selectedTambak?.Keterangan || selectedTambak?.keterangan || '')) && (
          <View className="items-center">
            <View
              className={`w-14 h-14 rounded-full ${
                selectedTambak?.ID_Perangkat ? 'bg-emerald-300' : 'bg-slate-300'
              }`}
            />
            <Text
              className={`text-[11px] font-semibold mt-1 ${
                selectedTambak?.ID_Perangkat ? 'text-emerald-600' : 'text-slate-500'
              }`}
            >
              {selectedTambak?.ID_Perangkat ? 'Perangkat Terhubung' : 'Belum Terhubung'}
            </Text>
          </View>
        )}
      </View>

      {/* Tombol cek detail */}
      <TouchableOpacity
        onPress={() =>
          navigation.navigate('Tambak', {
            screen: 'TambakDetail',
            params: { tambak: selectedTambak },
          })
        }
        className="mt-4 self-start px-5 py-2 rounded-xl bg-sky-400 active:opacity-90"
      >
        <Text className="text-white font-semibold text-sm">Cek Detail</Text>
      </TouchableOpacity>
    </View>
  </View>
)}


    </View>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 10,
    fontWeight: '600',
    color: '#475569',
  },
});
