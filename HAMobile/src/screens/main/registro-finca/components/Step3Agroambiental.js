import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Trees, Leaf, PlusCircle, XCircle, Cloud } from 'lucide-react-native';
import { styles } from '../styles';
import { theme } from '../../../../theme/theme';
import {
  USO_SUELO_OPTIONS,
  COBERTURA_FORESTAL_OPTIONS,
  SISTEMA_PRODUCCION_OPTIONS,
} from '../../../../constants/agroEnums';

function EnumPicker({ label, value, onChange, options }) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.input,
          {
            paddingHorizontal: 0,
            paddingVertical: 0,
            justifyContent: 'center',
            overflow: 'hidden',
            height: Platform.OS === 'ios' ? 120 : 48,
          },
        ]}
      >
        <Picker
          selectedValue={value}
          onValueChange={onChange}
          style={{ color: theme.colors.onSurface, width: '100%' }}
          dropdownIconColor={theme.colors.onSurfaceVariant}
        >
          {options.map((opt) => (
            <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
          ))}
        </Picker>
      </View>
    </View>
  );
}

export const Step3Agroambiental = ({
  organizacion, setOrganizacion,
  indiceShannon, setIndiceShannon, indiceSimpson, setIndiceSimpson, usoSuelo, setUsoSuelo,
  coberturaForestal, setCoberturaForestal, sistemaProduccion, setSistemaProduccion,
  biomasaArboles, setBiomasaArboles,
  biomasaCafe, setBiomasaCafe, hojarascaMantillo, setHojarascaMantillo, carbonoSuelo, setCarbonoSuelo,
  totalStockCarbono, camposDinamicos, actualizarCampoDinamico, eliminarCampoDinamico, agregarCampoDinamico
}) => (
  <View style={styles.stepContent}>

    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Leaf size={20} color={theme.colors.secondaryFixed} />
        <Text style={styles.sectionTitle}>Información Agroambiental</Text>
      </View>

    <View style={styles.row}>
      <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
        <Text style={styles.label}>Ind. Shannon</Text>
        <TextInput style={styles.input} value={indiceShannon} onChangeText={setIndiceShannon} keyboardType="numeric" />
      </View>
      <View style={[styles.inputGroup, { flex: 1 }]}>
        <Text style={styles.label}>Ind. Simpson</Text>
        <TextInput style={styles.input} value={indiceSimpson} onChangeText={setIndiceSimpson} keyboardType="numeric" />
      </View>
    </View>

    <EnumPicker
      label="Uso de Suelo *"
      value={usoSuelo}
      onChange={setUsoSuelo}
      options={USO_SUELO_OPTIONS}
    />

    <EnumPicker
      label="Cobertura Forestal *"
      value={coberturaForestal}
      onChange={setCoberturaForestal}
      options={COBERTURA_FORESTAL_OPTIONS}
    />

    <EnumPicker
      label="Sistema de Producción *"
      value={sistemaProduccion}
      onChange={setSistemaProduccion}
      options={SISTEMA_PRODUCCION_OPTIONS}
    />

    </View>

    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Cloud size={20} color={theme.colors.secondaryFixed} />
        <Text style={styles.sectionTitle}>Biomasa y Carbono</Text>
      </View>

    <View style={styles.row}>
      <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
        <Text style={styles.label}>Biomasa Árboles</Text>
        <TextInput style={styles.input} value={biomasaArboles} onChangeText={setBiomasaArboles} keyboardType="numeric" />
      </View>
      <View style={[styles.inputGroup, { flex: 1 }]}>
        <Text style={styles.label}>Biomasa Café</Text>
        <TextInput style={styles.input} value={biomasaCafe} onChangeText={setBiomasaCafe} keyboardType="numeric" />
      </View>
    </View>

    <View style={styles.row}>
      <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
        <Text style={styles.label}>Hojarasca</Text>
        <TextInput style={styles.input} value={hojarascaMantillo} onChangeText={setHojarascaMantillo} keyboardType="numeric" />
      </View>
      <View style={[styles.inputGroup, { flex: 1 }]}>
        <Text style={styles.label}>Carbono Suelo</Text>
        <TextInput style={styles.input} value={carbonoSuelo} onChangeText={setCarbonoSuelo} keyboardType="numeric" />
      </View>
    </View>

    <View style={styles.inputGroup}>
      <Text style={styles.label}>Total Carbono Stock (tC/ha)</Text>
      <View style={styles.totalStockBox}>
         <Cloud size={20} color={theme.colors.onSecondaryFixedVariant} />
         <Text style={styles.totalStockValue}>{totalStockCarbono} tC/ha</Text>
      </View>
    </View>

    </View>

    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <PlusCircle size={20} color={theme.colors.secondaryFixed} />
        <Text style={styles.sectionTitle}>Variables Dinámicas</Text>
      </View>

    {camposDinamicos.map((campo) => (
      <View key={campo.id} style={styles.dynamicFieldRow}>
        <TextInput 
          style={[styles.input, { flex: 1, marginRight: 5, height: 40 }]} 
          placeholder="Nombre (ej. pH)" 
          value={campo.nombre}
          onChangeText={(v) => actualizarCampoDinamico(campo.id, 'nombre', v)}
        />
        <TextInput 
          style={[styles.input, { flex: 1, marginRight: 5, height: 40 }]} 
          placeholder="Valor" 
          value={campo.valor}
          onChangeText={(v) => actualizarCampoDinamico(campo.id, 'valor', v)}
        />
        <TouchableOpacity onPress={() => eliminarCampoDinamico(campo.id)}>
          <XCircle size={24} color={theme.colors.error} />
        </TouchableOpacity>
      </View>
    ))}

    <TouchableOpacity style={styles.addFieldButton} onPress={agregarCampoDinamico}>
      <Trees size={18} color={theme.colors.onPrimary} />
      <Text style={styles.addFieldText}>Agregar variable</Text>
    </TouchableOpacity>
    </View>
  </View>
);
