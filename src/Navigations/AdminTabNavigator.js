import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Dashboard from '../Screens/Admins/Dashboards/Dashboard';
// import Tab lainnya...

const Tab = createBottomTabNavigator();

const AdminTabs = () => {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Dashboard" component={Dashboard} />
      {/* Tab lainnya */}
    </Tab.Navigator>
  );
};

export default AdminTabs;
