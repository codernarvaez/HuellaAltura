import { StyleSheet, Platform } from 'react-native';
import { theme } from '../../../theme/theme';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.primary },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  mainTitle: { ...theme.typography.headlineLgMobile, color: '#fff', fontSize: 22, marginBottom: 8, fontWeight: '700' },
  progressContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 8 },
  stepIndicatorWrapper: { flexDirection: 'row', alignItems: 'center' },
  stepCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  stepCircleActive: { backgroundColor: theme.colors.secondary, borderColor: theme.colors.secondaryFixed },
  stepNumber: { color: 'rgba(255,255,255,0.7)', fontWeight: '600', fontSize: 13 },
  stepNumberActive: { color: '#fff', fontWeight: 'bold' },
  stepLine: { width: 35, height: 2, backgroundColor: 'rgba(255,255,255,0.15)' },
  stepLineActive: { backgroundColor: theme.colors.secondary },
  
  formScroll: { flex: 1 },
  formContent: { paddingHorizontal: 16, paddingBottom: 80 },
  stepContent: { paddingTop: 12 },
  
  // Card style for sections
  card: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', paddingBottom: 6 },
  sectionTitle: { ...theme.typography.labelMd, fontSize: 16, color: theme.colors.secondaryFixed, marginLeft: 8, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  denseForm: { paddingHorizontal: 0 },
  inputGroupDense: { marginBottom: 10 },
  labelSmall: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginBottom: 4, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  inputDense: { backgroundColor: '#fff', borderRadius: 8, height: 40, paddingHorizontal: 12, color: '#333', fontSize: 14, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  inputDisabled: { backgroundColor: '#E8EAED', color: '#5F6368' },
  disabledInputRow: { flexDirection: 'row', alignItems: 'center' },
  
  infoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(142, 214, 170, 0.15)', padding: 10, borderRadius: 8, marginTop: 8, borderWidth: 1, borderColor: 'rgba(142, 214, 170, 0.3)' },
  infoText: { ...theme.typography.labelSm, color: theme.colors.primaryFixed, marginLeft: 8, flex: 1, fontSize: 11 },
  
  inputGroup: { marginBottom: 10 },
  label: { ...theme.typography.labelSm, color: 'rgba(255,255,255,0.9)', marginBottom: 4, fontWeight: '600', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3 },
  input: { backgroundColor: '#fff', borderRadius: 8, height: 42, paddingHorizontal: 12, color: '#202124', fontSize: 14, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  disabledInput: { backgroundColor: '#E8EAED' },
  
  totalStockBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 222, 165, 0.15)', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.secondaryFixedDim },
  totalStockValue: { ...theme.typography.headlineMd, color: theme.colors.secondaryFixed, marginLeft: 10, fontWeight: '700', fontSize: 18 },
  
  eudrIdCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)' },
  eudrIdIconContainer: { width: 36, height: 36, borderRadius: 8, backgroundColor: theme.colors.secondary, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  eudrIdContent: { flex: 1 },
  eudrIdCode: { color: theme.colors.primaryFixed, fontSize: 14, fontWeight: '700', letterSpacing: 1, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  eudrIdLabel: { color: 'rgba(255, 255, 255, 0.6)', fontSize: 9, marginTop: 2, textTransform: 'uppercase' },
  
  row: { flexDirection: 'row', marginBottom: 2 },
  locationButton: { backgroundColor: theme.colors.secondary, borderRadius: 8, height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, elevation: 2 },
  locationButtonText: { color: '#fff', fontWeight: 'bold', marginLeft: 6, fontSize: 12 },
  
  miniMapCard: { backgroundColor: 'rgba(0, 0, 0, 0.15)', borderRadius: 12, padding: 8, marginVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  miniMapHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 },
  miniMapTitle: { color: theme.colors.primaryFixed, fontSize: 12, fontWeight: '700', marginLeft: 6, textTransform: 'uppercase' },
  miniMapWrapper: { height: 120, borderRadius: 8, overflow: 'hidden' },
  
  footer: { flexDirection: 'row', padding: 12, backgroundColor: 'rgba(0, 67, 40, 0.95)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'space-between', paddingBottom: Platform.OS === 'ios' ? 24 : 12 },
  navButtonMinimal: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  submitButton: { backgroundColor: theme.colors.primaryFixedDim, height: 48, paddingHorizontal: 24, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  submitButtonText: { color: theme.colors.onPrimaryFixed, fontSize: 15, fontWeight: 'bold', textTransform: 'uppercase' },
  
  dynamicFieldRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  addFieldButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginTop: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  addFieldText: { color: '#fff', fontWeight: 'bold', marginLeft: 6, fontSize: 12 },
});
