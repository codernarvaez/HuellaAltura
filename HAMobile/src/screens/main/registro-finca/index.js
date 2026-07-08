import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Save } from 'lucide-react-native';
import { theme } from '../../../theme/theme';

import { styles } from './styles';
import { useRegistroFinca } from './hooks/useRegistroFinca';
import { ProgressBar } from './components/ProgressBar';
import { Step1Productor } from './components/Step1Productor';
import { Step2Finca } from './components/Step2Finca';
import { FarmMapEditor } from '../../../components/map/FarmMapEditor';

const RegistroFincaScreen = ({ navigation }) => {
  const state = useRegistroFinca(navigation);

  if (state.showFullMap) {
    return (
      <FarmMapEditor 
        fullScreen={true}
        latitud={state.latitud}
        longitud={state.longitud}
        puntos={state.puntos}
        isDrawing={state.isDrawing}
        setIsDrawing={state.setIsDrawing}
        agregarPunto={state.agregarPunto}
        limpiarMapa={state.limpiarMapa}
        deshacerPunto={state.deshacerPunto}
        onClose={() => state.setShowFullMap(false)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.mainTitle}>Registro de Finca</Text>
          <ProgressBar step={state.step} setStep={state.setStep} />
        </View>

        <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
          {state.step === 1 && <Step1Productor {...state} />}
          {state.step === 2 && <Step2Finca {...state} />}
        </ScrollView>

        <View style={styles.footer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            {state.step > 1 ? (
              <TouchableOpacity style={styles.navButtonMinimal} onPress={() => state.setStep(state.step - 1)}>
                <ChevronLeft size={20} color={theme.colors.primary} style={{ marginRight: 4 }} />
                <Text style={styles.navButtonMinimalText}>Atrás</Text>
              </TouchableOpacity>
            ) : <View style={{ width: 100 }} />}

            <View style={{ flex: 1 }} />

            {state.step < 2 ? (
              <TouchableOpacity style={styles.navButtonMinimal} onPress={() => state.setStep(state.step + 1)}>
                <Text style={styles.navButtonMinimalText}>Sig.</Text>
                <ChevronRight size={20} color={theme.colors.primary} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.submitButton} onPress={state.guardarRegistro} disabled={state.loading}>
                {state.loading ? <ActivityIndicator color="#fff" /> : <><Save size={18} color="#fff" style={{ marginRight: 8 }} /><Text style={styles.submitButtonText}>Finalizar</Text></>}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default RegistroFincaScreen;
