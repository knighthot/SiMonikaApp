import React, { useState, useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from '../Screens/SplashScreens/SplashScreens';
import LoginScreen from '../Auth/LoginScreens';
import AdminTabs from './AdminTabNavigator';
import ManajementTambak from '../Screens/Admins/ManajementTambak/ManajementTambak';
import UserTabs from './UserTabNavigator';
import Dashboard from '../Screens/Admins/Dashboards/Dashboard';
import TambakDetail from '../Screens/Admins/ManajementTambak/TambakDetails';
import PerangkatDetail from '../Screens/Admins/ManajementPerangkat/PerangkatDetail';
const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState(null);

  useEffect(() => {
    // Simulasi loading splash screen
    setTimeout(() => {
      setIsLoading(false);
    }, 6000);
  }, []);

  if (isLoading) {
    return <ManajementTambak />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
    {!isLoggedIn ? (
      <Stack.Screen name="Login">
        {(props) => (
          <LoginScreen
            {...props}
            onLogin={(userRole) => {
              setIsLoggedIn(true);
              setRole(userRole);
            }}
          />
        )}
      </Stack.Screen>
    ) : (
      <>
        <Stack.Screen name="User" component={UserTabs} />
        <Stack.Screen name="Admin" component={AdminTabs} />
        <Stack.Screen name="TambakDetail" component={TambakDetail} />
          <Stack.Screen name="PerangkatDetail" component={PerangkatDetail} />
      </>
    )}
  </Stack.Navigator>
  );  
}
