import { NavigationContainer } from '@react-navigation/native';
import { navRef } from './src/Navigations/navigationService';
import RootNavigator from './src/Navigations/RootNavigator';
import { initPush, attachForegroundHandlers, detachForegroundHandlers } from './src/notifications/push';
import React, { useEffect } from 'react';
import notifee from '@notifee/react-native';

export default function App() {
  useEffect(() => {
    // init permission + channel
    initPush();

    // handler notif saat app foreground
    attachForegroundHandlers({
      onNavigate: (screen, params) => {
        if (navRef.isReady()) navRef.navigate(screen, params);
      }
    });

    // jika app dibuka dari notif (cold-start)
    (async () => {
      const initial = await notifee.getInitialNotification();
      if (initial && navRef.isReady()) {
        const d = initial.notification?.data || {};
        // arahkan sesuai tipe yang kamu pakai di push.js
        if (d.type === 'SENSOR_ISSUE') navRef.navigate('SensorDetail', { perangkatNama: d.perangkatNama });
        else if (String(d.type || '').startsWith('FORECAST_')) navRef.navigate('ForecastDetail', { lokasiNama: d.lokasiNama });
      }
    })();

    return () => detachForegroundHandlers();
  }, []);

  return (
    <NavigationContainer ref={navRef}>
      <RootNavigator />
    </NavigationContainer>
  );
}
