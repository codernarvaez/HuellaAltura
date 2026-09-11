import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, TextInput, ScrollView, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { theme } from '../../../theme/theme';
import { useAuth } from '../../../contexts/AuthContext';
import { useAlert } from '../../../contexts/AlertContext';

import { endpoints } from '../../../api/endpoints';
import { Step3Agroambiental } from '../registro-finca/components/Step3Agroambiental';
import { Save, ChevronLeft, Search, MapPin, Trees, ChevronRight } from 'lucide-react-native';
import { obtenerToken } from '../../../services/TokenService';
import { db } from '../../../data/local/database';
import { fincas as fincasSchema, datosAgroambientales } from '../../../data/local/esquema';
import { eq } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';

export default function TecnicoCampoScreen() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [fincas, setFincas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedFinca, setSelectedFinca] = useState(null);
  const [search, setSearch] = useState('');
  
  const [datoId, setDatoId] = useState(null);
  const [indiceShannon, setIndiceShannon] = useState('');
  const [indiceSimpson, setIndiceSimpson] = useState('');
  const [usoSuelo, setUsoSuelo] = useState('');
  const [sistemaProduccion, setSistemaProduccion] = useState('');
  const [biomasaArboles, setBiomasaArboles] = useState('');
  const [biomasaCafe, setBiomasaCafe] = useState('');
  const [hojarascaMantillo, setHojarascaMantillo] = useState('');
  const [carbonoSuelo, setCarbonoSuelo] = useState('');
  const [totalStockCarbono, setTotalStockCarbono] = useState('');
  const [coberturaForestal, setCoberturaForestal] = useState({});
  const [organizacion, setOrganizacion] = useState('');
  const [camposDinamicos, setCamposDinamicos] = useState([]);

  useEffect(() => {
    fetchFincas();
  }, []);

  const fetchFincas = async () => {
    setLoading(true);
    try {
      // Copia local primero: disponible offline y en modo demostración
      let locales = [];
      try {
        locales = await db().select().from(fincasSchema);
      } catch (e) {
        console.warn('Error leyendo fincas locales:', e);
      }

      let remotas = [];
      const token = await obtenerToken();
      if (token) {
        try {
          const res = await fetch(endpoints.fincas.getAll, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            remotas = await res.json();
          }
        } catch (e) {
          console.warn('Red no disponible, se muestran fincas locales:', e.message);
        }
      }

      const combinadas = Array.from(
        new Map([...locales, ...remotas].map((f) => [f.id, f])).values()
      );
      setFincas(combinadas);
    } catch (error) {
      console.warn(error);
    } finally {
      setLoading(false);
    }
  };

  const aplicarDato = (dato) => {
    setDatoId(dato.id);
    setIndiceShannon(dato.indice_shannon?.toString() || '');
    setIndiceSimpson(dato.indice_simpson?.toString() || '');
    setUsoSuelo(dato.uso_suelo || '');
    setSistemaProduccion(dato.sistema_produccion || '');
    setBiomasaArboles(dato.biomasa_arboles?.toString() || '');
    setBiomasaCafe(dato.biomasa_cafe?.toString() || '');
    setHojarascaMantillo(dato.hojarasca_mantillo?.toString() || '');
    setCarbonoSuelo(dato.carbono_organico_suelo?.toString() || '');
    setTotalStockCarbono(dato.total_stock_carbono?.toString() || '');
  };

  const loadDatoAgroambiental = async (finca) => {
    setSelectedFinca(finca);
    setLoading(true);
    try {
      const token = await obtenerToken();
      if (token) {
        try {
          const res = await fetch(endpoints.agroambiental.getByFinca(finca.id), {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.length > 0) {
              aplicarDato(data[0]);
              return;
            }
            setDatoId(null);
            return;
          }
        } catch (e) {
          console.warn('Red no disponible, usando datos locales:', e.message);
        }
      }

      // Offline / demo: leer el dato agroambiental local
      const locales = await db()
        .select()
        .from(datosAgroambientales)
        .where(eq(datosAgroambientales.finca_id, finca.id))
        .limit(1);
      if (locales.length > 0) {
        aplicarDato(locales[0]);
      } else {
        setDatoId(null);
      }
    } catch (error) {
      console.warn(error);
    } finally {
      setLoading(false);
    }
  };

  const guardarAgroambiental = async () => {
    setSaving(true);
    try {
      const token = await obtenerToken();
      const payload = {
        finca_id: selectedFinca.id,
        indice_shannon: parseFloat(indiceShannon) || 0,
        indice_simpson: parseFloat(indiceSimpson) || 0,
        uso_suelo: usoSuelo,
        cobertura_forestal: JSON.stringify(coberturaForestal),
        sistema_produccion: sistemaProduccion,
        biomasa_arboles: parseFloat(biomasaArboles) || 0,
        biomasa_cafe: parseFloat(biomasaCafe) || 0,
        hojarasca_mantillo: parseFloat(hojarascaMantillo) || 0,
        carbono_organico_suelo: parseFloat(carbonoSuelo) || 0,
        total_stock_carbono: parseFloat(totalStockCarbono) || 0,
      };

      if (token) {
        const url = datoId ? `${endpoints.agroambiental.base}/${datoId}` : `${endpoints.agroambiental.base}/`;
        const method = datoId ? 'PATCH' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          showAlert('Éxito', 'Información agroambiental guardada correctamente', 'success');
          setSelectedFinca(null);
        } else {
          showAlert('Error', 'No se pudo guardar la información', 'error');
        }
        return;
      }

      // Offline / demo: upsert local con sync pendiente
      const sqlite = db();
      const valores = { ...payload, sync_status: 'pending' };
      if (datoId) {
        await sqlite.update(datosAgroambientales).set(valores).where(eq(datosAgroambientales.id, datoId));
      } else {
        await sqlite.insert(datosAgroambientales).values({
          id: Crypto.randomUUID(),
          creado_en: new Date(),
          ...valores,
        });
      }
      showAlert('Éxito', 'Información guardada localmente. Se sincronizará al recuperar la conexión.', 'success');
      setSelectedFinca(null);
    } catch (error) {
      showAlert('Error', 'Error de red', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredFincas = fincas.filter(f => f.nombre.toLowerCase().includes(search.toLowerCase()));

  if (selectedFinca) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setSelectedFinca(null)} style={{ padding: 8 }}>
              <ChevronLeft size={24} color={theme.colors.primary} />
            </TouchableOpacity>
            <Text style={styles.title}>{selectedFinca.nombre}</Text>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Step3Agroambiental 
              organizacion={organizacion} setOrganizacion={setOrganizacion}
              indiceShannon={indiceShannon} setIndiceShannon={setIndiceShannon}
              indiceSimpson={indiceSimpson} setIndiceSimpson={setIndiceSimpson}
              usoSuelo={usoSuelo} setUsoSuelo={setUsoSuelo}
              coberturaForestal={coberturaForestal}
              sistemaProduccion={sistemaProduccion} setSistemaProduccion={setSistemaProduccion}
              biomasaArboles={biomasaArboles} setBiomasaArboles={setBiomasaArboles}
              biomasaCafe={biomasaCafe} setBiomasaCafe={setBiomasaCafe}
              hojarascaMantillo={hojarascaMantillo} setHojarascaMantillo={setHojarascaMantillo}
              carbonoSuelo={carbonoSuelo} setCarbonoSuelo={setCarbonoSuelo}
              totalStockCarbono={totalStockCarbono}
              camposDinamicos={camposDinamicos}
              actualizarCampoDinamico={() => {}} eliminarCampoDinamico={() => {}} agregarCampoDinamico={() => {}}
            />
          </ScrollView>
          <View style={styles.footer}>
            <TouchableOpacity style={styles.submitButton} onPress={guardarAgroambiental} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <><Save size={18} color="#fff" style={{ marginRight: 8 }} /><Text style={styles.submitButtonText}>Guardar</Text></>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={styles.header}>
        <Text style={styles.title}>Fincas Registradas</Text>
      </View>
      <View style={{ padding: 16 }}>
        <View style={styles.searchBox}>
          <Search size={20} color={theme.colors.onSurfaceVariant} />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Buscar finca..." 
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={filteredFincas}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.fincaCard} onPress={() => loadDatoAgroambiental(item)} activeOpacity={0.7}>
              <View style={styles.fincaIconContainer}>
                <Trees size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.fincaInfoContainer}>
                <Text style={styles.fincaNombre}>{item.nombre}</Text>
                <View style={styles.locationRow}>
                  <MapPin size={14} color={theme.colors.outline} style={{ marginRight: 4 }} />
                  <Text style={styles.fincaSub}>{item.provincia}, {item.canton}</Text>
                </View>
              </View>
              <ChevronRight size={20} color={theme.colors.outlineVariant} />
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginLeft: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    height: 36,
  },
  fincaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    elevation: 3,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  fincaIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 67, 40, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  fincaInfoContainer: {
    flex: 1,
  },
  fincaNombre: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.onSurface,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fincaSub: {
    fontSize: 13,
    color: theme.colors.outline,
    fontWeight: '500',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 48,
    borderRadius: 24,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
