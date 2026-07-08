import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  StatusBar,
  ScrollView,
  Image,
  Keyboard,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { theme } from '../../theme/theme';
import { Mail, Lock, ChevronRight, Eye, EyeOff } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
  const { signIn, loading } = useAuth();
  const { showAlert } = useAlert();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email.includes('@') || password.length < 6) {
      setError('Credenciales inválidas. Por favor, revisa tus datos.');
      return;
    }
    setError('');
    
    const result = await signIn(email, password);
    
    if (!result.success) {
      setError(result.error);
      if (result.error.includes('servidor')) {
        showAlert('Error de Conexión', result.error, 'error');
      }
    }
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.onPrimaryFixed} />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero Image */}
          <View style={styles.heroContainer}>
            <Image 
              source={require('../../../assets/login_screen.jpeg')}
              style={styles.heroImage}
              resizeMode="cover"
            />
            <View style={styles.overlay} />
          </View>

          <Animated.View 
            style={[
              styles.contentContainer,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            {/* Branding Section */}
            <View style={styles.brandingSection}>
              <View style={styles.titleRow}>
                <View style={styles.smallIconContainer}>
                  <Image 
                    source={require('../../../assets/Logo.png')}
                    style={styles.smallLogoImage}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.brandTitle}>Huella de Altura</Text>
              </View>
              <Text style={styles.brandTagline}>Precisión en cada grano</Text>
            </View>

            {/* Welcome Message */}
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeTitle}>Bienvenido</Text>
              <Text style={styles.welcomeSubtext}>Ingresa tus credenciales para continuar.</Text>
            </View>

            {/* Login Form */}
            <View style={styles.formContainer}>
              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorMessage}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.inputWrapper}>
                <View style={styles.inputIconContainer}>
                  <Mail size={20} color={theme.colors.onSurfaceVariant} />
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="Correo Electrónico"
                  placeholderTextColor={theme.colors.outline}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (error) setError('');
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputWrapper}>
                <View style={styles.inputIconContainer}>
                  <Lock size={20} color={theme.colors.onSurfaceVariant} />
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="Contraseña"
                  placeholderTextColor={theme.colors.outline}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (error) setError('');
                  }}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity 
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={theme.colors.onSurfaceVariant} />
                  ) : (
                    <Eye size={20} color={theme.colors.onSurfaceVariant} />
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.forgotPasswordContainer}>
                <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>

              {/* Primary Action */}
              <TouchableOpacity 
                style={styles.loginButton}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={theme.colors.onPrimary} />
                ) : (
                  <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
                )}
              </TouchableOpacity>

              {/* Register Action */}
              <TouchableOpacity 
                style={styles.registerButton}
                onPress={() => navigation.navigate('Registration')}
                disabled={loading}
              >
                <Text style={styles.registerButtonText}>Crear Cuenta nueva</Text>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.copyrightText}>© 2024 Huella de Altura</Text>
              <View style={styles.footerLinks}>
                <TouchableOpacity><Text style={styles.footerLinkText}>Privacidad</Text></TouchableOpacity>
                <View style={styles.dot} />
                <TouchableOpacity><Text style={styles.footerLinkText}>Términos</Text></TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: theme.colors.onPrimaryFixed, // #002111
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroContainer: {
    width: '100%',
    height: height * 0.35,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 33, 17, 0.4)', // Fades image into the dark background
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    marginTop: -40,
    backgroundColor: theme.colors.onPrimaryFixed,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  brandingSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallIconContainer: {
    width: 36,
    height: 36,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  smallLogoImage: {
    width: 24,
    height: 24,
  },
  brandTitle: {
    ...theme.typography.headlineLg,
    color: theme.colors.onPrimary,
    textAlign: 'center',
    fontWeight: '700',
  },
  brandTagline: {
    ...theme.typography.bodyMd,
    color: theme.colors.primaryFixedDim, // #8ed6aa
    marginTop: 4,
    textAlign: 'center',
    opacity: 0.9,
  },
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeTitle: {
    ...theme.typography.headlineMd,
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
  welcomeSubtext: {
    ...theme.typography.bodyMd,
    color: theme.colors.onPrimary,
    opacity: 0.7,
    marginTop: 4,
  },
  formContainer: {
    width: '100%',
  },
  errorContainer: {
    backgroundColor: theme.colors.errorContainer,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  errorMessage: {
    ...theme.typography.labelSm,
    color: theme.colors.onErrorContainer,
    textAlign: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background, // #f9f9ff
    borderRadius: 16,
    height: 60,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  inputIconContainer: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    ...theme.typography.bodyMd,
    color: theme.colors.onSurface,
  },
  eyeIcon: {
    padding: 8,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 32,
  },
  forgotPasswordText: {
    ...theme.typography.labelMd,
    color: theme.colors.primaryFixedDim,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: theme.colors.primaryContainer, // #0d5c3a
    borderRadius: 16,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  loginButtonText: {
    ...theme.typography.labelMd,
    color: theme.colors.onPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  registerButton: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primaryFixedDim,
    marginBottom: 16,
  },
  registerButtonText: {
    ...theme.typography.labelMd,
    color: theme.colors.primaryFixedDim,
    fontWeight: '600',
    fontSize: 16,
  },
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
  },
  copyrightText: {
    ...theme.typography.labelSm,
    color: theme.colors.onPrimary,
    opacity: 0.5,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  footerLinkText: {
    ...theme.typography.labelSm,
    color: theme.colors.onPrimary,
    opacity: 0.7,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: theme.colors.onPrimary,
    marginHorizontal: 8,
    opacity: 0.5,
  },
});

export default LoginScreen;
