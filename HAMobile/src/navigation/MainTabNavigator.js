import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import ScreenOne from '../screens/main/ScreenOne';
import RegistroFincaScreen from '../screens/main/registro-finca';
import TecnicoCampoScreen from '../screens/main/tecnico-campo';
import ScreenThree from '../screens/main/ScreenThree';
import LaboresNavigator from './LaboresNavigator';
import { theme } from '../theme/theme';
import { Home, Trees, User, ClipboardList, CalendarClock } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';

const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  const { user } = useAuth();
  const isTecnico = user?.role_name === 'TECNICO_CAMPO';

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
          if (route.name === 'Evaluación') return <ClipboardList size={28} color={color} />;
          if (route.name === 'Labores') return <CalendarClock size={28} color={color} />;
          if (route.name === 'Perfil') return <User size={28} color={color} />;
          return null;
        },
      })}
    >
      <Tab.Screen name="Inicio" component={ScreenOne} />
      {isTecnico ? (
        <Tab.Screen name="Evaluación" component={TecnicoCampoScreen} />
      ) : (
        <Tab.Screen name="Registro" component={RegistroFincaScreen} options={{ title: 'Registro EUDR' }} />
      )}
      <Tab.Screen name="Labores" component={LaboresNavigator} />
      <Tab.Screen name="Perfil" component={ScreenThree} />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;

