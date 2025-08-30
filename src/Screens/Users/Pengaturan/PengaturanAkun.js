// PengaturanAkun.js
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, SafeAreaView, Platform, Modal, TextInput,
  Alert, Linking, ScrollView, ActivityIndicator, RefreshControl, Animated, Easing
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import MapView, { Marker } from 'react-native-maps';
import { FishIcons, SupportIcons } from '../../../Assets/Svg';
import WaveBackground from '../../../Utils/WaveBackground';
import {
  getMe,
  tambakApi,
  userApi,
  listPerangkatByTambak,
  getIotLast,
  createPerangkat,
} from '../../../api';

/* -------------------- Helper kecil -------------------- */
const Row = ({ label, value, right }) => (
  <View className="mb-5 flex-row items-center justify-between">
    <Text className="text-[14px] text-slate-900">
      {label}{' '}
      <Text className="font-extrabold text-slate-900">{value ?? '-'}</Text>
    </Text>
    {right ? <View>{right}</View> : null}
  </View>
);

/* -------------------- Dropdown mini (seperti dashboard) -------------------- */
const MiniDropdown = ({ label, value, items = [], onSelect }) => {
  const [open, setOpen] = useState(false);
  return (
    <View className="mb-3">
      <Text className="text-[13px] font-bold text-slate-700 mb-2">{label}</Text>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.9}
        className="border border-slate-300 rounded-xl px-3 py-3 bg-white"
      >
        <Text className="text-[15px] font-semibold text-slate-900">
          {value || 'Pilih…'}
        </Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setOpen(false)}
          className="flex-1 bg-black/40 items-center justify-center px-6"
        >
          <View className="w-full rounded-2xl bg-white overflow-hidden">
            <View className="px-4 py-3 border-b border-slate-200">
              <Text className="text-lg font-extrabold text-slate-900">Pilih {label}</Text>
            </View>
            <ScrollView style={{ maxHeight: 360 }}>
              {items.map((it) => (
                <TouchableOpacity
                  key={it}
                  onPress={() => {
                    onSelect?.(it);
                    setOpen(false);
                  }}
                  className="px-4 py-4 border-b border-slate-100"
                >
                  <Text className="text-[15px] font-semibold text-slate-900">{it}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View className="px-4 py-3">
              <TouchableOpacity
                onPress={() => setOpen(false)}
                className="self-end bg-slate-200 px-4 py-2 rounded-xl"
              >
                <Text className="font-semibold">Tutup</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

/* -------------------- Modal Map Picker (pin draggable, delta dekat) -------------------- */
const MapPicker = ({ visible, onClose, lat, lng, onPick }) => {
  const region = useMemo(() => {
    const latitude = Number.isFinite(lat) ? lat : -6.2;
    const longitude = Number.isFinite(lng) ? lng : 106.816666;
    return {
      latitude,
      longitude,
      latitudeDelta: 0.004,
      longitudeDelta: 0.004,
    };
  }, [lat, lng]);

  const [pos, setPos] = useState({ latitude: region.latitude, longitude: region.longitude });

  useEffect(() => {
    setPos({ latitude: region.latitude, longitude: region.longitude });
  }, [region.latitude, region.longitude]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/40">
        <View className="mt-14 mx-4 rounded-2xl overflow-hidden bg-white flex-1">
          <View className="px-4 py-3 border-b border-slate-200 flex-row items-center justify-between">
            <Text className="text-lg font-extrabold text-slate-900">Pilih Lokasi Tambak</Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <Icon name="close" size={22} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <MapView
            style={{ flex: 1 }}
            initialRegion={region}
            onPress={(e) => setPos(e.nativeEvent.coordinate)}
          >
            <Marker
              draggable
              coordinate={pos}
              onDragEnd={(e) => setPos(e.nativeEvent.coordinate)}
              title="Lokasi Tambak"
              description="Geser pin untuk set posisi"
            />
          </MapView>

          <View className="p-4 border-t border-slate-200">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[13px] font-bold text-slate-700">
                Lat: <Text className="font-extrabold">{pos.latitude.toFixed(6)}</Text>
                {'   '}Lng:{' '}
                <Text className="font-extrabold">{pos.longitude.toFixed(6)}</Text>
              </Text>
              <TouchableOpacity
                onPress={() => Linking.openURL(
                  `https://www.google.com/maps/search/?api=1&query=${pos.latitude},${pos.longitude}`
                )}
                className="px-3 py-2 rounded-xl bg-emerald-100"
              >
                <Text className="font-extrabold text-emerald-800">Buka Maps</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row justify-end">
              <TouchableOpacity onPress={onClose} className="px-4 py-2 rounded-xl mr-2 bg-slate-200">
                <Text className="font-semibold">Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  onPick?.(pos.latitude, pos.longitude);
                  onClose?.();
                }}
                className="px-4 py-2 rounded-xl bg-[#67A9F3]"
              >
                <Text className="text-white font-extrabold">Pakai Lokasi Ini</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

/* -------------------- Modal Sambungkan Perangkat -------------------- */
const ConnectDeviceModal = ({ visible, onClose, onSubmit, loading }) => {
  const [iotId, setIotId] = useState('');
  const [namaLokasi, setNamaLokasi] = useState('');

  useEffect(() => {
    if (!visible) {
      setIotId('');
      setNamaLokasi('');
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/40 items-center justify-center px-6">
        <View className="w-full rounded-2xl bg-white p-4">
          <Text className="text-lg font-extrabold text-slate-900 mb-1">Sambungkan Perangkat</Text>
          <Text className="text-slate-600 mb-3">Masukkan ID perangkat IoT dan nama lokasi (opsional).</Text>

          <View className="mb-3">
            <Text className="text-[13px] font-bold text-slate-700 mb-2">ID Perangkat IoT</Text>
            <TextInput
              value={iotId}
              onChangeText={setIotId}
              placeholder="mis. A1B2C3D4..."
              autoCapitalize="none"
              className="border border-slate-300 rounded-xl px-3 py-3 bg-white"
            />
          </View>

          <View className="mb-2">
            <Text className="text-[13px] font-bold text-slate-700 mb-2">Nama Lokasi (opsional)</Text>
            <TextInput
              value={namaLokasi}
              onChangeText={setNamaLokasi}
              placeholder="Kolam A / Pintu Barat"
              className="border border-slate-300 rounded-xl px-3 py-3 bg-white"
            />
          </View>

          <View className="flex-row justify-end mt-3">
            <TouchableOpacity onPress={onClose} className="px-4 py-2 rounded-xl mr-2 bg-slate-200">
              <Text className="font-semibold">Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={loading}
              onPress={() => onSubmit?.(iotId.trim(), namaLokasi.trim())}
              className="px-4 py-2 rounded-xl bg-[#67A9F3]"
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-extrabold">Sambungkan</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

/* -------------------- Modal Pilih Jenis Edit -------------------- */
const EditChoiceModal = ({ visible, onClose, onPick }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View className="flex-1 bg-black/40 items-center justify-center px-6">
      <View className="w-full rounded-2xl bg-white p-4">
        <Text className="text-lg font-extrabold text-slate-900 mb-1">Pilih yang ingin diubah</Text>
        <Text className="text-slate-600">Silakan pilih jenis pengaturan.</Text>

        <View className="mt-4">
          <TouchableOpacity
            onPress={() => onPick?.('akun')}
            className="flex-row items-center px-4 py-3 rounded-2xl bg-slate-100 mb-3"
          >
            <Icon name="person-outline" size={22} color="#0f172a" />
            <Text className="ml-3 text-[16px] font-extrabold text-slate-900">Edit Akun</Text>
            <Text className="ml-auto text-[12px] text-slate-500">Nama user & password</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onPick?.('tambak')}
            className="flex-row items-center px-4 py-3 rounded-2xl bg-slate-100"
          >
            <Icon name="home-outline" size={22} color="#0f172a" />
            <Text className="ml-3 text-[16px] font-extrabold text-slate-900">Edit Tambak</Text>
            <Text className="ml-auto text-[12px] text-slate-500">Nama, substrat, lokasi</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-end mt-4">
          <TouchableOpacity onPress={onClose} className="px-4 py-2 rounded-xl bg-slate-200">
            <Text className="font-semibold">Tutup</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

/* -------------------- Skeleton helpers -------------------- */
const Skeleton = ({ style, radius = 12 }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  return (
    <Animated.View
      style={[{ backgroundColor: '#e5e7eb', borderRadius: radius, opacity }, style]}
    />
  );
};

const SkeletonHeaderCard = () => (
  <View className="items-center mt-36">
    <View className="w-[133px] h-[131px] rounded-full overflow-hidden">
      <Skeleton style={{ width: 133, height: 131, borderRadius: 999 }} />
    </View>
    <Skeleton style={{ width: 180, height: 24, marginTop: 16, borderRadius: 8 }} />
    <Skeleton style={{ width: 140, height: 14, marginTop: 8, borderRadius: 8 }} />
  </View>
);

const SkeletonInfoCard = () => (
  <View className="px-6 mt-8">
    {/* card container look */}
    <View className="bg-white rounded-2xl p-4"
      style={{
        shadowOpacity: 0.1, shadowRadius: 8, shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 }, elevation: 3
      }}>
      {/* 5 baris skeleton */}
      {[0, 1, 2, 3, 4].map(i => (
        <View key={i} className="flex-row items-center justify-between mb-4">
          <Skeleton style={{ width: 140, height: 14, borderRadius: 6 }} />
          <Skeleton style={{ width: 120, height: 16, borderRadius: 6 }} />
        </View>
      ))}
    </View>
  </View>
);


/* -------------------- Screen -------------------- */
const PengaturanAkun = ({ route, navigation }) => {

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // state awal dari param atau getMe()
  const [me, setMe] = useState(null);
  const [tambak, setTambak] = useState(route?.params?.tambak ?? null);

  // modal
  const [openChoice, setOpenChoice] = useState(false);
  const [openUserModal, setOpenUserModal] = useState(false);
  const [openTambakModal, setOpenTambakModal] = useState(false);
  const [openMap, setOpenMap] = useState(false);
  const [openConnect, setOpenConnect] = useState(false);

  // form fields (akun)
  const [namaUser, setNamaUser] = useState('');
  const [password, setPassword] = useState('');

  // form fields (tambak)
  const [namaTambak, setNamaTambak] = useState('');
  const [substrat, setSubstrat] = useState('');
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);

  // perangkat
  const [deviceId, setDeviceId] = useState(null);
  const [deviceStatus, setDeviceStatus] = useState('-');
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const substratOps = ['Tanah', 'Terpal', 'Beton', 'Campuran', 'Lainnya'];

  // init load
  const loadAll = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);

      const meSrv = await getMe().catch(() => null);
      if (meSrv) setMe(meSrv);

      const tb =
        route?.params?.tambak ||
        meSrv?.TB_Tambak ||
        {
          ID_Tambak: meSrv?.ID_Tambak,
          Nama: meSrv?.TB_Tambak?.Nama || 'Tambak',
          Substrat: meSrv?.TB_Tambak?.Substrat || 'Tanah',
          Latitude: meSrv?.TB_Tambak?.Latitude,
          Longitude: meSrv?.TB_Tambak?.Longitude,
          ID_PerangkatIot: meSrv?.TB_Tambak?.ID_PerangkatIot,
          PerangkatTerhubung: meSrv?.TB_Tambak?.ID_PerangkatIot,
          StatusPerangkat: '-',
        };
      setTambak(tb);

      setNamaTambak(tb?.Nama || '');
      setSubstrat(tb?.Substrat || '');
      setLat(Number.isFinite(tb?.Latitude) ? tb.Latitude : null);
      setLng(Number.isFinite(tb?.Longitude) ? tb.Longitude : null);
      setNamaUser(meSrv?.Nama_tambak || meSrv?.username || meSrv?.Nama || meSrv?.name || '');

      // perangkat
      const idTambak = tb?.ID_Tambak || meSrv?.ID_Tambak;
      if (idTambak) {
        try {
          const list = await listPerangkatByTambak(idTambak, { page: 1, limit: 10 });
          const rows = list?.rows || list?.data || list || [];
          const aktif = rows.find(r => r.Status === 'Aktif') || rows[0];
          const idIot = tb?.ID_PerangkatIot || tb?.PerangkatTerhubung || aktif?.ID_PerangkatIot || null;
          setDeviceId(idIot);
          if (idIot) setDeviceStatus('—');
        } catch { }
      }
    } finally {
      if (isRefresh) setRefreshing(false); else setLoading(false);
    }
  }, [route?.params?.tambak]);

  useEffect(() => { loadAll(false); }, [loadAll]);

  const onRefresh = useCallback(() => {
    loadAll(true).then(() => {
      if (deviceId) checkStatusNow();   // opsional: cek status ulang setelah refresh
    });
  }, [loadAll, deviceId, checkStatusNow]);


  const onBack = () => navigation.goBack?.();

  /* ====== Handlers ====== */
  const onPengaturanAkun = () => setOpenChoice(true);

  const onPickEdit = (type) => {
    setOpenChoice(false);
    if (type === 'akun') setOpenUserModal(true);
    if (type === 'tambak') setOpenTambakModal(true);
  };

  const onCekPerangkat = () => {
    navigation.navigate?.('DashboardUser', { screen: 'MonitoringIot' });
  };

  const onOpenMapsExt = () => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      Alert.alert('Koordinat belum lengkap', 'Silakan set lat/long terlebih dahulu.');
      return;
    }
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
  };

  const onSaveUser = async () => {
    try {
      const body = {};
      if (namaUser?.trim()) body.Nama_tambak = namaUser.trim();
      if (password?.trim()) body.Password = password.trim();
      if (!Object.keys(body).length) {
        Alert.alert('Tidak ada perubahan', 'Isi Nama User atau Password terlebih dahulu.');
        return;
      }
      await userApi.updateMe(body);
      setOpenUserModal(false);
      Alert.alert('Tersimpan', 'Pengaturan akun berhasil disimpan.');
    } catch (e) {
      Alert.alert('Gagal menyimpan', e?.message || 'Terjadi kesalahan.');
    }
  };

  const onSaveTambak = async () => {
    try {
      await tambakApi.updateSelf({
        Nama: namaTambak?.trim() || tambak?.Nama,
        Substrat: substrat || tambak?.Substrat,
        Latitude: lat,
        Longitude: lng,
      });
      setTambak((prev) => ({
        ...prev,
        Nama: namaTambak?.trim() || prev?.Nama,
        Substrat: substrat || prev?.Substrat,
        Latitude: lat,
        Longitude: lng,
      }));
      setOpenTambakModal(false);
      Alert.alert('Tersimpan', 'Pengaturan tambak & lokasi berhasil disimpan.');
    } catch (e) {
      Alert.alert('Gagal menyimpan', e?.message || 'Terjadi kesalahan.');
    }
  };

  const checkStatusNow = useCallback(async () => {
    if (!deviceId) {
      setDeviceStatus('-');
      return;
    }
    try {
      setCheckingStatus(true);
      const last = await getIotLast(deviceId).catch(() => null);
      if (last && (last.Parameter || Object.keys(last || {}).length > 0)) {
        setDeviceStatus('Online');
      } else {
        setDeviceStatus('Tidak Merespons');
      }
    } catch (e) {
      setDeviceStatus(e?.message ? `Error: ${e.message}` : 'Error');
    } finally {
      setCheckingStatus(false);
    }
  }, [deviceId]);

  useEffect(() => {
    // otomatis cek status sekali saat deviceId siap
    if (deviceId) checkStatusNow();
  }, [deviceId, checkStatusNow]);

  const onConnectDevice = () => {
    // jika sudah ada perangkat → arahkan ke admin
    if (deviceId || tambak?.ID_PerangkatIot || tambak?.PerangkatTerhubung) {
      Alert.alert(
        'Sudah Terhubung',
        'Perubahan perangkat hanya dapat dilakukan oleh ADMIN. Silakan hubungi admin untuk mengganti perangkat.',
        [{ text: 'OK' }],
      );
    } else {
      setOpenConnect(true);
    }
  };

  const submitConnect = async (iotId, namaLokasi) => {
    if (!iotId) {
      Alert.alert('ID Perangkat wajib diisi', 'Masukkan ID perangkat IoT Anda.');
      return;
    }
    try {
      setConnecting(true);
      // bikin/daftarkan perangkat; backend diharapkan mengikat ke tambak user
      await createPerangkat({
        ID_PerangkatIot: iotId,
        Nama_LokasiPerangkat: namaLokasi || undefined,
      });

      // refresh list perangkat → ambil yang aktif
      const idTambak = tambak?.ID_Tambak || me?.ID_Tambak;
      if (idTambak) {
        const list = await listPerangkatByTambak(idTambak, { page: 1, limit: 10 });
        const rows = list?.rows || list?.data || list || [];
        const aktif = rows.find(r => r.Status === 'Aktif') || rows[0];
        const idIot = aktif?.ID_PerangkatIot || iotId;
        setDeviceId(idIot);
        setTambak(prev => ({
          ...prev,
          ID_PerangkatIot: idIot,
          PerangkatTerhubung: idIot,
        }));
      } else {
        // fallback
        setDeviceId(iotId);
        setTambak(prev => ({
          ...prev,
          ID_PerangkatIot: iotId,
          PerangkatTerhubung: iotId,
        }));
      }

      setOpenConnect(false);
      Alert.alert('Berhasil', 'Perangkat berhasil disambungkan.');
      // cek status langsung
      checkStatusNow();
    } catch (e) {
      const msg =
        e?.message ||
        'Gagal menyambungkan perangkat. Pastikan ID benar dan akun memiliki izin.';
      Alert.alert('Gagal', msg);
    } finally {
      setConnecting(false);
    }
  };

  const onChangePerangkat = () => {
    Alert.alert(
      'Hubungi Admin',
      'Perubahan perangkat hanya dapat dilakukan oleh ADMIN. Silakan hubungi admin untuk mengganti perangkat.',
      [{ text: 'OK' }],
    );
  };

  const shownDeviceId =
    deviceId || tambak?.ID_PerangkatIot || tambak?.PerangkatTerhubung || null;

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Gelombang biru di atas */}
      <View className="absolute left-0 right-0 mt-32" pointerEvents="none">
        <WaveBackground />
      </View>

      {/* Back kiri atas */}
      <TouchableOpacity
        onPress={onBack}
        className="absolute left-5 top-5 w-10 h-10 rounded-full bg-white items-center justify-center"
        style={{
          shadowOpacity: 0.2,
          shadowRadius: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          elevation: 5,
        }}
      >
        <Icon
          name={Platform.select({ ios: 'chevron-back', android: 'arrow-back' })}
          size={22}
          color="#0f172a"
        />
      </TouchableOpacity>

      <View
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {loading ? (
          <>
            <SkeletonHeaderCard />
            <SkeletonInfoCard />
          </>
        ) : (
          <>
            {/* Icon bulat + judul */}
            <View className="items-center mt-36">
              <View className="w-[133px] h-[131px] rounded-full items-center justify-center bg-[#4E71A6]">
                <FishIcons color="#fff" width={61} height={61} />
              </View>

              <Text className="mt-4 text-[28px] font-extrabold text-slate-900">
                {tambak?.Nama ?? 'Tambak'}
              </Text>
              <Text className="mt-1 text-[14px] text-slate-600">
                {shownDeviceId || 'Perangkat —'}
              </Text>
            </View>

            {/* Detail fields */}
            <View className="px-6 mt-8 text-sm">
              <Row label="Substrat :" value={tambak?.Substrat ?? '-'} />

              <Row
                label="Latitude :"
                value={Number.isFinite(tambak?.Latitude) ? Number(tambak.Latitude).toFixed(6) : '-'}
                right={
                  <TouchableOpacity onPress={onOpenMapsExt} className="px-2 py-1 rounded-lg bg-slate-100">
                    <Icon name="map-outline" size={18} color="#0f172a" />
                  </TouchableOpacity>
                }
              />
              <Row
                label="Longitude :"
                value={Number.isFinite(tambak?.Longitude) ? Number(tambak.Longitude).toFixed(6) : '-'}
                right={
                  <TouchableOpacity onPress={onOpenMapsExt} className="px-2 py-1 rounded-lg bg-slate-100">
                    <Icon name="map-outline" size={18} color="#0f172a" />
                  </TouchableOpacity>
                }
              />

              <View className="mt-8">
                {/* Perangkat Terhubung */}
                <Row
                  label="Perangkat  :"
                  value={shownDeviceId || '-'}
                  right={
                    shownDeviceId ? (
                      <TouchableOpacity onPress={onChangePerangkat} className="px-3 py-2 rounded-xl bg-amber-100">
                        <Text className="text-amber-900 font-extrabold">Ubah Perangkat?</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity onPress={onConnectDevice} className="px-3 py-2 rounded-xl bg-emerald-100">
                        <Text className="text-emerald-900 font-extrabold">Sambungkan</Text>
                      </TouchableOpacity>
                    )
                  }
                />

                {/* Status Perangkat */}
                <Row

                  label="Status Perangkat :"
                  value={deviceId ? deviceStatus : '-'}
                  right={
                    deviceId ? (
                      <TouchableOpacity
                        disabled={checkingStatus}
                        onPress={checkStatusNow}
                        className="px-3 py-2 rounded-xl bg-slate-100"
                      >
                        {checkingStatus
                          ? <ActivityIndicator />
                          : <Text className="font-extrabold text-slate-900">Cek Status</Text>}
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity onPress={onConnectDevice} className="px-3 py-2 rounded-xl bg-emerald-100">
                        <Text className="text-emerald-900 font-extrabold">Sambungkan</Text>
                      </TouchableOpacity>
                    )
                  }
                />
              </View>
            </View>

            {/* Dua tombol bawah */}
            <View className="px-6 mt-6 flex-row justify-between">
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setOpenChoice(true)}
                className="bg-[#67A9F3] rounded-2xl px-5 py-3 w-[45%] items-center"
                style={{
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 5,
                }}
              >
                <Text className="text-white font-extrabold text-[14px]">Pengaturan Akun</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.9}
                onPress={onCekPerangkat}
                className="bg-[#67A9F3] rounded-2xl px-5 py-3 w-[45%] items-center"
                style={{
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 5,
                }}
              >
                <Text className="text-white font-extrabold text-[14px]">Cek Perangkat</Text>
              </TouchableOpacity>
            </View>

            {/* Badge “Panduan Edit” kanan-bawah */}
            <TouchableOpacity
              onPress={() => navigation.navigate('OnboardingPengaturanAkun')}
              className="absolute right-6 bottom-6 items-center"
            >
              <View
                className="w-[64px] h-[64px] rounded-full bg-white items-center justify-center"
                style={{
                  shadowOpacity: 0.2,
                  shadowRadius: 10,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 6,
                }}
              >
                <SupportIcons />
              </View>
              <Text className="mt-2 text-[12px] text-slate-900 font-semibold">Panduan Edit</Text>
            </TouchableOpacity>

            {/* Spacer agar tidak ketutup custom bottom tab */}
            <View className="h-[120px]" />

            {/* ===== Modal Pilihan Edit ===== */}
            <EditChoiceModal
              visible={openChoice}
              onClose={() => setOpenChoice(false)}
              onPick={(t) => {
                setOpenChoice(false);
                if (t === 'akun') setOpenUserModal(true);
                if (t === 'tambak') setOpenTambakModal(true);
              }}
            />

            {/* ===== Modal Edit Akun ===== */}
            <Modal visible={openUserModal} transparent animationType="fade" onRequestClose={() => setOpenUserModal(false)}>
              <View className="flex-1 bg-black/40 items-center justify-center px-6">
                <View className="w-full rounded-2xl bg-white p-4">
                  <Text className="text-lg font-extrabold text-slate-900 mb-1">Edit Akun</Text>
                  <Text className="text-slate-600 mb-3">Ubah nama user & password.</Text>

                  <ScrollView style={{ maxHeight: 320 }}>
                    <View className="mb-3">
                      <Text className="text-[13px] font-bold text-slate-700 mb-2">Nama User</Text>
                      <TextInput
                        value={namaUser}
                        onChangeText={setNamaUser}
                        placeholder="Nama User (login)"
                        autoCapitalize="none"
                        className="border border-slate-300 rounded-xl px-3 py-3 bg-white"
                      />
                    </View>

                    <View className="mb-3">
                      <Text className="text-[13px] font-bold text-slate-700 mb-2">Password (opsional)</Text>
                      <TextInput
                        value={password}
                        onChangeText={setPassword}
                        placeholder="••••••••"
                        secureTextEntry
                        className="border border-slate-300 rounded-xl px-3 py-3 bg-white"
                      />
                    </View>
                  </ScrollView>

                  <View className="flex-row justify-end mt-3">
                    <TouchableOpacity onPress={() => setOpenUserModal(false)} className="px-4 py-2 rounded-xl mr-2 bg-slate-200">
                      <Text className="font-semibold">Batal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onSaveUser} className="px-4 py-2 rounded-xl bg-[#67A9F3]">
                      <Text className="text-white font-extrabold">Simpan</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

            {/* ===== Modal Edit Tambak ===== */}
            <Modal visible={openTambakModal} transparent animationType="fade" onRequestClose={() => setOpenTambakModal(false)}>
              <View className="flex-1 bg-black/40 items-center justify-center px-6">
                <View className="w-full rounded-2xl bg-white p-4">
                  <Text className="text-lg font-extrabold text-slate-900 mb-1">Edit Tambak</Text>
                  <Text className="text-slate-600 mb-3">Ubah nama tambak, substrat, dan lokasi.</Text>

                  {/* Form */}
                  <ScrollView style={{ maxHeight: 420 }}>
                    <View className="mb-3">
                      <Text className="text-[13px] font-bold text-slate-700 mb-2">Nama Tambak</Text>
                      <TextInput
                        value={namaTambak}
                        onChangeText={setNamaTambak}
                        placeholder="Nama Tambak"
                        className="border border-slate-300 rounded-xl px-3 py-3 bg-white"
                      />
                    </View>

                    <MiniDropdown
                      label="Substrat"
                      value={substrat}
                      items={substratOps}
                      onSelect={setSubstrat}
                    />

                    {/* Koordinat + tombol map */}
                    <View className="flex-row">
                      <View className="flex-1 mr-2">
                        <Text className="text-[13px] font-bold text-slate-700 mb-2">Latitude</Text>
                        <TextInput
                          value={Number.isFinite(lat) ? String(lat) : ''}
                          onChangeText={(t) => setLat(parseFloat(t))}
                          placeholder="-6.2"
                          keyboardType="numeric"
                          className="border border-slate-300 rounded-xl px-3 py-3 bg-white"
                        />
                      </View>
                      <View className="flex-1 ml-2">
                        <Text className="text-[13px] font-bold text-slate-700 mb-2">Longitude</Text>
                        <TextInput
                          value={Number.isFinite(lng) ? String(lng) : ''}
                          onChangeText={(t) => setLng(parseFloat(t))}
                          placeholder="106.8"
                          keyboardType="numeric"
                          className="border border-slate-300 rounded-xl px-3 py-3 bg-white"
                        />
                      </View>
                    </View>

                    <View className="flex-row mt-2">
                      <TouchableOpacity
                        onPress={() => setOpenMap(true)}
                        className="flex-row items-center px-3 py-2 rounded-xl bg-emerald-100 mr-2"
                      >
                        <Icon name="pin-outline" size={18} color="#065f46" />
                        <Text className="ml-2 text-emerald-900 font-extrabold">Pilih di Map</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={onOpenMapsExt}
                        className="flex-row items-center px-3 py-2 rounded-xl bg-slate-100"
                      >
                        <Icon name="map-outline" size={18} color="#0f172a" />
                        <Text className="ml-2 font-extrabold text-slate-900">Buka Google Maps</Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>

                  {/* Actions */}
                  <View className="flex-row justify-end mt-3">
                    <TouchableOpacity onPress={() => setOpenTambakModal(false)} className="px-4 py-2 rounded-xl mr-2 bg-slate-200">
                      <Text className="font-semibold">Batal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onSaveTambak} className="px-4 py-2 rounded-xl bg-[#67A9F3]">
                      <Text className="text-white font-extrabold">Simpan</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

            {/* Modal Map (khusus Edit Tambak) */}
            <MapPicker
              visible={openMap}
              onClose={() => setOpenMap(false)}
              lat={Number.isFinite(lat) ? lat : null}
              lng={Number.isFinite(lng) ? lng : null}
              onPick={(la, lo) => {
                setLat(la);
                setLng(lo);
              }}
            />

            {/* Modal Sambungkan Perangkat */}
            <ConnectDeviceModal
              visible={openConnect}
              onClose={() => setOpenConnect(false)}
              onSubmit={submitConnect}
              loading={connecting}
            />

          </>
        )}
      </View>

    </SafeAreaView>
  );
};

export default PengaturanAkun;
