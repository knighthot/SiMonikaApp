// src/Navigations/AdminTabs.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CommonActions, StackActions } from '@react-navigation/native';

import Dashboard from '../Screens/Admins/Dashboards/Dashboard';
import ManajementPerangkat from '../Screens/Admins/ManajementPerangkat/ManajementPerangkat';
import PerangkatDetail from '../Screens/Admins/ManajementPerangkat/PerangkatDetail';
import ManajementTambak from '../Screens/Admins/ManajementTambak/ManajementTambak';
import TambakDetail from '../Screens/Admins/ManajementTambak/TambakDetails';
import PilihLokasi from '../Screens/Admins/ManajementTambak/PilihLokasi';
import { PerangkatIcons, TambakIcons, MapIcons, Backtab } from '../Assets/Svg';

const Tab = createBottomTabNavigator();
const TambakStackNav = createNativeStackNavigator();
const PerangkatStackNav = createNativeStackNavigator();
const { width } = Dimensions.get('window');

function TambakStack() {
  return (
    <TambakStackNav.Navigator screenOptions={{ headerShown: false }}>
      <TambakStackNav.Screen name="TambakList" component={ManajementTambak} />
      <TambakStackNav.Screen name="TambakDetail" component={TambakDetail} />
      <TambakStackNav.Screen name="PilihLokasi" component={PilihLokasi} />
    </TambakStackNav.Navigator>
  );
}

function PerangkatStack() {
  return (
    <PerangkatStackNav.Navigator screenOptions={{ headerShown: false }}>
      <PerangkatStackNav.Screen name="PerangkatList" component={ManajementPerangkat} />
      <PerangkatStackNav.Screen name="PerangkatDetail" component={PerangkatDetail} />
    </PerangkatStackNav.Navigator>
  );
}

const ROOT_SCREENS = {
  Perangkat: 'PerangkatList',
  Tambak: 'TambakList',
  Dashboard: null,
};

const CustomTabBar = ({ state, descriptors, navigation }) => {
  // deep name helper (aman karena pakai optional chaining)
  const getDeepActiveRouteName = (routeObj) => {
    let r = routeObj;
    while (r?.state?.routes && Number.isInteger(r.state.index)) {
      r = r.state.routes[r.state.index];
    }
    return r?.name;
  };

  // ambil key child stack dari global nav state
  const getChildStackKey = (tabName) => {
    const navState = navigation.getState(); // state root (tab navigator)
    const tabRoute = navState?.routes?.find?.((r) => r.name === tabName);
    return tabRoute?.state?.key; // bisa undefined jika belum ada child state
  };

  // pabrik handler onPress
  const onPressFactory = (route, index) => () => {
    const isFocused = state.index === index;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (event.defaultPrevented) return;

    const root = ROOT_SCREENS[route.name];

    if (!isFocused) {
      // pindah tab + arahkan ke root screen stack tsb (kalau ada)
      navigation.dispatch(
        CommonActions.navigate({
          name: route.name,
          params: root ? { screen: root } : undefined,
        })
      );
      return;
    }

    // sudah di tab yang sama
    if (route.name === 'Dashboard') {
      navigation.navigate('Dashboard');
      return;
    }

    // popToTop pada child stack (kalau sudah punya state)
    const childKey = getChildStackKey(route.name);
    if (childKey) {
      navigation.dispatch({
        ...StackActions.popToTop(),
        target: childKey,
      });
    } else {
      // belum ada child state -> pastikan di root juga
      navigation.dispatch(
        CommonActions.navigate({
          name: route.name,
          params: root ? { screen: root } : undefined,
        })
      );
    }
  };

  const focusedRouteObj = state.routes[state.index];
  const deepName = getDeepActiveRouteName(focusedRouteObj);

  const shouldHideTab =
    deepName === 'PerangkatDetail' ||
    deepName === 'TambakDetail' ||
    deepName === 'PilihLokasi';

  if (shouldHideTab) return null;

  return (
    <View style={styles.tabContainer}>
      <View style={styles.wrapper}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const isCenter = route.name === 'Dashboard';

          const getIcon = () => {
            switch (route.name) {
              case 'Perangkat': return <PerangkatIcons />;
              case 'Dashboard': return <MapIcons />;
              case 'Tambak':    return <TambakIcons />;
              default:          return null;
            }
          };

          if (isCenter) return null;

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPressFactory(route, index)}
              style={styles.tab}
            >
              <View style={styles.iconWrapper}>{getIcon()}</View>
              <Text style={[styles.label, isFocused ? styles.labelFocused : null]}>{route.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Backtab style={styles.backtab} />

      {/* Tombol tengah -> Dashboard */}
      <TouchableOpacity
        onPress={() => navigation.navigate('Dashboard')}
        style={styles.centerTab}
      >
        <View style={styles.centerIconWrapper}><MapIcons /></View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  tabContainer: { position: 'absolute', bottom: 0, width, height: 120, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'flex-end' },
  wrapper: { flexDirection: 'row', backgroundColor: '#5EA7EF', width, borderTopLeftRadius: 30, borderTopRightRadius: 30, height: 70, alignSelf: 'center', justifyContent: 'space-between', paddingHorizontal: 0, zIndex: 0 },
  tab: { alignItems: 'center', justifyContent: 'center', marginHorizontal: 55 },
  backtab: { position: 'absolute', bottom: 25, zIndex: 1 },
  centerTab: { position: 'absolute', top: 0, left: width / 2 - 35, width: 70, height: 70, backgroundColor: '#5EA7EF', borderRadius: 35, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  centerIconWrapper: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  iconWrapper: { padding: 6 },
  label: { fontSize: 12, marginTop: 2, color: 'white' },
  labelFocused: { color: 'white', fontWeight: '800' },
});

const AdminTabs = () => {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <CustomTabBar {...props} />}>
      <Tab.Screen name="Dashboard" component={Dashboard} />
      <Tab.Screen name="Perangkat" component={PerangkatStack} />
      <Tab.Screen name="Tambak" component={TambakStack} />
    </Tab.Navigator>
  );
};

export default AdminTabs;
