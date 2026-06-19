    setLoading(true);
    try {
      const sqlite = db();
      
      // 1. Generar UUIDs locales (v4)
      const fincaId = Crypto.randomUUID();
      const expedienteId = Crypto.randomUUID();
      const datoId = Crypto.randomUUID();

      // 2. Usar ID del productor logueado (ya está en DB local por el login)
      const productorId = user.id;

      // 3. Preparar Geometría (Formato GeoJSON)
      const coordenadasCerradas = [...puntos];
      if (puntos[0][0] !== puntos[puntos.length - 1][0] || puntos[0][1] !== puntos[puntos.length - 1][1]) {
        coordenadasCerradas.push(puntos[0]);
      }
      // El backend pide un Polígono GeoJSON estándar: [[ [lng, lat], ... ]]
      const geoJsonPoligono = {
        type: 'Polygon',
        coordinates: [coordenadasCerradas]
      };

      // 4. Guardar Finca Localmente (pending)
      await sqlite.insert(require('../../data/local/esquema').fincas).values({
        id: fincaId,
        nombre: nombreFinca,
        productor_id: productorId, 
        provincia,
        canton,
        parroquia,
        barrio_sector: barrio,
        area_total_ha: parseFloat(areaTotal) || 0,
        area_cultivada_ha: parseFloat(areaCultivada) || 0,
        tenencia: (tenencia || 'PROPIA').toUpperCase(),
        geometria_geojson: JSON.stringify(geoJsonPoligono),
        latitud_centro: parseFloat(latitud),
        longitud_centro: parseFloat(longitud),
        sync_status: 'pending',
        creado_en: new Date()
      });

      // 5. Guardar Expediente Localmente (pending)
      await sqlite.insert(require('../../data/local/esquema').expedientes).values({
        id: expedienteId,
        finca_id: fincaId,
        productor_id: productorId,
        organizacion_inquilino: organizacion,
        sync_status: 'pending',
        creado_en: new Date()
      });

      // 6. Guardar Datos Agroambientales (pending)
      await sqlite.insert(require('../../data/local/esquema').datosAgroambientales).values({
        id: datoId,
        expediente_id: expedienteId,
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
        sync_status: 'pending',
        creado_en: new Date()
      });

      // 7. Guardar Variables Dinámicas (pending)
      for (const campo of camposDinamicos) {
        if (campo.nombre && campo.valor) {
          await sqlite.insert(require('../../data/local/esquema').variablesDinamicas).values({
            id: Crypto.randomUUID(),
            dato_id: datoId,
            nombre: campo.nombre,
            valor: campo.valor,
            tipo_dato: 'STRING',
            sync_status: 'pending',
            creado_en: new Date()
          });
        }
      }

      showAlert('Éxito', 'Registro guardado localmente. Se sincronizará automáticamente al detectar conexión.', 'success', () => navigation.goBack());
      
      // Intentar sincronizar en segundo plano
      const token = await obtenerToken();
      if (token) {
        const { SyncService } = require('../../services/SyncService');
        SyncService.syncAll(token).catch(e => console.warn('Sync fallido:', e));
      }

      setStep(1);
      setPuntos([]);
      setNombreFinca('');
      setCamposDinamicos([]);

    } catch (error) {
      console.error('Error al guardar local:', error);
      showAlert('Error', 'No se pudo guardar el registro en la base de datos local.', 'error');
    } finally {
      setLoading(false);
    }