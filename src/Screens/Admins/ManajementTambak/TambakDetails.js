import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { FishIcons } from '../../../Assets/Svg';
import WaveBackground from '../../../Utils/WaveBackground';

const Row = ({ label, value }) => (
  <View className="mb-4">
    <Text className="text-[16px] text-slate-900">
      {label} <Text className="font-bold text-slate-900">{value ?? '-'}</Text>
    </Text>
  </View>
);

const TambakDetail = ({ route, navigation }) => {
  const tambak = route?.params?.tambak ?? {};

  const goPerangkatDetail = () => {
  const perangkatObj = {
    ID_Perangkat: tambak?.ID_Perangkat ?? null,
    Nama_LokasiPerangkat: tambak?.PerangkatTerhubung ?? null,
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

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* wave atas */}
      <View className="absolute left-0 right-0 mt-32" pointerEvents="none">
        <WaveBackground />
      </View>

      {/* tombol back kiri atas */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        className={`absolute left-4 z-10 flex-row items-center ${Platform.OS === 'ios' ? 'top-2' : 'top-20'}`}
      >
        <Icon name="arrow-back" size={24} color="#111827" />
        <Text className="ml-2 text-[18px] text-slate-900">kembali</Text>
      </TouchableOpacity>

      {/* icon bulat + judul */}
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

      {/* detail fields */}
      <View className="px-6 mt-8">
        <Row label="Substract :" value={tambak?.Substrat ?? '-'} />
    
        <Row
          label="Latitude :"
          value={typeof tambak?.Latitude === 'number' ? tambak.Latitude.toFixed(5) : '-'}
        />
        <Row
          label="Longitude :"
          value={typeof tambak?.Longitude === 'number' ? tambak.Longitude.toFixed(5) : '-'}
        />  
       <View className="mt-16">
        <Row label="Perangkat Terhubung :" value={tambak?.PerangkatTerhubung ?? '-'} />
        <Row label="Status Perangkat :" value={tambak?.StatusPerangkat ?? '-'} />
        </View>
      </View>

      {/* tombol cek perangkat */}
      <View className="items-center mt-4">
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {}}
          className="bg-[#67A9F3] px-6 py-3 rounded-xl shadow"
          style={{ shadowOpacity: 0.15, shadowRadius: 6, shadowColor: '#000', elevation: 3 }}
        >
          <Text className="text-white font-extrabold text-[16px]">Cek Perangkat</Text>
        </TouchableOpacity>
      </View>

      {/* spacer biar gak ketutup bottom tab custom */}
      <View className="h-[120px]" />
    </SafeAreaView>
  );
};

export default TambakDetail;
