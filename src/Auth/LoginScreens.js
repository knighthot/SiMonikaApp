import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { LinearGradient } from 'react-native-linear-gradient';
import "../../global.css"
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';
import { apiLogin } from '../api'; // sesuaikan path
import { resetToRoleDeferred } from '../Navigations/navigationService';


const LoginScreen = ({ onLogin }) => {
  const navigation = useNavigation();

    const [username, setUsername] = useState(''); // backend expects Nama_tambak
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const BASE_URL = (Config.API_BASE_URL|| 'http://192.168.1.8:3006')
  async function handleLogin() {
    if (!username || !password) {
      Alert.alert('Lengkapi', 'Username dan password wajib diisi.');
      return;
    }
    try {
      setLoading(true);
      const data = await apiLogin(username, password); // <-- pakai helper
      const role = (data?.user?.role || 'USER').toUpperCase();
  onLogin(role);                 // update state di RootNavigator
  resetToRoleDeferred(role);     // tunda reset sampai navigator siap (ops
    } catch (e) {
      Alert.alert('Login gagal', e.message);
    } finally {
      setLoading(false);
    }
  }


  return (
    <View className="flex-1 bg-[#D2F8FF] items-center justify-start pt-20">

<Text
  className="text-xl font-bold text-black absolute left-5 top-10 z-10"
  style={{ fontFamily: 'Outfit-Bold' }}
>
  SiMonika
</Text>

      {/* Lingkaran Gradasi */}
      
      <View
        style={{
          position: 'absolute',
          top: -270,
          width: 539,
          height: 539,
          borderRadius: 539 / 2,
          overflow: 'hidden',
        }}
      >
       <LinearGradient
  colors={['#7BD1E0', '#FFFCFC']}
  start={{ x: 0.5, y: -0.3 }}
  end={{ x: 0.5, y: 1 }}
  locations={[0.5, 1]} // biru tetap hingga 40%, lalu pelan ke putih
  style={{ width: 539, height: 539 }}
/>
      </View>

<View className='items-center h-1/3 mt-10'>
      {/* Judul */}
      <Text
        className="text-3xl font-bold text-black"
        style={{ fontFamily: 'Outfit-Bold' }}
      >
        Masuk
      </Text>
      <Text
        className="text-sm text-black mt-2 text-center"
        style={{ fontFamily: 'Inter-Regular' }}
      >
        Selamat Datang Di Aplikasi{'\n'}SiMonika
      </Text>
</View>

      {/* Card Form */}
      <View className="bg-white w-11/12 mt-10 p-5 rounded-2xl shadow flex">
        {/* Username */}
        <Text
          className="text-sm text-[#5686BF] mb-1"
          style={{ fontFamily: 'Inter-SemiBold' }}
        >
          Username
        </Text>
        <View className="flex-row items-center border border-gray-300 rounded-xl px-3 mb-4">
          <Icon name="user" size={18} color="#aaa" />
          <TextInput
             className="flex-1 ml-2 h-10 text-black"
            placeholder="Masukkan username"
            placeholderTextColor="#999"
            style={{ fontFamily: 'Inter-Regular' }}
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
            returnKeyType="next"
          />
        </View>

        {/* Password */}
        <Text
          className="text-sm text-[#5686BF] mb-1"
          style={{ fontFamily: 'Inter-SemiBold' }}
        >
          Password
        </Text>
        <View className="flex-row items-center border border-gray-300 rounded-xl px-3 mb-6">
          <Icon name="lock" size={18} color="#aaa" />
          <TextInput
            className="flex-1 ml-2 h-10 text-black"
            placeholder="Masukkan password"
            placeholderTextColor="#999"
            secureTextEntry
            style={{ fontFamily: 'Inter-Regular' }}
            autoCapitalize="none"
            value={password}
            onChangeText={setPassword}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />
        </View>

        {/* Tombol Masuk */}
 <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          className={`py-3 rounded-lg mb-10 ${loading ? 'bg-[#8fb1d8]' : 'bg-[#5686BF]'}`}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-center text-base" style={{ fontFamily: 'Outfit-Medium' }}>
              Masuk
            </Text>
          )}
        </TouchableOpacity>

      </View>
    </View>
  );
};

export default LoginScreen;
