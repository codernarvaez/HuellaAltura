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
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { theme } from '../../theme/theme';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react-native';

const RegistrationScreen = ({ navigation }) => {
  const { register, loading } = useAuth();
  const { showAlert } = useAlert();
  
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
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
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
      if (i % 2 === 0) { // Odd positions in human terms (0, 2, 4...)
        val *= 2;
        if (val > 9) val -= 9;
      }
      sum += val;
    }

    const verifier = (Math.ceil(sum / 10) * 10) - sum;
    return verifier === digits[9] || (sum % 10 === 0 && digits[9] === 0);
  };

  const handleRegister = async () => {
    // Basic validation
    if (!formData.first_name.trim()) {
      showAlert('Campo Requerido', 'El nombre es requerido.', 'warning');
      return;
    }
    if (!formData.last_name.trim()) {
      showAlert('Campo Requerido', 'El apellido es requerido.', 'warning');
      return;
    }
    
    if (!validateEcuadorianId(formData.cedula_id)) {
      showAlert('Validación de Identidad', 'La identificación (cédula) no es válida.', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      showAlert('Correo Inválido', 'Por favor ingrese un correo electrónico válido.', 'warning');
      return;
    }

    if (formData.phone_number.length < 9) {
      showAlert('Teléfono Inválido', 'El número de teléfono no es válido.', 'warning');
      return;
    }

    if (formData.password.length < 6) {
      showAlert('Seguridad', 'La contraseña debe tener al menos 6 caracteres.', 'warning');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      showAlert('Error de Coincidencia', 'Las contraseñas no coinciden.', 'error');
      return;
    }

    if (formData.edad && (parseInt(formData.edad) < 12 || parseInt(formData.edad) > 100)) {
      showAlert('Edad No Válida', 'Por favor ingrese una edad válida.', 'warning');
      return;
    }

    const { confirmPassword, ...registerPayload } = formData;
    const payload = {
      ...registerPayload,
      first_name: registerPayload.first_name.trim(),
      last_name: registerPayload.last_name.trim(),
      email: registerPayload.email.trim(),
      identifier: registerPayload.cedula_id.trim(),
      edad: parseInt(formData.edad) || 0,
      genero: formData.genero,
      // role_name and status are handled with defaults in AuthContext
    };
    
    // Remove old field name if it exists in spread
    delete payload.cedula_id;

    console.log('[RegistrationScreen] Llamando a register con payload:', payload);
    const result = await register(payload);
    console.log('[RegistrationScreen] Resultado de register:', result);

    if (result.success) {
      showAlert('Éxito', 'Registro completado. Por favor, inicie sesión.', 'success', () => navigation.goBack());
    } else {
      showAlert('Error de Registro', result.error, 'error');
      setError(result.error);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronLeft size={24} color={theme.colors.onPrimaryFixed} />
          </TouchableOpacity>
          <Text style={styles.title}>Nueva Cuenta</Text>
        </View>

        <View style={styles.form}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.inputSection}>
            <Text style={styles.sectionLabel}>Datos Personales</Text>
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.inputLabel}>Nombres *</Text>
                <TextInput style={styles.input} placeholder="Juan" value={formData.first_name} onChangeText={(text) => handleChange('first_name', text)} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Apellidos *</Text>
                <TextInput style={styles.input} placeholder="Pérez" value={formData.last_name} onChangeText={(text) => handleChange('last_name', text)} />
              </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1.5, marginRight: 8 }}>
                <Text style={styles.inputLabel}>Identificación *</Text>
                <TextInput style={styles.input} placeholder="Cédula/RUC" value={formData.cedula_id} onChangeText={(text) => handleChange('cedula_id', text)} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Edad</Text>
                <TextInput style={styles.input} placeholder="0" value={formData.edad} onChangeText={(text) => handleChange('edad', text)} keyboardType="numeric" />
              </View>
            </View>
            
            <Text style={styles.inputLabel}>Género</Text>
            <View style={styles.genderContainer}>
              <TouchableOpacity 
                style={[styles.genderButton, formData.genero === 'Masculino' && styles.genderButtonActive]} 
                onPress={() => handleChange('genero', 'Masculino')}
              >
                <Text style={[styles.genderButtonText, formData.genero === 'Masculino' && styles.genderButtonTextActive]}>Masculino</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.genderButton, formData.genero === 'Femenino' && styles.genderButtonActive]} 
                onPress={() => handleChange('genero', 'Femenino')}
              >
                <Text style={[styles.genderButtonText, formData.genero === 'Femenino' && styles.genderButtonTextActive]}>Femenino</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.sectionLabel}>Contacto y Seguridad</Text>
            <Text style={styles.inputLabel}>Correo Electrónico *</Text>
            <TextInput style={styles.input} placeholder="correo@ejemplo.com" value={formData.email} onChangeText={(text) => handleChange('email', text)} keyboardType="email-address" autoCapitalize="none" />
            
            <Text style={styles.inputLabel}>Teléfono *</Text>
            <TextInput style={styles.input} placeholder="0999999999" value={formData.phone_number} onChangeText={(text) => handleChange('phone_number', text)} keyboardType="phone-pad" />
            
            <Text style={styles.inputLabel}>Contraseña *</Text>
            <View style={styles.passwordWrapper}>
              <TextInput 
                style={[styles.input, { flex: 1, marginBottom: 0 }]} 
                placeholder="Mínimo 6 caracteres" 
                value={formData.password} 
                onChangeText={(text) => handleChange('password', text)} 
                secureTextEntry={!showPassword} 
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                {showPassword ? <EyeOff size={20} color="#666" /> : <Eye size={20} color="#666" />}
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { marginTop: 10 }]}>Confirmar Contraseña *</Text>
            <View style={styles.passwordWrapper}>
              <TextInput 
                style={[styles.input, { flex: 1, marginBottom: 0 }]} 
                placeholder="Repita su contraseña" 
                value={formData.confirmPassword} 
                onChangeText={(text) => handleChange('confirmPassword', text)} 
                secureTextEntry={!showConfirmPassword} 
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                {showConfirmPassword ? <EyeOff size={20} color="#666" /> : <Eye size={20} color="#666" />}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.registerButton} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.registerButtonText}>Crear Cuenta</Text>}
          </TouchableOpacity>
          
          <View style={{ height: 20 }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7f6' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: Platform.OS === 'ios' ? 50 : 30 },
  backButton: { padding: 8, marginRight: 4 },
  title: { fontSize: 22, fontWeight: 'bold', color: theme.colors.onPrimaryFixed },
  form: { flex: 1 },
  inputSection: { marginBottom: 20 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#666', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 5, marginLeft: 4 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 12, padding: 12, fontSize: 15, color: '#333', marginBottom: 10 },
  passwordWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 12, marginBottom: 10 },
  eyeIcon: { padding: 12 },
  genderContainer: { flexDirection: 'row', backgroundColor: '#eee', borderRadius: 12, padding: 4 },
  genderButton: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 10 },
  genderButtonActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  genderButtonText: { fontSize: 14, fontWeight: '600', color: '#777' },
  genderButtonTextActive: { color: theme.colors.primary },
  row: { flexDirection: 'row' },
  errorText: { color: theme.colors.error, marginBottom: 15, textAlign: 'center', fontSize: 14, fontWeight: '500' },
  registerButton: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  registerButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});

export default RegistrationScreen;