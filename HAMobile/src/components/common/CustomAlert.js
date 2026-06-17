import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { theme } from '../../theme/theme';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react-native';
import { useAlert } from '../../contexts/AlertContext';

const { width } = Dimensions.get('window');

const CustomAlert = () => {
  const { alert, hideAlert } = useAlert();
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (alert.visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
    }
  }, [alert.visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      hideAlert();
      if (alert.onConfirm) alert.onConfirm();
    });
  };

  const getAlertConfig = () => {
    switch (alert.type) {
      case 'success':
        return {
          icon: <CheckCircle2 size={48} color={theme.colors.primary} />,
          color: theme.colors.primary,
          bg: theme.colors.primaryFixed,
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={48} color={theme.colors.secondary} />,
          color: theme.colors.secondary,
          bg: theme.colors.secondaryFixed,
        };
      case 'error':
        return {
          icon: <XCircle size={48} color={theme.colors.error} />,
          color: theme.colors.error,
          bg: theme.colors.errorContainer,
        };
      default:
        return {
          icon: <CheckCircle2 size={48} color={theme.colors.primary} />,
          color: theme.colors.primary,
          bg: theme.colors.primaryFixed,
        };
    }
  };

  const config = getAlertConfig();

  return (
    <Modal
      transparent
      visible={alert.visible}
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.alertContainer,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={[styles.iconContainer, { backgroundColor: config.bg }]}>
            {config.icon}
          </View>
          
          <View style={styles.textContainer}>
            <Text style={styles.title}>{alert.title}</Text>
            <Text style={styles.message}>{alert.message}</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: config.color }]}
            onPress={handleClose}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Aceptar</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 27, 43, 0.6)', // Using theme.colors.onSurface with opacity
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertContainer: {
    backgroundColor: '#fff',
    borderRadius: theme.roundness.xl,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    ...theme.typography.headlineMd,
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '700',
  },
  message: {
    ...theme.typography.bodyMd,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: theme.roundness.lg,
    alignItems: 'center',
  },
  buttonText: {
    ...theme.typography.labelMd,
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default CustomAlert;
