import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import ScreenOne from '../screens/main/ScreenOne';
import RegistroFincaScreen from '../screens/main/registro-finca';
import ScreenThree from '../screens/main/ScreenThree';
import { theme } from '../theme/theme';
import { Home, Trees, User } from 'lucide-react-native';

const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  return (
    <Tab.Navigator 
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: theme.colors.primary,
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          paddingTop: 10,
        },
        tabBarActiveTintColor: theme.colors.primaryFixed,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'Inicio') return <Home size={28} color={color} />;
          if (route.name === 'Registro') return <Trees size={28} color={color} />;
          if (route.name === 'Perfil') return <User size={28} color={color} />;
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
