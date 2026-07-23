import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  FileText, Camera, CheckCircle2, CircleAlert, Trash2, FileUp, ShieldCheck,
} from 'lucide-react-native';
import { styles } from '../styles';
import { theme } from '../../../../theme/theme';
import { TIPOS_DOCUMENTO } from '../../../../services/DocumentosService';

// expo-document-picker es un módulo nativo: si el dev client instalado aún no
// lo incluye, la app no debe romperse — se ofrece la cámara como alternativa.
let DocumentPicker = null;
try {
  DocumentPicker = require('expo-document-picker');
} catch (e) {
  DocumentPicker = null;
}

/**
 * Paso 3 del registro de finca: expediente documental (M1 RF-07/08/10).
 * Cada requisito acepta un PDF o una fotografía del documento físico.
 */
export const Step3Documentos = ({ documentos, adjuntarDocumento, eliminarDocumento }) => {
  const documentosPorTipo = (clave) => documentos.filter((d) => d.tipo_documento === clave);

  const elegirPdf = async (tipo) => {
    if (!DocumentPicker) {
      Alert.alert(
        'Módulo no disponible',
        'Este build de la app aún no incluye el selector de archivos (requiere recompilar el dev client con expo-document-picker). Use la opción de fotografía.'
      );
      return;
    }
    try {
      const resultado = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (resultado.canceled || !resultado.assets?.length) return;
      const archivo = resultado.assets[0];
      await adjuntarDocumento(tipo.clave, {
        uri: archivo.uri,
        name: archivo.name,
        mimeType: archivo.mimeType || 'application/pdf',
        size: archivo.size,
      });
    } catch (e) {
      Alert.alert('Error', 'No se pudo adjuntar el PDF seleccionado.');
    }
  };

  const fotografiar = async (tipo) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Se requiere la cámara para fotografiar el documento.');
      return;
    }
    try {
      const resultado = await ImagePicker.launchCameraAsync({ quality: 0.6 });
      if (resultado.canceled || !resultado.assets?.length) return;
      const foto = resultado.assets[0];
      await adjuntarDocumento(tipo.clave, {
        uri: foto.uri,
        name: `${tipo.clave.toLowerCase()}_${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
        size: foto.fileSize,
      });
    } catch (e) {
      Alert.alert('Error', 'No se pudo capturar la fotografía del documento.');
    }
  };

  return (
    <View style={styles.stepContent}>
      <View style={styles.sectionHeader}>
        <FileText size={20} color={theme.colors.secondaryFixed} />
        <Text style={styles.sectionTitle}>Expediente Documental</Text>
      </View>

      <View style={styles.infoBox}>
        <ShieldCheck size={16} color={theme.colors.primaryFixed} />
        <Text style={styles.infoText}>
          Adjunte los documentos legales en PDF o fotografíelos. Se guardan cifrados en el
          dispositivo con su huella digital (SHA-256) y se subirán al expediente al sincronizar.
        </Text>
      </View>

      {TIPOS_DOCUMENTO.map((tipo) => {
        const adjuntos = documentosPorTipo(tipo.clave);
        const completo = adjuntos.length > 0;
        return (
          <View key={tipo.clave} style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              {completo ? (
                <CheckCircle2 size={18} color={theme.colors.primaryFixedDim} />
              ) : (
                <CircleAlert size={18} color={tipo.obligatorio ? theme.colors.secondaryFixed : 'rgba(255,255,255,0.4)'} />
              )}
              <Text style={docStyles.tituloRequisito}>
                {tipo.etiqueta}
                {tipo.obligatorio ? ' *' : ''}
              </Text>
            </View>

            {adjuntos.map((doc) => (
              <View key={doc.id} style={docStyles.archivoRow}>
                <FileText size={14} color={theme.colors.primaryFixed} />
                <View style={{ flex: 1 }}>
                  <Text style={docStyles.archivoNombre} numberOfLines={1}>{doc.nombre_archivo}</Text>
                  <Text style={docStyles.archivoMeta}>
                    {doc.mime === 'application/pdf' ? 'PDF' : 'Fotografía'}
                    {doc.tamano_bytes ? ` · ${(doc.tamano_bytes / 1024).toFixed(0)} KB` : ''}
                    {doc.hash_sha256 ? ` · SHA-256 ✓` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => eliminarDocumento(doc)}
                  style={{ padding: 6 }}
                  accessibilityLabel={`Eliminar ${doc.nombre_archivo}`}
                >
                  <Trash2 size={16} color={theme.colors.tertiaryFixedDim} />
                </TouchableOpacity>
              </View>
            ))}

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TouchableOpacity style={docStyles.accionBtn} onPress={() => elegirPdf(tipo)}>
                <FileUp size={16} color="#fff" />
                <Text style={docStyles.accionBtnText}>Adjuntar PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[docStyles.accionBtn, docStyles.accionBtnSecundario]} onPress={() => fotografiar(tipo)}>
                <Camera size={16} color={theme.colors.primaryFixed} />
                <Text style={[docStyles.accionBtnText, { color: theme.colors.primaryFixed }]}>Fotografiar</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const docStyles = {
  tituloRequisito: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
    flex: 1,
  },
  archivoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
  },
  archivoNombre: { color: '#fff', fontSize: 12, fontWeight: '600' },
  archivoMeta: { color: 'rgba(255,255,255,0.55)', fontSize: 10, marginTop: 1 },
  accionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.secondary,
    borderRadius: 8,
    paddingVertical: 10,
  },
  accionBtnSecundario: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(142, 214, 170, 0.4)',
  },
  accionBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
};
