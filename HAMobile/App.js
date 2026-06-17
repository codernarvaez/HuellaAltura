import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { AlertProvider } from './src/contexts/AlertContext';
import CustomAlert from './src/components/common/CustomAlert';
import RootNavigator from './src/navigation/RootNavigator';
import { SyncManager } from './src/services/SyncManager';

export default function App() {
  useEffect(() => {
    SyncManager.initialize();
  }, []);

  return (
    <SafeAreaProvider>
      <AlertProvider>
        <AuthProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
          <CustomAlert />
        </AuthProvider>
      </AlertProvider>
    </SafeAreaProvider>
  );
}
