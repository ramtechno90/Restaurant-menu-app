import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import MenuManagementScreen from '../screens/MenuManagementScreen';

const Tab = createBottomTabNavigator();

const AdminNavigator = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Dashboard" component={AdminDashboardScreen} />
      <Tab.Screen name="Menu Management" component={MenuManagementScreen} />
    </Tab.Navigator>
  );
};

export default AdminNavigator;
