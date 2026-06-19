import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Trees, Leaf, PlusCircle, XCircle, Cloud } from 'lucide-react-native';
import { styles } from '../styles';
import { theme } from '../../../../theme/theme';

export const Step3Agroambiental = ({
  indiceShannon, setIndiceShannon, indiceSimpson, setIndiceSimpson, usoSuelo, setUsoSuelo,
  coberturaForestal, sistemaProduccion, setSistemaProduccion, biomasaArboles, setBiomasaArboles,
  biomasaCafe, setBiomasaCafe, hojarascaMantillo, setHojarascaMantillo, carbonoSuelo, setCarbonoSuelo,
  totalStockCarbono, camposDinamicos, actualizarCampoDinamico, eliminarCampoDinamico, agregarCampoDinamico
}) => (
  <View style={styles.stepContent}>
    <View style={styles.sectionHeader}>
      <Trees size={22} color="#fff" />
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

    <View style={styles.inputGroup}>
      <Text style={styles.label}>Uso de Suelo</Text>
      <TextInput style={styles.input} value={usoSuelo} onChangeText={setUsoSuelo} />
    </View>

    <View style={styles.inputGroup}>
      <Text style={styles.label}>Cobertura Forestal (Tags)</Text>
      <TextInput style={styles.input} value={coberturaForestal.join(', ')} editable={false} />
    </View>

    <View style={styles.inputGroup}>
      <Text style={styles.label}>Sistema de Producción</Text>
      <TextInput 
        style={[styles.input, { height: 60, textAlignVertical: 'top' }]} 
        value={sistemaProduccion} 
        onChangeText={setSistemaProduccion} 
        multiline 
        placeholder="Ej. Agroforestal"
      />
    </View>

    <View style={styles.sectionHeader}>
      <Leaf size={22} color="#fff" />
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

    <View style={styles.sectionHeader}>
      <PlusCircle size={22} color="#fff" />
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
      <PlusCircle size={18} color={theme.colors.primary} />
      <Text style={styles.addFieldText}>Añadir Variable</Text>
    </TouchableOpacity>
  </View>
);
