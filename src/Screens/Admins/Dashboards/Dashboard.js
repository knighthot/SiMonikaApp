import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions, Image,StyleSheet,StatusBar,} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import { dummyTambakList, penerimaTambak } from '../../../Data/Tambak';
import { Tambak, Reciver, Logo } from '../../../Assets/Image/Index';
import lightMapStyle from '../../../Utils/customMapStyle';
import Icon from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import "../../../../global.css"
const { width, height } = Dimensions.get('window');
import { resetToLogin } from '../../../Navigations/navigationService';


const AdminDashboardScreen = () => {
  const navigation = useNavigation()
  const [isOn, setIsOn] = useState(false);
  const [selectedTambak, setSelectedTambak] = useState(null);
  const mapRef = React.useRef(null);

 const handleLogout = async () => {
await AsyncStorage.multiRemove(['auth_token', 'auth_user']);
resetToLogin();
  };

  const penerimaPos = {
    latitude: penerimaTambak.Latitude,
    longitude: penerimaTambak.Longitude,
  };

  return (
    <View className="flex-1">
   <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      <MapView
         ref={mapRef} // harus langsung ke MapView
        provider="google"
        userInterfaceStyle="light"
        style={{ ...StyleSheet.absoluteFillObject }}
        customMapStyle={lightMapStyle}
        initialRegion={{
          ...penerimaPos,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {isOn && (
          <Circle
            center={penerimaPos}
            radius={500}
            fillColor="rgba(59,130,246,0.2)"
            strokeColor="rgba(59,130,246,0.6)"
          />
        )}

        <Marker
          coordinate={penerimaPos}
          image={Reciver}
          title={penerimaTambak.Nama}
          description={penerimaTambak.keterangan}
          onPress={() => setSelectedTambak(penerimaTambak)}
        />

        {dummyTambakList.map((tambak) => (
          <Marker
            key={tambak.ID_Tambak}
            coordinate={{
              latitude: tambak.Latitude,
              longitude: tambak.Longitude,
            }}
            image={Tambak}
            title={tambak.Nama}
            description={tambak.keterangan}
            onPress={() => setSelectedTambak(tambak)}
          />
        ))}
      </MapView>

      {/* Header */}
      <View className="absolute top-10 left-5 bg-blue-500 rounded-xl px-4 py-2 flex-row items-center space-x-2 z-10 w-[90%] h-20">
        <View className='bg-white rounded-full p-1'>
              <Image source={Logo} className="w-10 h-10" resizeMode="contain" />
        </View>
    
        <Text className="text-white font-bold text-xl pl-2">Simonika{'\n'}Welcome Admin !!</Text>

           <TouchableOpacity
           onPress={handleLogout}
            className="ml-auto bg-white/15 border border-white/30 px-3 py-2 rounded-lg flex-row items-center"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="log-out" size={16} color="#fff" />
            <Text className="text-white font-semibold ml-2">Keluar</Text>
          </TouchableOpacity>
      </View>

      {/* Toggle */}
      <TouchableOpacity
        onPress={() => setIsOn(!isOn)}
        className={`absolute z-10 right-5 w-[50px] h-[80px] rounded-xl justify-center items-center ${
          isOn ? 'bg-green-700' : 'bg-red-800'
        }`}
        style={{ top: height / 2 - 40 }} // <- pakai style biasa di sini
      >
        <Text className="text-white font-bold">{isOn ? 'On' : 'Off'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
  onPress={() => {
    mapRef.current?.animateToRegion(
      {
        ...penerimaPos,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      1000 // durasi animasi dalam ms
    );
  }}
  className="absolute z-10 right-5 w-[50px] h-[80px] rounded-xl justify-center items-center bg-blue-600"
  style={{ top: height / 2 + 50 }} // di bawah tombol On/Off
>
  <Text className="text-white font-bold text-xs text-center">Fokus</Text>
</TouchableOpacity>


      {/* Detail Card */}
      {selectedTambak && (
  <View
    className="absolute bottom-5 self-center bg-white rounded-2xl w-[90%] p-4 shadow-lg mb-20"
    style={{ elevation: 5 }}
  >
    <View className="flex-row justify-between items-start">
      <View>
        <Text className="text-xl font-bold text-blue-500">
          {selectedTambak.Nama}
        </Text>
        <Text className="text-sm font-semibold text-blue-400 mt-1">
          Lokasi :
        </Text>
        <Text className="text-sm font-semibold text-blue-400 mt-1">
          Subtract :
        </Text>
      </View>

      <View className="items-center">
        <View className="w-14 h-14 rounded-full bg-green-300" />
        <Text className="text-xs text-green-600 font-semibold mt-1">
          Perangkat Terhubung
        </Text>
      </View>
    </View>

    <TouchableOpacity className="bg-blue-400 mt-4 px-4 py-2 rounded-xl self-center shadow">
      <Text className="text-white font-semibold text-sm">Cek Detail</Text>
    </TouchableOpacity>
  </View>
)}

    </View>
  );
};

export default AdminDashboardScreen;
