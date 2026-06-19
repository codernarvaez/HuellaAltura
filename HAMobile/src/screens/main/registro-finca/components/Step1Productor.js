import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { User, Info, GraduationCap } from 'lucide-react-native';
import { styles } from '../styles';
import { theme } from '../../../../theme/theme';

export const Step1Productor = ({
  nombreProductor, cedulaId, emailProductor, organizacion, celular, genero, edad, nivelEducativo
}) => (
  <View style={styles.stepContent}>
    <View style={styles.sectionHeader}>
      <User size={20} color="#fff" />
      <Text style={styles.sectionTitle}>Perfil del Productor (Lectura)</Text>
    </View>

    <View style={styles.denseForm}>
      <View style={styles.row}>
        <View style={[styles.inputGroupDense, { flex: 1, marginRight: 6 }]}>
          <Text style={styles.labelSmall}>Nombres</Text>
          <TextInput style={[styles.inputDense, styles.inputDisabled]} value={nombreProductor.split(' ')[0] || ''} editable={false} />
        </View>
        <View style={[styles.inputGroupDense, { flex: 1 }]}>
          <Text style={styles.labelSmall}>Apellidos</Text>
          <TextInput style={[styles.inputDense, styles.inputDisabled]} value={nombreProductor.split(' ').slice(1).join(' ') || ''} editable={false} />
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroupDense, { flex: 1.2, marginRight: 6 }]}>
          <Text style={styles.labelSmall}>Cédula</Text>
          <TextInput style={[styles.inputDense, styles.inputDisabled]} value={cedulaId} editable={false} />
        </View>
        <View style={[styles.inputGroupDense, { flex: 1 }]}>
          <Text style={styles.labelSmall}>Edad</Text>
          <TextInput style={[styles.inputDense, styles.inputDisabled]} value={edad} editable={false} />
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroupDense, { flex: 1, marginRight: 6 }]}>
          <Text style={styles.labelSmall}>Género</Text>
          <TextInput style={[styles.inputDense, styles.inputDisabled]} value={genero} editable={false} />
        </View>
        <View style={[styles.inputGroupDense, { flex: 1.5 }]}>
          <Text style={styles.labelSmall}>Celular</Text>
          <TextInput style={[styles.inputDense, styles.inputDisabled]} value={celular} editable={false} />
        </View>
      </View>

      <View style={styles.inputGroupDense}>
        <Text style={styles.labelSmall}>Nivel Educativo</Text>
        <View style={styles.disabledInputRow}>
          <GraduationCap size={16} color="rgba(255,255,255,0.5)" style={{ marginRight: 8 }} />
          <TextInput style={[styles.inputDense, styles.inputDisabled, { flex: 1 }]} value={nivelEducativo} editable={false} />
        </View>
      </View>

      <View style={styles.inputGroupDense}>
        <Text style={styles.labelSmall}>Correo Electrónico</Text>
        <TextInput style={[styles.inputDense, styles.inputDisabled]} value={emailProductor} editable={false} />
      </View>

      <View style={styles.inputGroupDense}>
        <Text style={styles.labelSmall}>Organización / Cooperativa</Text>
        <TextInput style={[styles.inputDense, styles.inputDisabled]} value={organizacion} editable={false} />
      </View>
    </View>
    <View style={styles.infoBox}>
      <Info size={16} color={theme.colors.primary} />
      <Text style={styles.infoText}>Estos datos provienen de tu perfil y no son editables en este formulario.</Text>
    </View>
  </View>
);
