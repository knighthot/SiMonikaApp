import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Dashboard from '../Screens/Admins/Dashboards/Dashboard';
import ManajementPerangkat from '../Screens/Admins/ManajementPerangkat/ManajementPerangkat';
import ManajementTambak from '../Screens/Admins/ManajementTambak/ManajementTambak';
import TambakDetail from '../Screens/Admins/ManajementTambak/TambakDetails';
import { PerangkatIcons, TambakIcons, MapIcons, Backtab } from '../Assets/Svg/index';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

const Tab = createBottomTabNavigator();
const { width } = Dimensions.get('window');

const CustomTabBar = ({ state, descriptors, navigation }) => {
  return (
    <View style={styles.tabContainer}>
      {/* wrapper paling belakang */}
      <View style={styles.wrapper}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const isCenter = route.name === 'Dashboard';

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const getIcon = () => {
            switch (route.name) {
              case 'Perangkat':
                return <PerangkatIcons />;
              case 'Dashboard':
                return <MapIcons />;
              case 'Tambak':
                return <TambakIcons />;
              default:
                return null;
            }
          };

          if (isCenter) {
            return null; // centerTab ditaruh terpisah setelah wrapper
          }

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tab}
            >
              <View style={styles.iconWrapper}>
                {getIcon()}
              </View>
              <Text style={[styles.label, isFocused ? styles.labelFocused : {}]}>
                {route.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Backtab menutupi wrapper, tapi masih di belakang icon tengah */}
      <Backtab style={styles.backtab} />

      {/* Icon Dashboard (centerTab) di paling depan */}
      <TouchableOpacity
        onPress={() => navigation.navigate('Dashboard')}
        style={styles.centerTab}
      >
        <View style={styles.centerIconWrapper}>
          <MapIcons />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    position: 'absolute',
    bottom: 0,
    width,
    height: 120,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  wrapper: {
    flexDirection: 'row',
    backgroundColor: '#5EA7EF',
    width: width,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: 70,
    alignSelf: 'center',
    justifyContent: 'space-between', // biar tab kiri kanan sejajar rapi
  paddingHorizontal: 0,
    zIndex: 0, // paling belakang
  },

  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal:55
  },
  

  backtab: {
    position: 'absolute',
    bottom: 25,
    
    zIndex: 1, // di atas wrapper
  },

  centerTab: {
    position: 'absolute',
    top: 0,
    left: width / 2 - 35,
    width: 70,
    height: 70,
    backgroundColor: '#5EA7EF',
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2, // paling depan
  },

  centerIconWrapper: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  iconWrapper: {
    padding: 6,
  },

  label: {
    fontSize: 12,
    marginTop: 2,
    color: 'white',
  },

  labelFocused: {
    color: 'white',
    fontWeight: '800',
  },
});

const AdminTabs = () => {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <CustomTabBar {...props} />}>
      <Tab.Screen name="Dashboard" component={Dashboard} />
      <Tab.Screen name="Perangkat" component={ManajementPerangkat} />
      <Tab.Screen name="Tambak" component={ManajementTambak} />
    </Tab.Navigator>
  );
};

export default AdminTabs;
