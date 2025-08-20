// Navigations/RootNavigator.js
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
  const [hydrated, setHydrated] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState(null); // 'ADMIN' | 'USER'

  // Splash minimal supaya tidak “kepotong”
  const MIN_SPLASH_MS = 6000;
  const t0Ref = useRef(Date.now());

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        const userStr = await AsyncStorage.getItem('auth_user');
        const r = userStr ? (JSON.parse(userStr)?.role ?? null) : null;
        setIsLoggedIn(!!token);
        setRole(r);
      } finally {
        const dt = Date.now() - t0Ref.current;
        const wait = Math.max(0, MIN_SPLASH_MS - dt);
        setTimeout(() => setHydrated(true), wait);
      }
    })();
  }, []);

  if (!hydrated) return <SplashScreen />;

  const initialRouteName = !isLoggedIn ? 'Login' : (role === 'ADMIN' ? 'Admin' : 'User');

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRouteName}>
      {/* Login SELALU ada */}
      <Stack.Screen name="Login">
        {(props) => (
          <LoginScreen
            {...props}
            onLogin={(userRole) => {
              const normalized = (userRole === 'ADMIN') ? 'ADMIN' : 'USER';
              setIsLoggedIn(true);
              setRole(normalized);
              // aman karena 'Admin' & 'User' SELALU terdaftar
              props.navigation.reset({
                index: 0,
                routes: [{ name: normalized === 'ADMIN' ? 'Admin' : 'User' }],
              });
            }}
          />
        )}
      </Stack.Screen>

      {/* Kedua root tab SELALU terdaftar (aman untuk reset) */}
      <Stack.Screen name="Admin" component={AdminTabs} />
      <Stack.Screen name="User"  component={UserTabs} />

      {/* Shared detail screens */}
      <Stack.Screen name="TambakDetail" component={TambakDetail} />
      <Stack.Screen name="PerangkatDetail" component={PerangkatDetail} />
    </Stack.Navigator>
  );
}
