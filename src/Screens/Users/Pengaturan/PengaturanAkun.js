import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { FishIcons, SupportIcons } from '../../../Assets/Svg';
import WaveBackground from '../../../Utils/WaveBackground';

const Row = ({ label, value }) => (
  <View className="mb-5">
    <Text className="text-[16px] text-slate-900">
      {label}{' '}
      <Text className="font-extrabold text-slate-900">
        {value ?? '-'}
      </Text>
    </Text>
  </View>
);

const PengaturanAkun = ({ route, navigation }) => {
  const tambak = route?.params?.tambak ?? {};

  const onPengaturanAkun = () => {
    // TODO: arahkan ke screen pengaturan akun user/tambak
    // navigation.navigate('PengaturanAkun', { id: tambak?.ID_Tambak });
  };

  const onCekPerangkat = () => {
    // TODO: arahkan ke detail perangkat
    // navigation.navigate('PerangkatDetail', { id: tambak?.ID_Perangkat });
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Gelombang biru di atas */}
      <View className="absolute left-0 right-0 mt-32" pointerEvents="none">
        <WaveBackground />
      </View>

      {/* Back kiri atas */}
     

      {/* Icon bulat + judul */}
      <View className="items-center mt-36">
        <View className="w-[133px] h-[131px] rounded-full items-center justify-center bg-[#4E71A6]">
          <FishIcons color="#fff" width={61} height={61} />
        </View>

        <Text className="mt-4 text-[36px] font-extrabold text-slate-900">
          {tambak?.Nama ?? 'Tambak 1'}
        </Text>
        <Text className="mt-1 text-[14px] text-slate-600">
          {tambak?.ID_Perangkat ?? '1u2892y98'}
        </Text>
      </View>

      {/* Detail fields */}
      <View className="px-6 mt-8">
        <Row label="Substract :" value={tambak?.Substrat ?? '-'} />

        <Row
          label="Latitude :"
          value={
            typeof tambak?.Latitude === 'number'
              ? tambak.Latitude.toFixed(5)
              : '-'
          }
        />
        <Row
          label="Longitude :"
          value={
            typeof tambak?.Longitude === 'number'
              ? tambak.Longitude.toFixed(5)
              : '-'
          }
        />

        <View className="mt-8">
          <Row
            label="Perangkat Terhubung :"
            value={tambak?.PerangkatTerhubung ?? '-'}
          />
          <Row
            label="Status Perangkat :"
            value={tambak?.StatusPerangkat ?? '-'}
          />
        </View>
      </View>

      {/* Dua tombol bawah: Pengaturan Akun & Cek Perangkat */}
      <View className="px-6 mt-6 flex-row justify-between">
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onPengaturanAkun}
          className="bg-[#67A9F3] rounded-2xl px-5 py-3 w-[45%] items-center"
          style={{
            shadowOpacity: 0.2,
            shadowRadius: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            elevation: 5,
          }}
        >
          <Text className="text-white font-extrabold text-[14px]">
            Pengaturan Akun
          </Text>
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
          <Text className="text-white font-extrabold text-[14px]">
            Cek Perangkat
          </Text>
        </TouchableOpacity>
      </View>

      {/* Badge “Panduan Edit” kanan-bawah */}
      <TouchableOpacity 
      onPress={() => navigation.navigate('OnboardingPengaturanAkun')}
      className="absolute right-6 bottom-28 items-center">
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
         <SupportIcons/>
        </View>
        <Text className="mt-2 text-[12px] text-slate-900 font-semibold">
          Panduan Edit
        </Text>
      </TouchableOpacity>

      {/* Spacer agar tidak ketutup custom bottom tab */}
      <View className="h-[120px]" />
    </SafeAreaView>
  );
};

export default PengaturanAkun;
