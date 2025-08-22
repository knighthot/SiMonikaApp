import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, KeyboardAvoidingView, TextInput, ActivityIndicator, Alert } from 'react-native';
import WaveBackground from '../../../Utils/WaveBackground';
import Icon from 'react-native-vector-icons/Ionicons';
import { PeralatanIcons } from '../../../Assets/Svg';
import { tambakWithPerangkat, dummyPerangkatList, dummyTambakList } from '../../../Data/Tambak';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { listPerangkat, createPerangkat, updatePerangkat, deletePerangkat } from '../../../api';



const ManajementPerangkat = () => {

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // row yang di-edit atau null
  const [form, setForm] = useState({ ID_PerangkatIot: '', Nama_LokasiPerangkat: '' });
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState([]);
  useEffect(() => {
    let on = true;
    (async () => {
      const res = await api.get('/perangkat?page=1&limit=50');
      if (!on) return;
      setData(res.data.rows ?? []);
    })();
    const t = setInterval(() => {/* refresh berkala */ }, 5000);
    return () => { on = false; clearInterval(t); };
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const data = await listPerangkat({ page: 1, limit: 100 });
      setRows(data?.rows || data?.data || data || []);
    } catch (e) {
      Alert.alert('Gagal memuat', e.message);
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(React.useCallback(() => { refresh(); }, []));

  function openAdd() {
    setEditing(null);
    setForm({ ID_PerangkatIot: '', Nama_LokasiPerangkat: '' });
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({
      ID_PerangkatIot: item.ID_PerangkatIot,
      Nama_LokasiPerangkat: item.Nama_LokasiPerangkat,
    });
    setModalOpen(true);
  }

  async function onSubmit() {
    if (!form.ID_PerangkatIot?.trim() || !form.Nama_LokasiPerangkat?.trim()) {
      Alert.alert('Validasi', 'Semua field wajib diisi.');
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        await updatePerangkat(editing.ID_Perangkat, form);
      } else {
        await createPerangkat(form);
      }
      setModalOpen(false);
      await refresh();
    } catch (e) {
      Alert.alert(editing ? 'Gagal update' : 'Gagal menambah', e.message);
    } finally {
      setSubmitting(false);
    }
  }

  function onDelete(item) {
    Alert.alert('Hapus perangkat', `Yakin ingin menghapus perangkat ini?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive', onPress: async () => {
          try {
            await deletePerangkat(item.ID_Perangkat);
            await refresh();
          } catch (e) {
            Alert.alert('Gagal hapus', e.message);
          }
        }
      }
    ]);
  }

  const renderItem = ({ item }) => {
    const aktif = item.Status === 'Aktif';
    return (
      <View className="flex-row rounded-2xl mb-4 overflow-hidden" style={{ backgroundColor: aktif ? '#69B76F' : '#B02E30' }}>
        {/* Icon + status */}
        <View style={{ justifyContent: 'center', alignItems: 'center', width: 84, paddingVertical: 16 }}>
          <PeralatanIcons color="#fff" />
          <Text style={{ color: '#fff', fontSize: 12, marginTop: 8 }}>{item.Status}</Text>
        </View>

        {/* Detail */}
        <View style={{ flex: 1, backgroundColor: '#fff', borderTopRightRadius: 12, borderBottomRightRadius: 12 }}>
          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 12, color: '#333', marginTop: 4 }}>ID Perangkat IoT: {item.ID_PerangkatIot}</Text>
            <Text style={{ fontSize: 12, color: '#333', marginTop: 4 }}>Lokasi: {item.Nama_LokasiPerangkat}</Text>
            {item.LastSeenAt && (
              <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                Terakhir aktif: {new Date(item.LastSeenAt).toLocaleString()}
              </Text>
            )}
          </View>

          {/* Actions */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', backgroundColor: '#5176AF', paddingVertical: 8 }}>
            <TouchableOpacity onPress={() => navigation.navigate('PerangkatDetail', { perangkat: { ID_Perangkat: item.ID_Perangkat } })}
              style={{ backgroundColor: '#68C07F', padding: 8, borderRadius: 50 }}>
              <Icon name="eye" size={16} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => openEdit(item)} style={{ backgroundColor: '#F2B84C', padding: 8, borderRadius: 50 }}>
              <Icon name="pencil" size={16} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(item)} style={{ backgroundColor: '#E94343', padding: 8, borderRadius: 50 }}>
              <Icon name="trash" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const navigation = useNavigation();

  return (
    <View className="flex-1 bg-white relative pt-0">
      {/* Header */}
      <View className="p-4 mt-10">
        <Text className="text-2xl font-bold text-gray-900">Perangkat IoT</Text>
      </View>
      <View className="p-4 bottom-10">
        {/* Background */}
        <WaveBackground className="absolute left-0 right-0 bottom-0 " />
      </View>


      {/* List Tambak */}
      <FlatList
        data={rows}
        keyExtractor={(it) => it.ID_Perangkat}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 150, paddingTop: 60 }}
      />

      {/* Floating Button */}
      <TouchableOpacity className="absolute bottom-24 right-6 bg-blue-600 p-4 rounded-full shadow-lg" onPress={openAdd}>
        <Icon name="add" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Modal Tambah/Edit */}
      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', paddingHorizontal: 16 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#1B3551', marginBottom: 8 }}>
              {editing ? 'Edit Perangkat' : 'Tambah Perangkat'}
            </Text>

            <Text style={{ color: '#334' }}>ID Perangkat IoT</Text>
            <TextInput
              value={form.ID_PerangkatIot}
              onChangeText={(v) => setForm((s) => ({ ...s, ID_PerangkatIot: v }))}
              placeholder="mis. ESP32-ABC123"
              placeholderTextColor="#9AA3B2"
              style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 6, marginBottom: 12 }}
              editable={!submitting}
            />

            <Text style={{ color: '#334' }}>Nama / Lokasi</Text>
            <TextInput
              value={form.Nama_LokasiPerangkat}
              onChangeText={(v) => setForm((s) => ({ ...s, Nama_LokasiPerangkat: v }))}
              placeholder="mis. Kolam A - Pojok Barat"
              placeholderTextColor="#9AA3B2"
              style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 6, marginBottom: 16 }}
              editable={!submitting}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={() => setModalOpen(false)} disabled={submitting} style={{ paddingVertical: 10, paddingHorizontal: 14, marginRight: 8 }}>
                <Text style={{ color: '#6B7280', fontWeight: '700' }}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onSubmit} disabled={submitting} style={{ paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#4F72A8', borderRadius: 10 }}>
                <Text style={{ color: 'white', fontWeight: '800' }}>{submitting ? 'Menyimpan…' : (editing ? 'Simpan' : 'Tambah')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
};

export default ManajementPerangkat;
