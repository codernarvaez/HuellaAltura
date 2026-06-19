import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import ScreenOne from '../screens/main/ScreenOne';
import RegistroFincaScreen from '../screens/main/registro-finca';
import ScreenThree from '../screens/main/ScreenThree';
import { theme } from '../theme/theme';
import { LayoutDashboard, MapPin, User } from 'lucide-react-native';

const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  return (
    <Tab.Navigator 
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.outline,
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'Inicio') return <LayoutDashboard size={size} color={color} />;
          if (route.name === 'Registro') return <MapPin size={size} color={color} />;
          if (route.name === 'Perfil') return <User size={size} color={color} />;
          return null;
        },
      })}
    >
      <Tab.Screen name="Inicio" component={ScreenOne} />
      <Tab.Screen name="Registro" component={RegistroFincaScreen} options={{ title: 'Registro EUDR' }} />
      <Tab.Screen name="Perfil" component={ScreenThree} />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
