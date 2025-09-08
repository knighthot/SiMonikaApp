// Navigations/RootNavigator.js
import React, { useEffect, useState, useRef } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ChartFullScreen from '../Screens/Users/History/HistoryPeramalan';
import SplashScreen from '../Screens/SplashScreens/SplashScreens';
import LoginScreen from '../Auth/LoginScreens';
import AdminTabs from './AdminTabNavigator';
import UserTabs from './UserTabNavigator';
import { subscribeUserTopics, unsubscribeUserTopics } from '../notifications/push';

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

            onLogin={async (user) => {
              const normalized = (user.role === 'ADMIN') ? 'ADMIN' : 'USER';
              await AsyncStorage.setItem('auth_user', JSON.stringify(user));
              // SUBSCRIBE TOPIC PER-USER
              await subscribeUserTopics(user.ID_User, user.lokasiIds || []);
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
      <Stack.Screen name="ChartFull" component={ChartFullScreen} options={{ headerShown: false }} />
      {/* Kedua root tab SELALU terdaftar (aman untuk reset) */}
      <Stack.Screen name="Admin" component={AdminTabs} />
      <Stack.Screen name="User" component={UserTabs} />


    </Stack.Navigator>
  );
}
