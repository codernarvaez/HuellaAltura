import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { Home, Map as MapIcon, Maximize2, LocateFixed, Layers } from 'lucide-react-native';
import { FarmMapEditor } from '../../../../components/map/FarmMapEditor';
import { styles } from '../styles';
import { theme } from '../../../../theme/theme';

export const Step2Finca = ({
  setShowFullMap, latitud, longitud, puntos, locating, obtenerUbicacionActual,
  nombreFinca, setNombreFinca, eudrId, provincia, setProvincia, canton, setCanton,
  parroquia, setParroquia, barrio, setBarrio, areaTotal, setAreaTotal,
  areaCultivada, setAreaCultivada, tenencia, setTenencia,
  organizacion, setOrganizacion, setIsDrawing,
}) => {
  const n = puntos?.length || 0;
  const polyOk = n >= 3;
  const polyHint = n === 0
    ? 'Sin polígono · toca el mapa para dibujar (sin límite de vértices)'
    : polyOk
      ? `${n} vértices · toca para afinar con más puntos`
      : `${n}/3 mín. · agrega más vértices`;

  return (
  <View style={styles.stepContent}>
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <MapIcon size={20} color={theme.colors.secondaryFixed} />
        <Text style={styles.sectionTitle}>Georreferenciación</Text>
      </View>

      {/* MapView NO dentro de TouchableOpacity (Android GL negro). Overlay captura el toque. */}
      <View style={styles.miniMapCard}>
        <View style={styles.miniMapHeader}>
          <LocateFixed size={16} color={theme.colors.primaryFixed} />
          <Text style={styles.miniMapTitle}>Polígono de la Finca</Text>
          <Maximize2 size={16} color={theme.colors.primaryFixed} style={{ marginLeft: 'auto' }} />
        </View>
        <View style={styles.miniMapWrapper}>
          <FarmMapEditor
            fullScreen={false}
            styleMode="satellite"
            latitud={latitud}
            longitud={longitud}
            puntos={puntos}
          />
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            onPress={() => {
              setIsDrawing?.(true);
              setShowFullMap(true);
            }}
            activeOpacity={0.95}
          />
        </View>
        <TouchableOpacity
          onPress={() => {
            setIsDrawing?.(true);
            setShowFullMap(true);
          }}
          activeOpacity={0.85}
        >
          <Text style={[styles.polyStatus, polyOk ? styles.polyStatusOk : styles.polyStatusWarn]}>
            {polyHint}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <TouchableOpacity style={styles.locationButton} onPress={obtenerUbicacionActual}>
          {locating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <LocateFixed size={20} color="#fff" />
              <Text style={styles.locationButtonText}>GPS Centro</Text>
            </>
          )}
        </TouchableOpacity>
        <View style={{ width: 10 }} />
        <View style={[styles.inputGroup, { flex: 1, marginBottom: 0 }]}>
          <TextInput
            style={[styles.input, { height: 42, fontSize: 12 }]}
            value={`${latitud}, ${longitud}`}
            editable={false}
          />
        </View>
      </View>
    </View>

    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Home size={20} color={theme.colors.secondaryFixed} />
        <Text style={styles.sectionTitle}>Datos Generales</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Nombre de la Finca</Text>
        <TextInput
          style={styles.input}
          value={nombreFinca}
          onChangeText={setNombreFinca}
          placeholder="Ej. La Esperanza"
          placeholderTextColor="#9AA0A6"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Organización a la que pertenece</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
        >
          {['FAPECAFES', 'PROCAFEQ', 'ACRCR', 'ASOPROCAFE', 'INDEPENDIENTE'].map((org) => (
            <TouchableOpacity
              key={org}
              onPress={() => setOrganizacion(org)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                backgroundColor: organizacion === org ? theme.colors.primary : '#E8EAED',
                borderRadius: 20,
              }}
            >
              <Text
                style={{
                  color: organizacion === org ? '#fff' : '#5F6368',
                  fontWeight: organizacion === org ? 'bold' : '600',
                  fontSize: 13,
                }}
              >
                {org}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Código de ubicación</Text>
        <View style={styles.eudrIdCard}>
          <View style={styles.eudrIdIconContainer}>
            <Layers size={18} color="#fff" />
          </View>
          <View style={styles.eudrIdContent}>
            <Text style={styles.eudrIdCode}>{eudrId || 'CALCULANDO...'}</Text>
            <Text style={styles.eudrIdLabel}>Referencia local (no es Plus Code oficial)</Text>
          </View>
        </View>
      </View>
    </View>

    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <MapIcon size={20} color={theme.colors.secondaryFixed} />
        <Text style={styles.sectionTitle}>Ubicación Política</Text>
      </View>
      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>Provincia</Text>
          <TextInput
            style={styles.input}
            value={provincia}
            onChangeText={setProvincia}
            placeholder="Ej. Loja"
            placeholderTextColor="#9AA0A6"
          />
        </View>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.label}>Cantón</Text>
          <TextInput
            style={styles.input}
            value={canton}
            onChangeText={setCanton}
            placeholder="Ej. Loja"
            placeholderTextColor="#9AA0A6"
          />
        </View>
      </View>
      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>Parroquia</Text>
          <TextInput
            style={[styles.input, provincia.toUpperCase() !== 'LOJA' && styles.disabledInput]}
            value={parroquia}
            onChangeText={setParroquia}
            placeholder={provincia.toUpperCase() === 'LOJA' ? 'Ej. El Sagrario' : 'Solo en Loja'}
            placeholderTextColor="#9AA0A6"
            editable={provincia.toUpperCase() === 'LOJA'}
          />
        </View>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.label}>Barrio / Sector</Text>
          <TextInput
            style={styles.input}
            value={barrio}
            onChangeText={setBarrio}
            placeholder="Ej. Malacatos"
            placeholderTextColor="#9AA0A6"
          />
        </View>
      </View>
    </View>

    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Layers size={20} color={theme.colors.secondaryFixed} />
        <Text style={styles.sectionTitle}>Detalles y Tenencia</Text>
      </View>
      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>Área Total (Ha)</Text>
          <TextInput
            style={styles.input}
            value={areaTotal}
            onChangeText={setAreaTotal}
            keyboardType="numeric"
            placeholderTextColor="#9AA0A6"
          />
        </View>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.label}>Área Cultivo (Ha)</Text>
          <TextInput
            style={styles.input}
            value={areaCultivada}
            onChangeText={setAreaCultivada}
            keyboardType="numeric"
            placeholderTextColor="#9AA0A6"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Tenencia de Tierra</Text>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            backgroundColor: '#E8EAED',
            borderRadius: 12,
            padding: 4,
            marginTop: 5,
          }}
        >
          {['PROPIA', 'POSESION', 'ARRENDAMIENTO'].map((tipo) => (
            <TouchableOpacity
              key={tipo}
              onPress={() => setTenencia(tipo)}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 10,
                borderRadius: 8,
                backgroundColor: tenencia === tipo ? theme.colors.primary : 'transparent',
              }}
            >
              <Text
                style={{
                  color: tenencia === tipo ? '#fff' : '#5F6368',
                  fontSize: 11,
                  fontWeight: tenencia === tipo ? 'bold' : '600',
                }}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {tipo}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  </View>
  );
};
