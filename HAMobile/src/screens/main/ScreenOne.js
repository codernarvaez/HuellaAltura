import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

const ScreenOne = () => {
  const { signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pantalla Principal</Text>
      <Text>Esta es la primera pestaña.</Text>
      <View style={{ marginTop: 20 }}>
        <Button title="Cerrar Sesión" onPress={signOut} color="#ff4444" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    marginBottom: 10,
  },
});

export default ScreenOne;
