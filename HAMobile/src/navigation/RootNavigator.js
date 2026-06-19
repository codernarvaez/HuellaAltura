import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import GlobalLoader from '../components/common/GlobalLoader';

const RootNavigator = () => {
  const { isAuthenticated, loading } = useAuth();

  // Mostrar el loader global mientras se verifica la sesión en SQLite/SecureStorage
  if (loading) {
    return <GlobalLoader />;
  }

  // Enrutamiento condicional basado en el estado de autenticación
  return isAuthenticated ? <MainTabNavigator /> : <AuthNavigator />;
};

export default RootNavigator;
