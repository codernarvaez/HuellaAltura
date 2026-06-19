import React from 'react';
import { View, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { theme } from '../../theme/theme';

const GlobalLoader = () => {
  return (
    <View style={styles.container}>
      <Image 
        source={require('../../../assets/Icon.png')} 
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color={theme.colors.secondary} style={styles.loader} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
  },
  loader: {
    marginTop: 30,
  }
});

export default GlobalLoader;
