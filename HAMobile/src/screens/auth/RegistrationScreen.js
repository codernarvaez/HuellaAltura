import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { theme } from '../../theme/theme';
import { 
  ChevronLeft, 
  Eye, 
  EyeOff, 
  User, 
  Mail, 
  Lock, 
  Smartphone, 
  CreditCard, 
  Calendar,
  GraduationCap,
  Mars,
  Venus,
  MoreHorizontal
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// Moviendo InputField fuera para evitar que el teclado se cierre al re-renderizar
const InputField = ({ icon: Icon, placeholder, value, onChangeText, secureTextEntry, keyboardType, autoCapitalize, showEye, onEyePress, eyeOpen }) => (
  <View style={styles.inputWrapper}>
    <View style={styles.inputIconContainer}>
      <Icon size={22} color={theme.colors.primary} />
    </View>
    <TextInput
      style={styles.textInput}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.outline}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
    />
    {showEye && (
      <TouchableOpacity onPress={onEyePress} style={styles.eyeIcon}>
        {eyeOpen ? <EyeOff size={20} color={theme.colors.onSurfaceVariant} /> : <Eye size={20} color={theme.colors.onSurfaceVariant} />}
      </TouchableOpacity>
    )}
  </View>
);

const RegistrationScreen = ({ navigation }) => {
  const { register, loading } = useAuth();
  const { showAlert } = useAlert();
  
  const nivelesEducativos = ['Ninguno', 'Primaria', 'Secundaria', 'Superior', 'Postgrado'];
  const opcionesGenero = [
    { label: 'Masculino', value: 'Masculino', icon: Mars },
    { label: 'Femenino', value: 'Femenino', icon: Venus },
    { label: 'Otro', value: 'Prefiero no decirlo', icon: MoreHorizontal },
  ];
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    cedula_id: '',
    phone_number: '',
    edad: '',
    genero: 'Masculino',
    nivel_educativo: 'Ninguno',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const validateEcuadorianId = (id) => {
    if (!id || id.length !== 10) return false;
    const digits = id.split('').map(Number);
    if (digits.some(isNaN)) return false;
    const province = parseInt(id.substring(0, 2));
    if (!((province >= 1 && province <= 24) || province === 30)) return false;
    const thirdDigit = digits[2];
    if (thirdDigit >= 6) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      let val = digits[i];
      if (i % 2 === 0) { val *= 2; if (val > 9) val -= 9; }
      sum += val;
    }
    const verifier = (Math.ceil(sum / 10) * 10) - sum;
    return verifier === digits[9] || (sum % 10 === 0 && digits[9] === 0);
  };

  const handleRegister = async () => {
    if (!formData.first_name.trim()) { showAlert('Campo Requerido', 'El nombre es requerido.', 'warning'); return; }
    if (!formData.last_name.trim()) { showAlert('Campo Requerido', 'El apellido es requerido.', 'warning'); return; }
    if (!validateEcuadorianId(formData.cedula_id)) { showAlert('Validación de Identidad', 'La identificación (cédula) no es válida.', 'error'); return; }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) { showAlert('Correo Inválido', 'Ingrese un correo electrónico válido.', 'warning'); return; }
    if (formData.phone_number.length < 9) { showAlert('Teléfono Inválido', 'El número de teléfono no es válido.', 'warning'); return; }
    if (formData.password.length < 6) { showAlert('Seguridad', 'La contraseña debe tener al menos 6 caracteres.', 'warning'); return; }
    if (formData.password !== formData.confirmPassword) { showAlert('Error de Coincidencia', 'Las contraseñas no coinciden.', 'error'); return; }

    const { confirmPassword, ...registerPayload } = formData;
    const payload = {
      ...registerPayload,
      first_name: registerPayload.first_name.trim(),
      last_name: registerPayload.last_name.trim(),
      email: registerPayload.email.trim(),
      identifier: registerPayload.cedula_id.trim(),
      edad: parseInt(formData.edad) || 0,
      genero: formData.genero,
      nivel_educativo: formData.nivel_educativo,
    };
    
    delete payload.cedula_id;

    const result = await register(payload);
    if (result.success) {
      showAlert('Éxito', 'Registro completado. Por favor, inicie sesión.', 'success', () => navigation.goBack());
    } else {
      showAlert('Error de Registro', result.error, 'error');
      setError(result.error);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.onPrimaryFixed]}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronLeft size={28} color={theme.colors.onPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Registro</Text>
            <Text style={styles.headerSubtitle}>Crea tu cuenta para comenzar</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.contentCard}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorMessage}>{error}</Text>
              </View>
            ) : null}

            <Text style={styles.sectionLabel}>Datos Personales</Text>
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <InputField icon={User} placeholder="Nombre" value={formData.first_name} onChangeText={(t) => handleChange('first_name', t)} />
              </View>
              <View style={{ flex: 1 }}>
                <InputField icon={User} placeholder="Apellido" value={formData.last_name} onChangeText={(t) => handleChange('last_name', t)} />
              </View>
            </View>

            <InputField icon={CreditCard} placeholder="Identificación" value={formData.cedula_id} onChangeText={(t) => handleChange('cedula_id', t)} keyboardType="numeric" />
            
            <View style={styles.row}>
              <View style={{ flex: 0.8, marginRight: 10 }}>
                <InputField icon={Calendar} placeholder="Edad" value={formData.edad} onChangeText={(t) => handleChange('edad', t)} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1.2 }}>
                <View style={styles.genderRow}>
                  {opcionesGenero.map((opcion) => (
                    <TouchableOpacity 
                      key={opcion.value}
                      style={[styles.genderBox, formData.genero === opcion.value && styles.genderBoxActive]} 
                      onPress={() => handleChange('genero', opcion.value)}
                    >
                      <opcion.icon size={20} color={formData.genero === opcion.value ? theme.colors.onPrimary : theme.colors.outline} />
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.miniLabel}>{formData.genero}</Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>Educación</Text>
            <View style={styles.eduContainer}>
              <GraduationCap size={20} color={theme.colors.primary} style={{ marginRight: 10 }} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eduChips}>
                {nivelesEducativos.map((nivel) => (
                  <TouchableOpacity 
                    key={nivel} 
                    style={[styles.eduChip, formData.nivel_educativo === nivel && styles.eduChipActive]}
                    onPress={() => handleChange('nivel_educativo', nivel)}
                  >
                    <Text style={[styles.eduChipText, formData.nivel_educativo === nivel && styles.eduChipTextActive]}>{nivel}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Text style={styles.sectionLabel}>Contacto y Seguridad</Text>
            <InputField icon={Mail} placeholder="Correo Electrónico" value={formData.email} onChangeText={(t) => handleChange('email', t)} keyboardType="email-address" autoCapitalize="none" />
            <InputField icon={Smartphone} placeholder="Número de Teléfono" value={formData.phone_number} onChangeText={(t) => handleChange('phone_number', t)} keyboardType="phone-pad" />
            
            <InputField 
              icon={Lock} placeholder="Contraseña" value={formData.password} onChangeText={(t) => handleChange('password', t)} 
              secureTextEntry={!showPassword} showEye onEyePress={() => setShowPassword(!showPassword)} eyeOpen={showPassword}
            />
            
            <InputField 
              icon={Lock} placeholder="Confirmar Contraseña" value={formData.confirmPassword} onChangeText={(t) => handleChange('confirmPassword', t)} 
              secureTextEntry={!showConfirmPassword} showEye onEyePress={() => setShowConfirmPassword(!showConfirmPassword)} eyeOpen={showConfirmPassword}
            />

            <TouchableOpacity 
              style={[styles.registerButton, loading && styles.buttonDisabled]} 
              onPress={handleRegister} 
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.registerButtonText}>Crear Cuenta</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>¿Ya tienes una cuenta? </Text>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.loginLink}>Ingresa aquí</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 60,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    ...theme.typography.headlineMd,
    color: '#fff',
    fontWeight: '700',
  },
  headerSubtitle: {
    ...theme.typography.bodyMd,
    color: 'rgba(255,255,255,0.8)',
  },
  contentCard: {
    flex: 1,
    marginTop: -30,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
  },
  scrollContent: {
    paddingTop: 30,
    paddingBottom: 40,
  },
  sectionLabel: {
    ...theme.typography.labelSm,
    color: theme.colors.primary,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    height: 52,
    marginBottom: 16,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
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
  genderRow: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 4,
    height: 52,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  genderBox: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  genderBoxActive: {
    backgroundColor: theme.colors.primary,
  },
  miniLabel: {
    fontSize: 10,
    color: theme.colors.outline,
    textAlign: 'center',
    marginTop: 4,
  },
  eduContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 12,
  },
  eduChips: {
    paddingRight: 10,
  },
  eduChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E1E1E1',
    marginRight: 8,
  },
  eduChipActive: {
    backgroundColor: theme.colors.primaryContainer,
    borderColor: theme.colors.primary,
  },
  eduChipText: {
    fontSize: 12,
    color: theme.colors.outline,
  },
  eduChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  registerButton: {
    backgroundColor: theme.colors.primary,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  registerButtonText: {
    ...theme.typography.labelMd,
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    ...theme.typography.bodyMd,
    color: theme.colors.outline,
  },
  loginLink: {
    ...theme.typography.bodyMd,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  errorContainer: {
    backgroundColor: '#FFE5E5',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFB2B2',
  },
  errorMessage: {
    color: '#D32F2F',
    fontSize: 13,
    textAlign: 'center',
  },
});

export default RegistrationScreen;
