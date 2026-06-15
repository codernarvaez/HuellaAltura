import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ScreenTwo = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Explorar</Text>
      <Text>Esta es la segunda pestaña.</Text>
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

export default ScreenTwo;
