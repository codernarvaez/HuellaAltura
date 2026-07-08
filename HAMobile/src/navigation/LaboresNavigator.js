import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FincasListScreen from '../screens/main/labores/FincasListScreen';
import CalendarioLaboresScreen from '../screens/main/labores/CalendarioLaboresScreen';

const Stack = createNativeStackNavigator();

export default function LaboresNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FincasList" component={FincasListScreen} />
      <Stack.Screen name="CalendarioLabores" component={CalendarioLaboresScreen} />
    </Stack.Navigator>
  );
}
