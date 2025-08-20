import React, { useRef, useState } from 'react';
import {
  SafeAreaView, View, Text, TouchableOpacity, FlatList, Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import WaveBackground from '../../../Utils/WaveBackground';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    key: 'edit',
    title: 'Edit Akun',
    desc:
      'Ubah nama tambak, substrat, serta titik koordinat (latitude & longitude). Pastikan data sesuai lokasi.',
    icon: 'settings-outline',
  },
  {
    key: 'device',
    title: 'Cek Perangkat',
    desc:
      'Pantau perangkat yang terhubung. Lihat status sensor dan koneksi sebelum menyimpan perubahan.',
    icon: 'hardware-chip-outline',
  },
  {
    key: 'save',
    title: 'Simpan & Selesai',
    desc:
      'Tekan tombol Simpan untuk menerapkan perubahan. Kamu bisa kembali kapan saja untuk memperbarui.',
    icon: 'checkmark-done-outline',
  },
];

export default function OnboardingPengaturanAkun({ navigation }) {
  const [index, setIndex] = useState(0);
  const listRef = useRef(null);

  const goNext = () => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      onDone();
    }
  };

  const onDone = async () => {
    await AsyncStorage.setItem('onboard_settings_seen', '1');
    navigation.replace('PengaturanAkun'); // langsung masuk halaman pengaturan
  };

  const onSkip = async () => {
    await AsyncStorage.setItem('onboard_settings_seen', '1');
    navigation.replace('PengaturanAkun');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* wave latar agar nyambung dengan tema kamu */}
      <View style={{ position: 'absolute', left: 0, right: 0, top: 120 }} pointerEvents="none">
        <WaveBackground />
      </View>

      {/* Header: tombol skip */}
      <View style={{ paddingHorizontal: 16, paddingTop: 10, flexDirection: 'row' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="arrow-back" size={24} color="#1B3551" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onSkip} style={{ marginLeft: 'auto' }}>
          <Text style={{ color: '#4F72A8', fontWeight: '700' }}>Lewati</Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(it) => it.key}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / width);
          setIndex(i);
        }}
        renderItem={({ item }) => (
          <View style={{ width, paddingHorizontal: 24, paddingTop: 80 }}>
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <View style={{
                width: 120, height: 120, borderRadius: 60,
                backgroundColor: '#4F72A8', alignItems: 'center', justifyContent: 'center'
              }}>
                <Icon name={item.icon} size={56} color="#fff" />
              </View>
            </View>
            <Text style={{ fontSize: 28, fontWeight: '800', color: '#1B3551', textAlign: 'center' }}>
              {item.title}
            </Text>
            <Text style={{ fontSize: 16, lineHeight: 22, color: '#334155', textAlign: 'center', marginTop: 12 }}>
              {item.desc}
            </Text>
          </View>
        )}
      />

      {/* Dots + Next/Done */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 16 }}>
          {SLIDES.map((s, i) => (
            <View
              key={s.key}
              style={{
                width: i === index ? 22 : 8,
                height: 8,
                borderRadius: 4,
                marginHorizontal: 4,
                backgroundColor: i === index ? '#4F72A8' : '#C7D2FE',
              }}
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={goNext}
          activeOpacity={0.9}
          style={{
            backgroundColor: '#4F72A8',
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
            {index < SLIDES.length - 1 ? 'Lanjut' : 'Mulai'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
