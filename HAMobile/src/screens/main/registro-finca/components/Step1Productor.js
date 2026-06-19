import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { User, Info, GraduationCap, IdCard, Calendar, Users, Phone, Mail } from 'lucide-react-native';
import { theme } from '../../../../theme/theme';

const ProfileTile = ({ icon: Icon, label, value, color }) => (
  <View style={styles.tile}>
    <View style={[styles.iconWrapper, { backgroundColor: color + '15' }]}>
      <Icon size={22} color={color} />
    </View>
    <View style={styles.tileContent}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue} numberOfLines={1}>{value || '--'}</Text>
    </View>
  </View>
);

export const Step1Productor = ({
  nombreProductor, cedulaId, emailProductor, celular, genero, edad, nivelEducativo
}) => (
  <View style={styles.container}>
    
    {/* Main Profile Header */}
    <View style={styles.headerCard}>
      <View style={styles.avatarCircle}>
        <User size={36} color={theme.colors.onPrimaryFixed} />
      </View>
      <Text style={styles.producerName}>{nombreProductor || 'Productor'}</Text>
      <Text style={styles.producerSubtitle}>Titular de la Finca</Text>
    </View>

    {/* Info Grid */}
    <View style={styles.grid}>
      <View style={styles.gridRow}>
        <ProfileTile icon={IdCard} label="Cédula" value={cedulaId} color={theme.colors.secondary} />
        <ProfileTile icon={Phone} label="Celular" value={celular} color={theme.colors.primary} />
      </View>
      
      <View style={styles.gridRow}>
        <ProfileTile icon={Calendar} label="Edad" value={edad ? `${edad} años` : ''} color={theme.colors.tertiary} />
        <ProfileTile icon={Users} label="Género" value={genero} color="#1b329c" />
      </View>

      <View style={styles.gridRow}>
        <ProfileTile icon={GraduationCap} label="Educación" value={nivelEducativo} color="#9e1866" />
        <ProfileTile icon={Mail} label="Correo" value={emailProductor} color="#b3610b" />
      </View>
    </View>

    {/* Spacer to separate grid from info box */}
    <View style={{ height: 24 }} />

    {/* Info Box */}
    <View style={styles.infoBox}>
      <Info size={20} color={theme.colors.primary} style={{ marginRight: 12 }} />
      <Text style={styles.infoText}>Estos datos provienen de tu perfil y se vincularán automáticamente al registro de la finca.</Text>
    </View>

  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 20,
  },
  headerCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primaryFixed,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  producerName: {
    color: theme.colors.primary,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  producerSubtitle: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  grid: {
    gap: 10,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tile: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  tileContent: {
    flex: 1,
  },
  tileLabel: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  tileValue: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoText: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
    fontWeight: '600',
  },
});
