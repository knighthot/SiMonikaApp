// RootNavigator.js
import React, { useEffect, useState, useRef } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import SplashScreen from '../Screens/SplashScreens/SplashScreens';
import LoginScreen from '../Auth/LoginScreens';
import AdminTabs from './AdminTabNavigator';
import UserTabs from './UserTabNavigator';
import TambakDetail from '../Screens/Admins/ManajementTambak/TambakDetails';
import PerangkatDetail from '../Screens/Admins/ManajementPerangkat/PerangkatDetail';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const [hydrated, setHydrated] = useState(false); // boot selesai?
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState(null); // "ADMIN" | "USER"

  // durasi minimum Splash biar nggak flicker
  const MIN_SPLASH_MS = 6000;
  const startRef = useRef(Date.now());

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        const userStr = await AsyncStorage.getItem('auth_user');
        const r = userStr ? (JSON.parse(userStr)?.role ?? null) : null;
        setIsLoggedIn(!!token);
        setRole(r);
      } finally {
        // jaga splash minimal MIN_SPLASH_MS
        const elapsed = Date.now() - startRef.current;
        const wait = Math.max(0, MIN_SPLASH_MS - elapsed);
        setTimeout(() => setHydrated(true), wait);
      }
    })();
  }, []);

  // selama boot, tampilkan Splash penuh (navigator belum di-mount)
  if (!hydrated) {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Login SELALU terdaftar supaya reset ke Login selalu valid */}
      <Stack.Screen name="Login">
        {(props) => (
          <LoginScreen
            {...props}
            onLogin={(userRole) => {
              const normalized = (userRole === 'ADMIN') ? 'ADMIN' : 'USER';
              setIsLoggedIn(true);
              setRole(normalized);
              props.navigation.reset({
                index: 0,
                routes: [{ name: normalized === 'ADMIN' ? 'Admin' : 'User' }],
              });
            }}
          />
        )}
      </Stack.Screen>

      {/* Hanya satu root sesuai role, ini mencegah “kepotong” */}
      {isLoggedIn && role === 'ADMIN' && (
        <Stack.Screen name="Admin" component={AdminTabs} />
      )}
      {isLoggedIn && role !== 'ADMIN' && (
        <Stack.Screen name="User" component={UserTabs} />
      )}

      {/* Shared detail screens */}
      <Stack.Screen name="TambakDetail" component={TambakDetail} />
      <Stack.Screen name="PerangkatDetail" component={PerangkatDetail} />
    </Stack.Navigator>
  );
}
