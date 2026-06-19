import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Home, Map as MapIcon, Maximize2, LocateFixed, Layers } from 'lucide-react-native';
import { FarmMapEditor } from '../../../../components/map/FarmMapEditor';
import { styles } from '../styles';

export const Step2Finca = ({
  setShowFullMap, latitud, longitud, puntos, locating, obtenerUbicacionActual,
  nombreFinca, setNombreFinca, eudrId, provincia, setProvincia, canton, setCanton,
  parroquia, setParroquia, barrio, setBarrio, areaTotal, setAreaTotal,
  areaCultivada, setAreaCultivada, tenencia, setTenencia
}) => (
  <View style={styles.stepContent}>
    <View style={styles.sectionHeader}>
      <Home size={22} color="#fff" />
      <Text style={styles.sectionTitle}>Información de la Finca</Text>
    </View>

    <TouchableOpacity style={styles.miniMapCard} onPress={() => setShowFullMap(true)}>
      <View style={styles.miniMapHeader}>
        <MapIcon size={18} color="#fff" />
        <Text style={styles.miniMapTitle}>Georreferenciación (Polígono)</Text>
        <Maximize2 size={18} color="#fff" style={{ marginLeft: 'auto' }} />
      </View>
      <View style={styles.miniMapWrapper}>
        <FarmMapEditor
          fullScreen={false}
          latitud={latitud}
          longitud={longitud}
          puntos={puntos}
        />
      </View>
    </TouchableOpacity>

    <View style={styles.row}>
      <TouchableOpacity style={styles.locationButton} onPress={obtenerUbicacionActual}>
        {locating ? <ActivityIndicator color="#fff" /> : <><LocateFixed size={20} color="#fff" /><Text style={styles.locationButtonText}>GPS Centro</Text></>}
      </TouchableOpacity>
      <View style={{ width: 10 }} />
      <View style={[styles.inputGroup, { flex: 1 }]}>
        <TextInput style={[styles.input, { height: 45, fontSize: 12 }]} value={`${latitud}, ${longitud}`} editable={false} />
      </View>
    </View>

    <View style={styles.inputGroup}>
      <Text style={styles.label}>Nombre de la Finca</Text>
      <TextInput style={styles.input} value={nombreFinca} onChangeText={setNombreFinca} placeholder="Ej. La Esperanza" />
    </View>

    <View style={styles.inputGroup}>
      <Text style={styles.label}>Código Único (EUDR ID)</Text>
      <View style={styles.eudrIdCard}>
        <View style={styles.eudrIdIconContainer}>
          <Layers size={18} color="#fff" />
        </View>
        <View style={styles.eudrIdContent}>
          <Text style={styles.eudrIdCode}>{eudrId || 'CALCULANDO...'}</Text>
          <Text style={styles.eudrIdLabel}>Sincronizado con Google Plus Code</Text>
        </View>
      </View>
    </View>

    <Text style={[styles.label, { marginBottom: 10, marginTop: 5, fontSize: 14, textDecorationLine: 'underline' }]}>Ubicación Política</Text>
    <View style={styles.row}>
      <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
        <Text style={styles.label}>Provincia</Text>
        <TextInput style={styles.input} value={provincia} onChangeText={setProvincia} placeholder="Ej. Loja" />
      </View>
      <View style={[styles.inputGroup, { flex: 1 }]}>
        <Text style={styles.label}>Cantón</Text>
        <TextInput style={styles.input} value={canton} onChangeText={setCanton} placeholder="Ej. Loja" />
      </View>
    </View>
    <View style={styles.row}>
      <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
        <Text style={styles.label}>Parroquia</Text>
        <TextInput 
          style={[styles.input, (provincia.toUpperCase() !== 'LOJA') && styles.disabledInput]} 
          value={parroquia} 
          onChangeText={setParroquia} 
          placeholder={provincia.toUpperCase() === 'LOJA' ? "Ej. El Sagrario" : "Solo en Loja"} 
          editable={provincia.toUpperCase() === 'LOJA'}
        />
      </View>
      <View style={[styles.inputGroup, { flex: 1 }]}>
        <Text style={styles.label}>Barrio / Sector</Text>
        <TextInput style={styles.input} value={barrio} onChangeText={setBarrio} placeholder="Ej. Malacatos" />
      </View>
    </View>

    <View style={styles.row}>
      <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
        <Text style={styles.label}>Área Total (Ha)</Text>
        <TextInput style={styles.input} value={areaTotal} onChangeText={setAreaTotal} keyboardType="numeric" />
      </View>
      <View style={[styles.inputGroup, { flex: 1 }]}>
        <Text style={styles.label}>Área Cultivo (Ha)</Text>
        <TextInput style={styles.input} value={areaCultivada} onChangeText={setAreaCultivada} keyboardType="numeric" />
      </View>
    </View>

    <View style={styles.inputGroup}>
      <Text style={styles.label}>Tenencia de Tierra</Text>
      <TextInput style={styles.input} value={tenencia} onChangeText={setTenencia} placeholder="Propia, Arrendada, etc." />
    </View>
  </View>
);
