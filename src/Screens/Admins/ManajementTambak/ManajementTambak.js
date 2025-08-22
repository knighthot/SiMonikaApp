// src/Screens/Admins/ManajementTambak/ManajementTambak.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, TextInput, Alert, Pressable, ActivityIndicator, StyleSheet, Platform, PermissionsAndroid
} from 'react-native';
import WaveBackground from '../../../Utils/WaveBackground';
import Icon from 'react-native-vector-icons/Ionicons';
import { FishIcons } from '../../../Assets/Svg';
import { useNavigation } from '@react-navigation/native';
import { tambakApi, userApi, listPerangkat } from '../../../api';
import Geolocation from 'react-native-geolocation-service';

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
  const [tLat, setTLat] = useState('');
  const [tLng, setTLng] = useState('');
  const [editTambakId, setEditTambakId] = useState(null);
  const [tPerangkatId, setTPerangkatId] = useState(null); // perangkat terpilih
  const [tUserId, setTUserId] = useState(null); // user terpilih untuk ditautkan ke tambak (opsional)
  // form User
  const [uNama, setUNama] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uPassword, setUPassword] = useState('');
  const [uRole, setURole] = useState('USER'); // USER | ADMIN
  const [uTambakId, setUTambakId] = useState(null);
  const [showTambakSelect, setShowTambakSelect] = useState(false);
  const [editUserId, setEditUserId] = useState(null);


  const [showPerangkatSelect, setShowPerangkatSelect] = useState(false);
  const [showUserSelect, setShowUserSelect] = useState(false);
  const [showSubstratSelect, setShowSubstratSelect] = useState(false);


  const { field: latField } = useController({ name: 'lat' });
const { field: lngField } = useController({ name: 'lng' });
  const SUBSTRAT_OPTIONS = ['Tanah', 'Tanah liat', 'Pasir', 'Lumpur', 'Kerikil', 'Campuran'];

const loadAll = async () => {
   setLoading(true);
   try {
    const [t, u, p] = await Promise.all([
      tambakApi.list({ limit: 200 }),      // {data, meta} atau {rows, meta}
      userApi.list({ limit: 200 }).catch((e) => {
        if (e.status === 403) return { data: [] }; // kalau bukan admin
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
     setLoading(false);
   }
 };



  useEffect(() => {
    loadAll();
  }, []);

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
    setShowTambakForm(true);
  };
  const openEditTambak = (item) => {
    setEditTambakId(item.ID_Tambak);
    setTNama(item.Nama || '');
    setTSubstrat(item.Substrat || '');
    setTLat(item.Latitude != null ? String(item.Latitude) : '');
    setTLng(item.Longitude != null ? String(item.Longitude) : '');
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
    setUNama(''); setUEmail(''); setUPassword(''); setURole('USER'); setUTambakId(null);
    setShowUserForm(true);
  };
  const openEditUser = (u) => {
    setEditUserId(u.ID_User);
    setUNama(u.Nama || '');
    setUEmail(u.Email || '');
    setUPassword(''); // kosongkan
    setURole(u.Role || 'USER');
    setUTambakId(u.TB_Tambak?.ID_Tambak || null);
    setShowUserForm(true);
  };
  const submitUser = async () => {
    if (!uNama.trim() || !uEmail.trim()) return Alert.alert('Nama & Email wajib diisi');
    if (!editUserId && !uPassword.trim()) return Alert.alert('Password wajib untuk user baru');
    if (!uTambakId) return Alert.alert('Pilih tambak untuk user ini');

    const payload = {
      Nama: uNama.trim(),
      Email: uEmail.trim(),
      Role: uRole,
      ID_Tambak: uTambakId,
      ...(uPassword ? { Password: uPassword } : {}),
    };
    try {
      if (editUserId) await userApi.update(editUserId, payload);
      else await userApi.create(payload);
      setShowUserForm(false);
      loadAll();
    } catch (e) { Alert.alert('Gagal simpan user', e.message); }
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

  const renderUser = ({ item }) => (
    <View className="rounded-lg mb-4 bg-white overflow-hidden">
      <View className="p-4">
        <Text className="text-base font-bold text-gray-900">{item.Nama_tambak}</Text>
        <Text className="text-xs text-gray-600 mt-1">Role: {item.Role}</Text>
        <Text className="text-xs text-gray-600 mt-1">Tambak: {item.TB_Tambak?.Nama ?? '-'}</Text>
      </View>
      <View className="flex-row justify-end p-2 space-x-2" style={{ backgroundColor: '#EDF2FF' }}>
        <TouchableOpacity onPress={() => openEditUser(item)} className="bg-[#F2B84C] p-2 rounded-full mr-2">
          <Icon name="pencil" size={16} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => deleteUser(item.ID_User)} className="bg-[#E94343] p-2 rounded-full">
          <Icon name="trash" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  
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

      {/* List */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : activeTab === 'TAMBAK' ? (
        <FlatList
          data={tambaks}
          keyExtractor={(it) => String(it.ID_Tambak)}
          renderItem={renderTambak}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 80, paddingBottom: 150 }}
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
          ListEmptyComponent={
            <View className="items-center mt-20">
              <Text className="text-gray-500">Belum ada data tambak</Text>
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
      <TouchableOpacity
    
onPress={() => fillWithLocation(latField.onChange, lngField.onChange)}
        className="self-start bg-emerald-600 rounded-xl px-4 py-2 mb-3"
      >
        <Text className="text-white font-bold">Gunakan Lokasi</Text>
      </TouchableOpacity>

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


      {/* ===== Modal: Form User ===== */}
      <Modal visible={showUserForm} transparent animationType="slide" onRequestClose={() => setShowUserForm(false)}>
        <Pressable className="flex-1 bg-black/40 items-center justify-end" onPress={() => setShowUserForm(false)}>
          <Pressable className="w-full bg-white rounded-t-3xl p-6" onPress={() => { }}>
            <Text className="text-lg font-extrabold mb-4">{editUserId ? 'Edit User' : 'Tambah User'}</Text>

            <Text className="text-sm text-gray-700 mb-1">Nama</Text>
            <TextInput value={uNama} onChangeText={setUNama} placeholder="Nama user" className="border border-gray-300 rounded-xl px-3 py-2 mb-3" />

            <Text className="text-sm text-gray-700 mb-1">Email</Text>
            <TextInput value={uEmail} onChangeText={setUEmail} keyboardType="email-address" placeholder="email@domain.com" className="border border-gray-300 rounded-xl px-3 py-2 mb-3" />

            {!editUserId && (
              <>
                <Text className="text-sm text-gray-700 mb-1">Password</Text>
                <TextInput value={uPassword} onChangeText={setUPassword} secureTextEntry placeholder="******" className="border border-gray-300 rounded-xl px-3 py-2 mb-3" />
              </>
            )}

            <Text className="text-sm text-gray-700 mb-1">Role</Text>
            <View className="flex-row mb-3">
              {['USER', 'ADMIN'].map(r => (
                <TouchableOpacity key={r} onPress={() => setURole(r)} className={`px-4 py-2 rounded-full mr-2 ${uRole === r ? 'bg-blue-600' : 'bg-gray-200'}`}>
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


