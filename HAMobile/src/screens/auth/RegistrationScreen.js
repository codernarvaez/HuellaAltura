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
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { theme } from '../../theme/theme';
import { ChevronLeft } from 'lucide-react-native';

const RegistrationScreen = ({ navigation }) => {
  const { register, loading } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    identifier: '',
    phone_number: '',
    edad: '',
    genero: 'Masculino',
  });

  const [error, setError] = useState('');

  const handleChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
    if (error) setError('');
  };

  const handleRegister = async () => {
    // Basic validation
    if (!formData.email || !formData.password || !formData.first_name || !formData.last_name || !formData.identifier || !formData.phone_number) {
      setError('Por favor complete todos los campos requeridos.');
      return;
    }

    const payload = {
      ...formData,
      edad: parseInt(formData.edad) || 0,
      // role_name and status are handled with defaults in AuthContext
    };

    const result = await register(payload);

    if (result.success) {
      Alert.alert('Éxito', 'Registro completado. Por favor, inicie sesión.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } else {
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
              <TextInput style={[styles.input, { flex: 1, marginRight: 8 }]} placeholder="Nombres *" value={formData.first_name} onChangeText={(text) => handleChange('first_name', text)} />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Apellidos *" value={formData.last_name} onChangeText={(text) => handleChange('last_name', text)} />
            </View>

            <View style={styles.row}>
              <TextInput style={[styles.input, { flex: 1.5, marginRight: 8 }]} placeholder="Identificación *" value={formData.identifier} onChangeText={(text) => handleChange('identifier', text)} />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Edad" value={formData.edad} onChangeText={(text) => handleChange('edad', text)} keyboardType="numeric" />
            </View>
            
            <TextInput style={styles.input} placeholder="Género" value={formData.genero} onChangeText={(text) => handleChange('genero', text)} />
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.sectionLabel}>Contacto y Seguridad</Text>
            <TextInput style={styles.input} placeholder="Correo Electrónico *" value={formData.email} onChangeText={(text) => handleChange('email', text)} keyboardType="email-address" autoCapitalize="none" />
            <TextInput style={styles.input} placeholder="Teléfono *" value={formData.phone_number} onChangeText={(text) => handleChange('phone_number', text)} keyboardType="phone-pad" />
            <TextInput style={styles.input} placeholder="Contraseña *" value={formData.password} onChangeText={(text) => handleChange('password', text)} secureTextEntry />
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
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 12, padding: 12, fontSize: 15, color: '#333', marginBottom: 10 },
  row: { flexDirection: 'row' },
  errorText: { color: theme.colors.error, marginBottom: 15, textAlign: 'center', fontSize: 14, fontWeight: '500' },
  registerButton: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  registerButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});

export default RegistrationScreen;