import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';

const RootNavigator = () => {
  const { isAuthenticated } = useAuth();

  // Enrutamiento condicional basado en el estado de autenticación
  return isAuthenticated ? <MainTabNavigator /> : <AuthNavigator />;
};

export default RootNavigator;
