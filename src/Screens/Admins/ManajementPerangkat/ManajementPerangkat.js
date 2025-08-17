import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import WaveBackground from '../../../Utils/WaveBackground';
import Icon from 'react-native-vector-icons/Ionicons';
import { PeralatanIcons } from '../../../Assets/Svg';
import { tambakWithPerangkat, dummyPerangkatList, dummyTambakList } from '../../../Data/Tambak';
import { useNavigation } from '@react-navigation/native';


const ManajementPerangkat = () => {

  const renderItem = ({ item , index}) => (
    <View
      className="flex-row rounded-lg mb-4 overflow-hidden"
      style={{
      backgroundColor: item.Status === 'Aktif' ? '#69B76F' : '#B02E30', // ganti warna
        borderRadius: 12,
      }}
    >
      {/* Icon dan Nama */}
      <View
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          width: 80,
          paddingVertical: 16,
        }}
      >
        <PeralatanIcons color="#fff" />
        <Text
          style={{
            color: '#fff',
            fontSize: 12,
            marginTop: 8,
          }}
        >
          {item.Status}
        </Text>
      </View>
  
      {/* Detail */}
      <View
        style={{
          flex: 1,
          backgroundColor: '#fff',
          padding: 0,
          justifyContent: 'space-between',
          borderTopRightRadius: 12,
          borderBottomRightRadius: 12,
        }}
      >
        {/* Labels */}
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 12, color: '#333' }}>
            ID_Tambak: {item.ID_Perangkat}
          </Text>
          <Text style={{ fontSize: 12, color: '#333', marginTop: 4 }}>
            Tambak: {item.Nama}
          </Text>
          <Text style={{ fontSize: 12, color: '#333', marginTop: 4 }}>
            Lokasi: {item.Nama_LokasiPerangkat}
          </Text>
        </View>
  
        {/* Action Buttons */}
        <View className='p-2'
          style={{
            flexDirection: 'row',
            justifyContent: 'space-evenly',
            marginTop: 8,
            width: '100%',
            backgroundColor: '#5176AF',
          }}
        >
          <TouchableOpacity
            onPress={() => navigation.navigate('PerangkatDetail', { perangkat: item })}
            style={{
              backgroundColor: '#68C07F',
              padding: 8,
              borderRadius: 50,
              marginLeft: 8,
            }}
          >
            <Icon name="eye" size={16} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
           onPress={() => {
              console.log('=== EDIT CLICKED ===');
              console.log('Index:', index);
              console.log('Item:', item);
              console.log('ID_Perangkat:', item.ID_Perangkat);
              console.log('Data list (length):', tambakWithPerangkat.length);
              // kalau mau liat seluruh list, hati-hati panjang:
              // console.log('Full list:', tambakWithPerangkat);
            }}
            style={{
              backgroundColor: '#F2B84C',
              padding: 8,
              borderRadius: 50,
              marginLeft: 8,
            }}
          >
            <Icon name="pencil" size={16} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              backgroundColor: '#E94343',
              padding: 8,
              borderRadius: 50,
              marginLeft: 8,
            }}
          >
            <Icon name="trash" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
  
  const navigation = useNavigation();
 
  return (
    <View className="flex-1 bg-white relative pt-0">
       {/* Header */}
       <View className="p-4 mt-10">
        <Text className="text-2xl font-bold text-gray-900">Perangkat IoT</Text>
      </View>
       <View className="p-4 bottom-10">
       {/* Background */}
       <WaveBackground className="absolute left-0 right-0 bottom-0 "  />
      </View>


      {/* List Tambak */}
      <FlatList
        data={tambakWithPerangkat}
        keyExtractor={(item) => item.ID_Tambak.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 80, paddingBottom: 150 }}
      />

      {/* Floating Button */}
      <TouchableOpacity
        className="absolute bottom-24 right-6 bg-blue-600 p-4 rounded-full shadow-lg"
        onPress={() => console.log('Tambah Perangkat')}
      >
        <Icon name="add" size={24} color="#fff" />
      </TouchableOpacity>

     
    </View>
  );
};

export default ManajementPerangkat;
