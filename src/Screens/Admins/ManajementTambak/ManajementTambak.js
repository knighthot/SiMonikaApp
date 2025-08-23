// src/Screens/Admins/ManajementTambak/ManajementTambak.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, TextInput, Alert, Pressable, ActivityIndicator, StyleSheet, Platform, PermissionsAndroid
,RefreshControl} from 'react-native';
import WaveBackground from '../../../Utils/WaveBackground';
import Icon from 'react-native-vector-icons/Ionicons';
import { FishIcons } from '../../../Assets/Svg';
import { useNavigation } from '@react-navigation/native';
import { tambakApi, userApi, listPerangkat } from '../../../api';
import Geolocation from 'react-native-geolocation-service';
import { useController, useForm } from 'react-hook-form';


const Chip = ({ active, label, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    className={`px-4 py-2 rounded-full mr-2 ${active ? 'bg-blue-600' : 'bg-gray-200'}`}
  >
    <Text className={`${active ? 'text-white' : 'text-gray-800'} font-semibold`}>{label}</Text>
  </TouchableOpacity>
);

export default function ManajementTambak() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('TAMBAK'); // 'TAMBAK' | 'USER'

  // data
  const [tambaks, setTambaks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [perangkatList, setPerangkatList] = useState([]);

  // add/edit modals
  const [showAddPicker, setShowAddPicker] = useState(false); // modal pilihan Tambah
  const [addType, setAddType] = useState(null); // 'TAMBAK' | 'USER'
  const [showTambakForm, setShowTambakForm] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);

  // form Tambak
  const [tNama, setTNama] = useState('');
  const [tSubstrat, setTSubstrat] = useState('');
  const [editTambakId, setEditTambakId] = useState(null);
  const [tPerangkatId, setTPerangkatId] = useState(null); // perangkat terpilih
  const [tUserId, setTUserId] = useState(null); // user terpilih untuk ditautkan ke tambak (opsional)
  const [keterangan, setKeterangan] = useState('');
  const [tLat, setTLat] = useState('');
const [tLng, setTLng] = useState('');

  // form User
  const [uNama, setUNama] = useState('');
 
  const [uPassword, setUPassword] = useState('');
  const [uRole, setURole] = useState('USER'); // USER | ADMIN
  const [uTambakId, setUTambakId] = useState(null);
  const [uConfirmPassword, setUConfirmPassword] = useState('');
  const [showTambakSelect, setShowTambakSelect] = useState(false);
  const [editUserId, setEditUserId] = useState(null);
// toggle ubah password saat edit
const [uChangePwd, setUChangePwd] = useState(false);
const [uPwdVisible, setUPwdVisible] = useState(false);
const [uPwdVisible2, setUPwdVisible2] = useState(false);

  const [showPerangkatSelect, setShowPerangkatSelect] = useState(false);
  const [showUserSelect, setShowUserSelect] = useState(false);
  const [showSubstratSelect, setShowSubstratSelect] = useState(false);
const { control } = useForm();
// --- Keterangan (dropdown) ---
const [showKeteranganSelect, setShowKeteranganSelect] = useState(false);
const KETERANGAN_OPTIONS = ['Penerima data alat IoT', 'Alat IoT'];

const { field: latField } = useController({ name: 'lat', control });
const { field: lngField } = useController({ name: 'lng', control });


const [refreshing, setRefreshing] = useState(false); // <— NEW

// ganti loadAll lama menjadi versi ini:
const loadAll = async (mode = 'full') => {
  // mode: 'full' | 'refresh'
  mode === 'full' ? setLoading(true) : setRefreshing(true);
  try {
    const [t, u, p] = await Promise.all([
      tambakApi.list({ limit: 200 }),
      userApi.list({ limit: 200 }).catch((e) => {
        if (e.status === 403) return { data: [] };
        throw e;
      }),
      listPerangkat({ limit: 200 }).catch(() => ({ data: [] })),
    ]);
    setTambaks(t?.rows ?? t?.data ?? []);
    setUsers(u?.rows ?? u?.data ?? []);
    setPerangkatList(p?.rows ?? p?.data ?? []);
  } catch (e) {
    Alert.alert('Gagal memuat data', e.message);
  } finally {
    mode === 'full' ? setLoading(false) : setRefreshing(false);
  }
};

// initial load
useEffect(() => { loadAll('full'); }, []);




  const SUBSTRAT_OPTIONS = ['Tanah', 'Tanah liat', 'Pasir', 'Lumpur', 'Kerikil', 'Campuran'];




 async function requestLocationPermission() {
  if (Platform.OS === 'ios') return true;

  try {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ]);

    const fine   = result[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
    const coarse = result[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION];

    const granted = (fine === PermissionsAndroid.RESULTS.GRANTED) ||
                    (coarse === PermissionsAndroid.RESULTS.GRANTED);

    if (!granted) Alert.alert('Izin lokasi ditolak');
    return granted;
  } catch (e) {
    Alert.alert('Gagal meminta izin lokasi', e?.message || 'unknown');
    return false;
  }
}

 async function fillWithLocation(setLat, setLng) {
  const ok = await requestLocationPermission();
  if (!ok) return;

  Geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords || {};
      if (latitude != null && longitude != null) {
        setLat(String(latitude));
        setLng(String(longitude));
      } else {
        Alert.alert('Gagal membaca koordinat');
      }
    },
    (err) => {
      Alert.alert('Gagal membaca lokasi', err?.message || 'unknown');
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
  );
}




  /* ========= Tambah / Edit Tambak ========= */
  const openAddTambak = () => {
    setEditTambakId(null);
    setTNama(''); setTSubstrat(''); setTLat(''); setTLng('');
    setKeterangan('');
    setShowTambakForm(true);
  };
  const openEditTambak = (item) => {
    setEditTambakId(item.ID_Tambak);
    setTNama(item.Nama || '');
    setTSubstrat(item.Substrat || '');
    setTLat(item.Latitude != null ? String(item.Latitude) : '');
    setTLng(item.Longitude != null ? String(item.Longitude) : '');
    setKeterangan(item.Keterangan || '');
     setTPerangkatId(item.ID_Perangkat ?? null);
const u = (users || []).find(u => u.ID_Tambak === item.ID_Tambak);
  setTUserId(u?.ID_User ?? null);
  console.log(u);
    setShowTambakForm(true);
  };
  const submitTambak = async () => {
    if (!tNama.trim()) return Alert.alert('Nama tambak wajib diisi');
    const payload = {
      Nama: tNama.trim(),
      Substrat: tSubstrat || null,
      Latitude: tLat ? Number(tLat) : null,
      Longitude: tLng ? Number(tLng) : null,
      ID_Perangkat: tPerangkatId || null,
      Keterangan: keterangan || null,
    };
    try {
    if (editTambakId) {
      await tambakApi.update(editTambakId, payload);
      // assign user bila dipilih
      if (tUserId) {
        await userApi.update(tUserId, { ID_Tambak: editTambakId });
      }
    } else {
      const res = await tambakApi.create(payload); // { id: ID_Tambak }
      const newId = res?.id;
      if (tUserId && newId) {
        await userApi.update(tUserId, { ID_Tambak: newId });
      }
    }
      setShowTambakForm(false);
      loadAll();
    } catch (e) { Alert.alert('Gagal simpan tambak', e.message); }
  };
  const deleteTambak = (id) => {
    Alert.alert('Hapus Tambak', 'Yakin hapus?', [
      { text: 'Batal' },
      {
        text: 'Hapus', style: 'destructive', onPress: async () => {
          try { await tambakApi.remove(id); loadAll(); }
          catch (e) { Alert.alert('Gagal hapus', e.message); }
        }
      }
    ]);
  };

/* ========= Tambah / Edit User ========= */
const openAddUser = () => {
  setEditUserId(null);
  setUNama(''); 
  setUPassword(''); 
  setURole('USER'); 
  setUTambakId(null);
  setShowUserForm(true);
};

const openEditUser = (u) => {
  setEditUserId(u.ID_User);
  setUNama(u.Nama_tambak || '');   // <-- pakai Nama_tambak
  setUPassword('');                // kosongkan
  setURole(u.Role || 'USER');
  setUTambakId(u.TB_Tambak?.ID_Tambak || null);
  setShowUserForm(true);
};


const submitUser = async () => {
  if (!uNama.trim()) return Alert.alert('Nama wajib diisi');
  if (!uTambakId) return Alert.alert('Pilih tambak untuk user ini');

  // Aturan password:
  if (!editUserId) {
    // CREATE: wajib
    if (!uPassword.trim()) return Alert.alert('Password wajib untuk user baru');
    if (uPassword.length < 6) return Alert.alert('Password minimal 6 karakter');
    if (uPassword !== uConfirmPassword) return Alert.alert('Konfirmasi password tidak cocok');
  } else if (uChangePwd && uPassword.trim()) {
    // UPDATE: opsional, tapi kalau diisi harus valid
    if (uPassword.length < 6) return Alert.alert('Password minimal 6 karakter');
    if (uPassword !== uConfirmPassword) return Alert.alert('Konfirmasi password tidak cocok');
  }

  const payload = {
    Nama_tambak: uNama.trim(),
    Role: uRole,
    ID_Tambak: uTambakId,
    // hanya kirim Password jika:
    ...((!editUserId && uPassword) || (editUserId && uChangePwd && uPassword)
        ? { Password: uPassword }
        : {}),
  };

  try {
    if (editUserId) await userApi.update(editUserId, payload);
    else await userApi.create(payload);
    setShowUserForm(false);
    loadAll();
  } catch (e) {
    Alert.alert('Gagal simpan user', e?.message || 'Unknown error');
  }
};


  const deleteUser = (id) => {
    Alert.alert('Hapus User', 'Yakin hapus user ini?', [
      { text: 'Batal' },
      {
        text: 'Hapus', style: 'destructive', onPress: async () => {
          try { await userApi.remove(id); loadAll(); }
          catch (e) { Alert.alert('Gagal hapus', e.message); }
        }
      }
    ]);
  };

  /* ========= Modal Pilihan Tambah ========= */
  const openAddPicker = () => { setAddType(null); setShowAddPicker(true); };
  const pickToForm = (type) => {
    setShowAddPicker(false);
    if (type === 'TAMBAK') openAddTambak();
    else openAddUser();
  };


  // Skeleton Tambak card
const SkeletonTambak = () => (
  <View className="flex-row rounded-lg mb-4 overflow-hidden">
    <View className="w-20 items-center justify-center py-4" style={{ backgroundColor: '#e5e7eb' }}>
      <View className="w-10 h-10 rounded-full" style={{ backgroundColor: '#d1d5db' }} />
    </View>
    <View className="flex-1 bg-white">
      <View className="p-4">
        <View className="h-4 w-40 mb-2 rounded" style={{ backgroundColor: '#e5e7eb' }} />
        <View className="h-3 w-56 mb-2 rounded" style={{ backgroundColor: '#e5e7eb' }} />
        <View className="h-3 w-44 mb-2 rounded" style={{ backgroundColor: '#e5e7eb' }} />
        <View className="h-3 w-48 rounded" style={{ backgroundColor: '#e5e7eb' }} />
      </View>
      <View className="flex-row justify-evenly w-full p-2" style={{ backgroundColor: '#e5e7eb' }}>
        <View className="w-8 h-8 rounded-full" style={{ backgroundColor: '#d1d5db' }} />
        <View className="w-8 h-8 rounded-full" style={{ backgroundColor: '#d1d5db' }} />
        <View className="w-8 h-8 rounded-full" style={{ backgroundColor: '#d1d5db' }} />
      </View>
    </View>
  </View>
);

// Skeleton User card
const SkeletonUser = () => (
  <View className="mx-1 mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <View className="flex-row items-center p-4">
      <View className="mr-3 h-12 w-12 rounded-full" style={{ backgroundColor: '#e5e7eb' }} />
      <View className="flex-1">
        <View className="h-4 w-48 mb-2 rounded" style={{ backgroundColor: '#e5e7eb' }} />
        <View className="h-3 w-28 mb-1 rounded" style={{ backgroundColor: '#e5e7eb' }} />
        <View className="h-3 w-40 rounded" style={{ backgroundColor: '#e5e7eb' }} />
      </View>
      <View className="ml-3 w-8 h-8 rounded-full" style={{ backgroundColor: '#e5e7eb' }} />
    </View>
    <View className="h-[1px] bg-slate-100" />
    <View className="px-4 py-2">
      <View className="h-3 w-36 rounded" style={{ backgroundColor: '#e5e7eb' }} />
    </View>
  </View>
);


  /* ========= UI item renderers ========= */
  const renderTambak = ({ item }) => (
    <View className="flex-row rounded-lg mb-4 overflow-hidden" style={{ borderRadius: 12 }}>
      <View className="justify-center items-center w-20 py-4" style={{ backgroundColor: '#5176AF' }}>
        <FishIcons color="#fff" />

      </View>
      <View className="flex-1 bg-white">
        <View className="p-4">
          <Text className="text-base font-bold text-gray-900">{item.Nama}</Text>
          <Text className="text-xs text-gray-700">ID_Perangkat: {item.ID_Perangkat ?? '-'}</Text>
          <Text className="text-xs text-gray-700 mt-1">Substrat: {item.Substrat ?? '-'}</Text>
          <Text className="text-xs text-gray-700 mt-1">
            Lokasi: {item.Latitude != null ? item.Latitude.toFixed(5) : '-'}, {item.Longitude != null ? item.Longitude.toFixed(5) : '-'}
          </Text>
        </View>
        <View className="flex-row justify-evenly w-full p-2" style={{ backgroundColor: '#5176AF' }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('TambakDetail', { tambak: item })}
            className="bg-[#68C07F] p-2 rounded-full"
          >
            <Icon name="eye" size={16} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => openEditTambak(item)}
            className="bg-[#F2B84C] p-2 rounded-full"
          >
            <Icon name="pencil" size={16} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => deleteTambak(item.ID_Tambak)}
            className="bg-[#E94343] p-2 rounded-full"
          >
            <Icon name="trash" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const getInitials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '')
    .join('') || 'U';

const roleStyles = {
  ADMIN: { bg: 'bg-rose-100', text: 'text-rose-700' },
  USER:  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
};


     const SkeletonList = ({ type = 'tambak' }) => (
  <View className="px-4 pt-20 pb-36">
    {Array.from({ length: 6 }).map((_, i) =>
      type === 'tambak' ? <SkeletonTambak key={i} /> : <SkeletonUser key={i} />
    )}
  </View>
);

 const renderUser = ({ item }) => {
  const initials = getInitials(item?.Nama_tambak);
  const role = item?.Role === 'ADMIN' ? 'ADMIN' : 'USER';
  const roleCls = roleStyles[role];

  return (
    <View className="mx-1 mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Strip aksen kiri */}
      <View className="absolute left-0 top-0 h-full w-1 bg-sky-400" />

      <View className="flex-row items-center p-4">
        {/* Avatar Inisial */}
        <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-sky-50">
          <Text className="text-lg font-extrabold text-sky-700">{initials}</Text>
        </View>

        {/* Info Utama */}
        <View className="flex-1">
          <Text
            className="text-base font-bold text-slate-900"
            numberOfLines={1}
          >
            {item.Nama_tambak}
          </Text>

          <View className="mt-1 flex-row items-center">
            {/* Badge Role */}
            <View className={`rounded-full px-2 py-0.5 ${roleCls.bg}`}>
              <Text className={`text-[10px] font-semibold ${roleCls.text}`}>
                {role}
              </Text>
            </View>

            {/* Nama Tambak */}
            <View className="ml-2 flex-row items-center">
              <Icon name="location-outline" size={12} color="#64748b" />
              <Text
                className="ml-1 max-w-[180px] text-xs text-slate-600"
                numberOfLines={1}
              >
                {item.TB_Tambak?.Nama ?? '-'}
              </Text>
            </View>
          </View>
        </View>

        {/* Aksi Cepat */}
        <View className="ml-3 flex-row">
          <TouchableOpacity
            onPress={() => openEditUser(item)}
            className="mr-2 rounded-full bg-amber-500/90 p-2 active:opacity-90"
          >
            <Icon name="pencil" size={16} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => deleteUser(item.ID_User)}
            className="rounded-full bg-rose-500/90 p-2 active:opacity-90"
          >
            <Icon name="trash" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer tipis (opsional) */}
      <View className="h-[1px] bg-slate-100" />
      <View className="px-4 py-2">
        <Text className="text-[11px] text-slate-500">
          ID Tambak: {item.TB_Tambak?.ID_Tambak ?? '-'}
        </Text>
      </View>
    </View>
  );
};
  
  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View style={{ ...StyleSheet.absoluteFillObject, zIndex: -1 }} pointerEvents="none">
        <WaveBackground />
      </View>

      {/* Header */}
      <View className="px-4 mt-10" style={{ zIndex: 2 }}>
        <Text className="text-2xl font-bold text-gray-900">Manajemen Tambak</Text>
        <Text className="text-sm text-gray-600 mt-1">Pilih tambak atau user</Text>
        <View className="flex-row mt-3">
          <Chip active={activeTab === 'TAMBAK'} label="Tambak" onPress={() => setActiveTab('TAMBAK')} />
          <Chip active={activeTab === 'USER'} label="User" onPress={() => setActiveTab('USER')} />
        </View>
      </View>

      {/* Wave background */}
      <View className="p-4 bottom-10">
        <WaveBackground className="absolute left-0 right-0 bottom-0" />
      </View>

   
    
{/* ====== di bagian render ====== */}
{/* List */}
{loading ? (
  activeTab === 'TAMBAK' ? (
    <SkeletonList type="tambak" />
  ) : (
    <SkeletonList type="user" />
  )
) : activeTab === 'TAMBAK' ? (
  <FlatList
    data={tambaks}
    keyExtractor={(it) => String(it.ID_Tambak)}
    renderItem={renderTambak}
    contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 80, paddingBottom: 150 }}
    refreshControl={
      <RefreshControl
        refreshing={refreshing}
        onRefresh={() => loadAll('refresh')}
        colors={['#2563eb']}
        tintColor="#2563eb"
      />
    }
    ListEmptyComponent={
      <View className="items-center mt-20">
        <Text className="text-gray-500">Belum ada data tambak</Text>
      </View>
    }
  />
) : (
  <FlatList
    data={users}
    keyExtractor={(it) => String(it.ID_User)}
    renderItem={renderUser}
    contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 80, paddingBottom: 150 }}
    refreshControl={
      <RefreshControl
        refreshing={refreshing}
        onRefresh={() => loadAll('refresh')}
        colors={['#2563eb']}
        tintColor="#2563eb"
      />
    }
    ListEmptyComponent={
      <View className="items-center mt-20">
        <Text className="text-gray-500">Belum ada data user</Text>
      </View>
    }
  />
)}

      {/* Floating + button */}
      <TouchableOpacity
        className="absolute bottom-24 right-6 bg-blue-600 p-4 rounded-full shadow-lg"
        onPress={openAddPicker}
      >
        <Icon name="add" size={24} color="#fff" />
      </TouchableOpacity>

      {/* ===== Modal: Pilih jenis tambah ===== */}
      <Modal visible={showAddPicker} transparent animationType="fade" onRequestClose={() => setShowAddPicker(false)}>
        <Pressable className="flex-1 bg-black/40 items-center justify-center" onPress={() => setShowAddPicker(false)}>
          <Pressable className="w-11/12 bg-white rounded-2xl p-6" onPress={() => { }}>
            <Text className="text-xl font-bold mb-4">Tambah</Text>
            <TouchableOpacity className="bg-blue-600 rounded-xl py-3 mb-3" onPress={() => pickToForm('TAMBAK')}>
              <Text className="text-white text-center font-bold">Tambah Tambak</Text>
            </TouchableOpacity>
            <TouchableOpacity className="bg-emerald-600 rounded-xl py-3" onPress={() => pickToForm('USER')}>
              <Text className="text-white text-center font-bold">Tambah User</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ===== Modal: Form Tambak ===== */}
     {/* ===== Modal: Form Tambak ===== */}
<Modal visible={showTambakForm} transparent animationType="slide" onRequestClose={() => setShowTambakForm(false)}>
  <Pressable className="flex-1 bg-black/40 items-center justify-end" onPress={() => setShowTambakForm(false)}>
    <Pressable className="w-full bg-white rounded-t-3xl p-6" onPress={() => {}}>
      <Text className="text-lg font-extrabold mb-4">{editTambakId ? 'Edit Tambak' : 'Tambah Tambak'}</Text>

      {/* Nama */}
      <Text className="text-sm text-gray-700 mb-1">Nama</Text>
      <TextInput
        value={tNama}
        onChangeText={setTNama}
        placeholder="Tambak A"
        className="border border-gray-300 rounded-xl px-3 py-2 mb-3"
      />

      {/* Substrat (dropdown) */}
      <Text className="text-sm text-gray-700 mb-1">Substrat</Text>
      <TouchableOpacity
        className="border border-gray-300 rounded-xl px-3 py-3 mb-3"
        onPress={() => setShowSubstratSelect(true)}
      >
        <Text className="text-gray-800">{tSubstrat || 'Pilih Substrat'}</Text>
      </TouchableOpacity>

      {/* Koordinat + tombol lokasi */}
      <View className="flex-row space-x-3">
        <View className="flex-1">
          <Text className="text-sm text-gray-700 mb-1">Latitude</Text>
          <TextInput
            value={tLat}
            onChangeText={setTLat}
            keyboardType="numeric"
            placeholder="-6.2"
            className="border border-gray-300 rounded-xl px-3 py-2 mb-3"
          />
        </View>
        <View className="flex-1">
          <Text className="text-sm text-gray-700 mb-1">Longitude</Text>
          <TextInput
            value={tLng}
            onChangeText={setTLng}
            keyboardType="numeric"
            placeholder="106.8"
            className="border border-gray-300 rounded-xl px-3 py-2 mb-3"
          />
        </View>
      </View>

<Text className="text-sm text-gray-700 mb-1">Keterangan</Text>
<TouchableOpacity
  className="border border-gray-300 rounded-xl px-3 py-3 mb-3"
  onPress={() => setShowKeteranganSelect(true)}
>
  <Text className="text-gray-800">
    {keterangan || 'Pilih keterangan'}
  </Text>
</TouchableOpacity>


      

<View className="flex-row space-x-2 mb-3">
  {/* Tombol gunakan lokasi */}
  <TouchableOpacity
    onPress={() => fillWithLocation(setTLat, setTLng)}
    className="bg-emerald-600 rounded-xl px-4 py-2 flex-row items-center"
  >
    <Icon name="locate" size={16} color="#fff" style={{ marginRight: 6 }} />
    <Text className="text-white font-bold">Gunakan Lokasi</Text>
  </TouchableOpacity>

  {/* Tombol buka map */}
  <TouchableOpacity
    onPress={() => navigation.navigate('PilihLokasi', { setLat: setTLat, setLng: setTLng })}
    className="bg-blue-600 rounded-xl px-3 py-2 flex-row items-center justify-center"
  >
    <Icon name="map" size={20} color="#fff" />
  </TouchableOpacity>
</View>


      {/* Perangkat (dropdown) */}
      <Text className="text-sm text-gray-700 mb-1">Perangkat</Text>
      <TouchableOpacity
        className="border border-gray-300 rounded-xl px-3 py-3 mb-3"
        onPress={() => setShowPerangkatSelect(true)}
      >
        <Text className="text-gray-800">
          {tPerangkatId
            ? (perangkatList.find(p => p.ID_Perangkat === tPerangkatId)?.ID_PerangkatIot || tPerangkatId)
            : 'Pilih Perangkat'}
        </Text>
      </TouchableOpacity>

      {/* User (dropdown) */}
      <Text className="text-sm text-gray-700 mb-1">User (opsional)</Text>
      <TouchableOpacity
        className="border border-gray-300 rounded-xl px-3 py-3 mb-3"
        onPress={() => setShowUserSelect(true)}
      >
        <Text className="text-gray-800">
          {tUserId
            ? (users.find(u => u.ID_User === tUserId)?.Nama || tUserId)
            : 'Pilih User'}
        </Text>
      </TouchableOpacity>

      {/* Action */}
      <View className="flex-row mt-2">
        <TouchableOpacity className="flex-1 bg-gray-200 rounded-xl py-3 mr-2" onPress={() => setShowTambakForm(false)}>
          <Text className="text-center font-bold text-gray-700">Batal</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-1 bg-blue-600 rounded-xl py-3" onPress={submitTambak}>
          <Text className="text-center font-bold text-white">{editTambakId ? 'Simpan' : 'Tambah'}</Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  </Pressable>
</Modal>

{/* ===== Modal: Pilih Keterangan ===== */}
<Modal
  visible={showKeteranganSelect}
  transparent
  animationType="fade"
  onRequestClose={() => setShowKeteranganSelect(false)}
>
  <Pressable
    className="flex-1 bg-black/40 items-center justify-center"
    onPress={() => setShowKeteranganSelect(false)}
  >
    <Pressable
      className="w-11/12 bg-white rounded-2xl p-4"
      onPress={() => {}}
    >
      <Text className="text-lg font-bold mb-3">Pilih Keterangan</Text>
      {KETERANGAN_OPTIONS.map(opt => (
        <TouchableOpacity
          key={opt}
          onPress={() => { setKeterangan(opt); setShowKeteranganSelect(false); }}
          className="py-3 border-b border-gray-100"
        >
          <Text className="text-gray-900">{opt}</Text>
        </TouchableOpacity>
      ))}
    </Pressable>
  </Pressable>
</Modal>


   {/* ===== Modal: Form User ===== */}
<Modal visible={showUserForm} transparent animationType="slide" onRequestClose={() => setShowUserForm(false)}>
  <Pressable className="flex-1 bg-black/40 items-center justify-end" onPress={() => setShowUserForm(false)}>
    <Pressable className="w-full bg-white rounded-t-3xl p-6" onPress={() => { }}>
      <Text className="text-lg font-extrabold mb-4">{editUserId ? 'Edit User' : 'Tambah User'}</Text>

      <Text className="text-sm text-gray-700 mb-1">Nama</Text>
      <TextInput
        value={uNama}
        onChangeText={setUNama}
        placeholder="Nama user"
        className="border border-gray-300 rounded-xl px-3 py-2 mb-3"
      />

    {!editUserId ? (
  // CREATE
  <>
    <Text className="text-sm text-gray-700 mb-1">Password</Text>
    <View className="border border-gray-300 rounded-xl px-3 py-2 mb-3 flex-row items-center">
      <TextInput
        value={uPassword}
        onChangeText={setUPassword}
        secureTextEntry={!uPwdVisible}
        placeholder="******"
        className="flex-1"
      />
      <TouchableOpacity onPress={() => setUPwdVisible(v => !v)}>
        <Icon name={uPwdVisible ? 'eye-off' : 'eye'} size={20} color="#666" />
      </TouchableOpacity>
    </View>

    <Text className="text-sm text-gray-700 mb-1">Konfirmasi Password</Text>
    <View className="border border-gray-300 rounded-xl px-3 py-2 mb-3 flex-row items-center">
      <TextInput
        value={uConfirmPassword}
        onChangeText={setUConfirmPassword}
        secureTextEntry={!uPwdVisible2}
        placeholder="******"
        className="flex-1"
      />
      <TouchableOpacity onPress={() => setUPwdVisible2(v => !v)}>
        <Icon name={uPwdVisible2 ? 'eye-off' : 'eye'} size={20} color="#666" />
      </TouchableOpacity>
    </View>
  </>
) : (
  // UPDATE
  <>
    <TouchableOpacity
      onPress={() => setUChangePwd(v => !v)}
      className="flex-row items-center justify-between border border-gray-300 rounded-xl px-3 py-3 mb-3"
    >
      <Text className="text-gray-800 font-semibold">Ubah password</Text>
      <Icon name={uChangePwd ? 'toggle' : 'toggle-outline'} size={28} color="#2563eb" />
    </TouchableOpacity>

    {uChangePwd && (
      <>
        <Text className="text-sm text-gray-700 mb-1">Password Baru</Text>
        <View className="border border-gray-300 rounded-xl px-3 py-2 mb-3 flex-row items-center">
          <TextInput
            value={uPassword}
            onChangeText={setUPassword}
            secureTextEntry={!uPwdVisible}
            placeholder="******"
            className="flex-1"
          />
          <TouchableOpacity onPress={() => setUPwdVisible(v => !v)}>
            <Icon name={uPwdVisible ? 'eye-off' : 'eye'} size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <Text className="text-sm text-gray-700 mb-1">Konfirmasi Password</Text>
        <View className="border border-gray-300 rounded-xl px-3 py-2 mb-3 flex-row items-center">
          <TextInput
            value={uConfirmPassword}
            onChangeText={setUConfirmPassword}
            secureTextEntry={!uPwdVisible2}
            placeholder="******"
            className="flex-1"
          />
          <TouchableOpacity onPress={() => setUPwdVisible2(v => !v)}>
            <Icon name={uPwdVisible2 ? 'eye-off' : 'eye'} size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </>
    )}
  </>
)}
      <Text className="text-sm text-gray-700 mb-1">Role</Text>
      <View className="flex-row mb-3">
        {['USER', 'ADMIN'].map(r => (
          <TouchableOpacity
            key={r}
            onPress={() => setURole(r)}
            className={`px-4 py-2 rounded-full mr-2 ${uRole === r ? 'bg-blue-600' : 'bg-gray-200'}`}
          >
            <Text className={`${uRole === r ? 'text-white' : 'text-gray-800'} font-semibold`}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text className="text-sm text-gray-700 mb-1">Tambak</Text>
      <TouchableOpacity
        className="border border-gray-300 rounded-xl px-3 py-3 mb-3"
        onPress={() => setShowTambakSelect(true)}
      >
        <Text className="text-gray-800">
          {uTambakId ? (tambaks.find(t => t.ID_Tambak === uTambakId)?.Nama || uTambakId) : 'Pilih Tambak'}
        </Text>
      </TouchableOpacity>

      <View className="flex-row mt-2">
        <TouchableOpacity className="flex-1 bg-gray-200 rounded-xl py-3 mr-2" onPress={() => setShowUserForm(false)}>
          <Text className="text-center font-bold text-gray-700">Batal</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-1 bg-emerald-600 rounded-xl py-3" onPress={submitUser}>
          <Text className="text-center font-bold text-white">{editUserId ? 'Simpan' : 'Tambah'}</Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  </Pressable>
</Modal>


      {/* ===== Modal Select Tambak (dropdown sederhana) ===== */}
      <Modal visible={showTambakSelect} transparent animationType="fade" onRequestClose={() => setShowTambakSelect(false)}>
        <Pressable className="flex-1 bg-black/40 items-center justify-center" onPress={() => setShowTambakSelect(false)}>
          <Pressable className="w-11/12 bg-white rounded-2xl p-4 max-h-[70%]" onPress={() => { }}>
            <Text className="text-lg font-bold mb-3">Pilih Tambak</Text>
            <FlatList
              data={tambaks}
              keyExtractor={(it) => String(it.ID_Tambak)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => { setUTambakId(item.ID_Tambak); setShowTambakSelect(false); }}
                  className="py-3 border-b border-gray-100"
                >
                  <Text className="font-semibold text-gray-900">{item.Nama}</Text>
                  <Text className="text-xs text-gray-600">
                    {item.Latitude != null ? item.Latitude.toFixed(5) : '-'}, {item.Longitude != null ? item.Longitude.toFixed(5) : '-'}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* ===== Modal: Pilih Substrat ===== */}
<Modal visible={showSubstratSelect} transparent animationType="fade" onRequestClose={() => setShowSubstratSelect(false)}>
  <Pressable className="flex-1 bg-black/40 items-center justify-center" onPress={() => setShowSubstratSelect(false)}>
    <Pressable className="w-11/12 bg-white rounded-2xl p-4" onPress={() => {}}>
      <Text className="text-lg font-bold mb-3">Pilih Substrat</Text>
      {SUBSTRAT_OPTIONS.map(opt => (
        <TouchableOpacity
          key={opt}
          onPress={() => { setTSubstrat(opt); setShowSubstratSelect(false); }}
          className="py-3 border-b border-gray-100"
        >
          <Text className="text-gray-900">{opt}</Text>
        </TouchableOpacity>
      ))}
    </Pressable>
  </Pressable>
</Modal>

{/* ===== Modal: Pilih Perangkat ===== */}
<Modal visible={showPerangkatSelect} transparent animationType="fade" onRequestClose={() => setShowPerangkatSelect(false)}>
  <Pressable className="flex-1 bg-black/40 items-center justify-center" onPress={() => setShowPerangkatSelect(false)}>
    <Pressable className="w-11/12 bg-white rounded-2xl p-4 max-h-[70%]" onPress={() => {}}>
      <Text className="text-lg font-bold mb-3">Pilih Perangkat</Text>
      <FlatList
        data={perangkatList}
        keyExtractor={(it) => String(it.ID_Perangkat)}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => { setTPerangkatId(item.ID_Perangkat); setShowPerangkatSelect(false); }}
            className="py-3 border-b border-gray-100"
          >
            <Text className="font-semibold text-gray-900">{item.Nama_LokasiPerangkat || 'Perangkat'}</Text>
            <Text className="text-xs text-gray-600">{item.ID_PerangkatIot}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text className="text-gray-500">Tidak ada perangkat</Text>}
      />
    </Pressable>
  </Pressable>
</Modal>

{/* ===== Modal: Pilih User ===== */}
<Modal visible={showUserSelect} transparent animationType="fade" onRequestClose={() => setShowUserSelect(false)}>
  <Pressable className="flex-1 bg-black/40 items-center justify-center" onPress={() => setShowUserSelect(false)}>
    <Pressable className="w-11/12 bg-white rounded-2xl p-4 max-h-[70%]" onPress={() => {}}>
      <Text className="text-lg font-bold mb-3">Pilih User</Text>
      <FlatList
        data={users}
        keyExtractor={(it) => String(it.ID_User)}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => { setTUserId(item.ID_User); setShowUserSelect(false); }}
            className="py-3 border-b border-gray-100"
          >
            <Text className="font-semibold text-gray-900">{item.Nama_tambak}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text className="text-gray-500">Tidak ada user</Text>}
      />
    </Pressable>
  </Pressable>
</Modal>

    </View>
  );
}


