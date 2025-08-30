// src/Screens/Users/Menu/MenuScreen.js
import React from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { resetToLogin } from '../../Navigations/navigationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Item = ({
  title,
  color = '#4F72A8',
  icon = 'chevron-forward',
  width = '70%',            // lebar tombol (persen)
  onPress,
}) => (
  <TouchableOpacity
    activeOpacity={0.9}
    onPress={onPress}
    className="rounded-2xl px-5 py-4 mt-8 self-start" // ⬅️ self-start = rata kiri
    style={[styles.btnShadow, { backgroundColor: color, width, marginLeft: 24 }]} // ⬅️ jarak kiri
  >
    <View className="flex-row items-center justify-between">
      <Text className="text-white text-[22px] font-extrabold">{title}</Text>
      <Icon name={icon} size={18} color="#fff" />
    </View>
  </TouchableOpacity>
);


const Menu = ({ navigation: navFromProps }) => {
  const navigation = useNavigation();

  const doResetToLogin = () => {
    // 1) kalau punya navRef (navigationService), pakai ini — paling aman ke root
    if (typeof resetToLogin === 'function') {
      resetToLogin();
      return;
    }
    // 2) fallback: reset dari navigator terdekat ke route 'Login'
    const rootNav = navigation.getParent?.()?.getParent?.() ?? navFromProps ?? navigation;
    rootNav.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      })
    );
  };

  const goPengaturanAkun = async () => {
    const seen = await AsyncStorage.getItem('onboard_settings_seen');
    if (seen === '1') {
      navigation.navigate('Menu', { screen: 'PengaturanAkun' });
    } else {
      navigation.navigate('Menu', { screen: 'OnboardingPengaturanAkun' });
    }
  };

  const doLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['auth_token', 'auth_user']);
    } catch { }
    doResetToLogin();
  };

  const onLogout = () =>
    Alert.alert('Keluar', 'Anda yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: doLogout },
    ]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1">
        {/* Judul di TENGAH */}
        <Text className="text-[64px] font-extrabold text-[#1B3551] text-center mt-52 mb-4">
          Menu
        </Text>

        {/* Tombol RATA KIRI */}
        <Item
          title="History Ramalan Air"
          icon="time-outline"
          onPress={() => navigation.navigate?.('HistoryPeramalan')}
        />

        <Item
          title="Pengaturan Akun"
          icon="settings-outline"
          onPress={goPengaturanAkun}
        />

        {/* tombol keluar lebih pendek & merah */}
        <Item
          title="Keluar"
          color="#B83434"
          icon="log-out-outline"
          width="55%"
          onPress={onLogout}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  btnShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
});

export default Menu;
