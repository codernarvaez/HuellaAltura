import re

with open('src/screens/main/labores/CalendarioLaboresScreen.js', 'r') as f:
    content = f.read()

# Import Picker
if "import { Picker }" not in content:
    content = content.replace("import { View, Text", "import { Picker } from '@react-native-picker/picker';\nimport actividadesData from '../../../data/actividades.json';\nimport { View, Text")

# Add mesForm to state
if "const [mesForm, setMesForm]" not in content:
    content = content.replace("const [cantidadProyectadaForm, setCantidadProyectadaForm] = useState('');", "const [cantidadProyectadaForm, setCantidadProyectadaForm] = useState('');\n  const [mesForm, setMesForm] = useState(MESES[new Date().getMonth()]);")

# Update openModal default
if "setMesForm" not in content:
    content = content.replace("setCantidadProyectadaForm('');", "setCantidadProyectadaForm('');\n      setMesForm(selectedMes);")

# Update agendar form payload
content = content.replace("""        const payload = {
          finca_id: finca.id,
          nombre: nombreForm,
          tipo_proceso: tipoProcesoForm,
          mes: selectedMes,
          cantidad_proyectada: cantidadProyectadaForm
        };""", """        const payload = {
          finca_id: finca.id,
          nombre: nombreForm,
          tipo_proceso: tipoProcesoForm,
          mes: mesForm,
          cantidad_proyectada: cantidadProyectadaForm
        };""")

# Update Agendar Form View
agendar_old = """              <>
                <Text style={styles.inputLabel}>Nombre de la labor *</Text>
                <TextInput style={styles.input} value={nombreForm} onChangeText={setNombreForm} placeholder="Ej. Poda de formación" />

                <Text style={styles.inputLabel}>Tipo de proceso *</Text>
                <TextInput style={styles.input} value={tipoProcesoForm} onChangeText={setTipoProcesoForm} placeholder="Ej. Agrícola" />

                <Text style={styles.inputLabel}>Cantidad Proyectada *</Text>
                <TextInput style={styles.input} value={cantidadProyectadaForm} onChangeText={setCantidadProyectadaForm} placeholder="Ej. 2 hectáreas" />
              </>"""

agendar_new = """              <>
                <Text style={styles.inputLabel}>Mes programado *</Text>
                <View style={styles.pickerContainer}>
                  <Picker selectedValue={mesForm} onValueChange={(val) => { setMesForm(val); }}>
                    {MESES.map(m => <Picker.Item key={m} label={m} value={m} />)}
                  </Picker>
                </View>

                <Text style={styles.inputLabel}>Actividad *</Text>
                <View style={styles.pickerContainer}>
                  <Picker selectedValue={nombreForm} onValueChange={(val) => {
                    setNombreForm(val);
                    const act = actividadesData.find(a => a.actividad === val);
                    if (act) {
                      setTipoProcesoForm(act.etapa);
                      setCantidadProyectadaForm(act.cantidad_ha ? `${act.cantidad_ha} ${act.unidad}` : '');
                    }
                  }}>
                    <Picker.Item label="Seleccione una actividad..." value="" />
                    {actividadesData.filter(a => a.mes.toLowerCase() === mesForm.toLowerCase()).map((a, i) => (
                      <Picker.Item key={i} label={a.actividad} value={a.actividad} />
                    ))}
                  </Picker>
                </View>

                <Text style={styles.inputLabel}>Etapa *</Text>
                <TextInput style={styles.input} value={tipoProcesoForm} onChangeText={setTipoProcesoForm} placeholder="Ej. Producción" />

                <Text style={styles.inputLabel}>Cantidad Proyectada *</Text>
                <TextInput style={styles.input} value={cantidadProyectadaForm} onChangeText={setCantidadProyectadaForm} placeholder="Ej. 2 hectáreas" />
              </>"""

content = content.replace(agendar_old, agendar_new)

# Update Ejecutar Form View
ejecutar_old = """              <>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 16 }}>Labor: {selectedLabor?.nombre}</Text>

                <Text style={styles.inputLabel}>Persona que desarrolla</Text>
                <TextInput style={styles.input} value={personaDesarrollo} onChangeText={setPersonaDesarrollo} placeholder="TITULAR, TERCERO..." />"""

ejecutar_new = """              <>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 16 }}>Labor: {selectedLabor?.nombre}</Text>
                <Text style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>Mes programado: {selectedLabor?.mes} (Visual)</Text>

                <Text style={styles.inputLabel}>Persona que desarrolla (Roles)</Text>
                <View style={styles.pickerContainer}>
                  <Picker selectedValue={personaDesarrollo} onValueChange={setPersonaDesarrollo}>
                    <Picker.Item label="TITULAR" value="TITULAR" />
                    <Picker.Item label="JORNALERO" value="JORNALERO" />
                    <Picker.Item label="TECNICO CAMPO" value="TECNICO_CAMPO" />
                    <Picker.Item label="TERCERO" value="TERCERO" />
                  </Picker>
                </View>"""

content = content.replace(ejecutar_old, ejecutar_new)

# Auto-fill Ejecutar using useEffect when selectedLabor changes
if "const act = actividadesData.find" not in content:
    auto_fill_effect = """  useEffect(() => {
    if (modalMode === 'EJECUTAR' && selectedLabor) {
      const act = actividadesData.find(a => a.actividad === selectedLabor.nombre);
      if (act) {
        setPersonaDesarrollo('TITULAR');
        setDetalleAplicacion(act.detalle || '');
        setSalario(act.precio_jornal ? act.precio_jornal : '');
        setHerramientas(act.herramientas || '');
        if (act.insumos && act.insumos !== 'Ninguno' && act.insumos !== 'Ninguno (-)') {
          setInsumoNombre(act.insumos);
          setInsumoCantidad(act.cantidad_ha !== '-' ? act.cantidad_ha : '');
          setInsumoUnidad(act.unidad !== '-' ? act.unidad : '');
        } else {
          setInsumoNombre('');
          setInsumoCantidad('');
          setInsumoUnidad('');
        }
      } else {
        setPersonaDesarrollo('TITULAR');
      }
    }
  }, [modalMode, selectedLabor]);\n"""
    
    content = content.replace("const fetchFincas = async () => {", auto_fill_effect + "\n  const fetchFincas = async () => {")

# Add styles.pickerContainer
if "pickerContainer:" not in content:
    content = content.replace("input: {", "pickerContainer: {\n    borderWidth: 1,\n    borderColor: '#e2e8f0',\n    borderRadius: 8,\n    marginBottom: 16,\n    backgroundColor: '#f8fafc',\n  },\n  input: {")

with open('src/screens/main/labores/CalendarioLaboresScreen.js', 'w') as f:
    f.write(content)
print("CalendarioLaboresScreen updated successfully")
