import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import DashboardUser from '../Screens/Users/Dashboards/DashboardUsers';
import Menu from '../Screens/Users/Menu';
import PengaturanAkun from '../Screens/Users/Pengaturan/PengaturanAkun';
import OnboardingPengaturanAkun from '../Screens/Users/Pengaturan/OnboardingPengaturanAkun';
import ChatAi from '../Screens/Users/ChatAi/ChatAi';
import { PerangkatIcons, TambakIcons, MapIcons, Backtab } from '../Assets/Svg';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const { width } = Dimensions.get('window');

// ---- Stack khusus untuk tab "Menu"
function MenuStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MenuHome" component={Menu} />
      <Stack.Screen name="PengaturanAkun" component={PengaturanAkun} />
      <Stack.Screen name="OnboardingPengaturanAkun" component={OnboardingPengaturanAkun} />
    </Stack.Navigator>
  );
}

const CustomTabBar = ({ state, descriptors, navigation }) => {
  // helper: ambil nama screen terdalam dari sebuah route (support nested)
  const getDeepActiveRouteName = (routeObj) => {
    let r = routeObj;
    // r.state bisa undefined di awal render
    while (r?.state?.routes && Number.isInteger(r.state.index)) {
      r = r.state.routes[r.state.index];
    }
    return r?.name;
  };

  const focusedRouteObj = state.routes[state.index];
  const focusedRootName = focusedRouteObj?.name;              // ex: 'DashboardUser' | 'ChatAi' | 'Menu'
  const nestedActiveName = getDeepActiveRouteName(focusedRouteObj); // ex: 'MenuHome' | 'PengaturanAkunOnboarding' | 'PengaturanAkun'

  // ❗ aturan sembunyi tab:
  const shouldHideTab =
    focusedRootName === 'ChatAi' ||
    nestedActiveName === 'OnboardingPengaturanAkun'; // ⬅️ sembunyikan saat onboarding

  if (shouldHideTab) return null;
  return (
    <View style={styles.tabContainer}>
      <View style={styles.wrapper}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const isCenter = route.name === 'DashboardUser';

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          const getIcon = () => {
            switch (route.name) {
              case 'ChatAi': return <PerangkatIcons />;
              case 'DashboardUser': return <MapIcons />;
              case 'Menu': return <TambakIcons />;
              default: return null;
            }
          };

          if (isCenter) return null;

          return (
            <TouchableOpacity key={route.key} onPress={onPress} style={styles.tab}>
              <View style={styles.iconWrapper}>{getIcon()}</View>
              <Text style={[styles.label, isFocused ? styles.labelFocused : null]}>{route.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Backtab style={styles.backtab} />

      <TouchableOpacity onPress={() => navigation.navigate('DashboardUser')} style={styles.centerTab}>
        <View style={styles.centerIconWrapper}><MapIcons /></View>
      </TouchableOpacity>
    </View>
  );
};

export default function UserTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <CustomTabBar {...props} />}>
      <Tab.Screen name="DashboardUser" component={DashboardUser} />
      <Tab.Screen name="ChatAi" component={ChatAi} />
      {/* ← Tab “Menu” sekarang berisi stack (MenuHome + PengaturanAkun) */}
      <Tab.Screen name="Menu" component={MenuStack} />
    </Tab.Navigator>
  );
}

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
