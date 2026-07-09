class NormativaService:
    SUGERENCIAS_BASE = {
        "enero": ["Siembras", "Deshierbas", "Fertilizaciones"],
        "febrero": ["Control de plagas", "Manejo de sombras"],
        "marzo": ["Control de enfermedades", "Deshierbas"],
        "abril": ["Podas", "Manejo de malezas"],
        "mayo": ["Manejo de malezas", "Enmiendas"],
        "junio": ["Control de plagas", "Preparación para cosecha"],
        "julio": ["Recolección (Cosecha temprana)"],
        "agosto": ["Recolección (Cosecha principal)"],
        "septiembre": ["Recolección", "Manejo post-cosecha"],
        "octubre": ["Podas sanitarias", "Fertilización post-cosecha"],
        "noviembre": ["Manejo de sombras", "Deshierbas"],
        "diciembre": ["Planificación anual", "Control de malezas"]
    }

    PROHIBIDOS_ORGANICO = ["diez", "treinta", "dap", "matamonte", "herbicida", "pesticida", "químico"]
    JORNAL_MINIMO_JUSTO = 15.0

    @classmethod
    def obtener_sugerencias(cls, mes: str) -> list[dict]:
        mes_lower = mes.lower()
        if mes_lower not in cls.SUGERENCIAS_BASE:
            raise ValueError("Mes no válido. Usa un mes de Enero a Diciembre.")
        
        return [
            {
                "nombre": sugerencia,
                "tipo_proceso": "Manejo Agronómico" if sugerencia != "Recolección" else "Cosecha"
            } for sugerencia in cls.SUGERENCIAS_BASE[mes_lower]
        ]

    @classmethod
    def evaluar_cumplimiento(cls, ejecucion) -> dict:
        # Validación Orgánico
        cumple_organico = True
        motivo_organico = "Cumple: Insumos permitidos."
        insumos_usados = [i.nombre.lower() for i in ejecucion.insumos] if ejecucion.insumos else []
        
        for insumo in insumos_usados:
            if any(prohibido in insumo for prohibido in cls.PROHIBIDOS_ORGANICO):
                cumple_organico = False
                motivo_organico = f"No Cumple: Uso de químico o insumo prohibido detectado ({insumo})."
                break
        
        # Validación Comercio Justo
        cumple_comercio_justo = True
        motivo_comercio_justo = "Cumple: Parámetros laborales adecuados."
        if ejecucion.salario is not None and ejecucion.salario < cls.JORNAL_MINIMO_JUSTO:
            cumple_comercio_justo = False
            motivo_comercio_justo = f"No Cumple: El salario registrado (${ejecucion.salario}) es inferior al mínimo (${cls.JORNAL_MINIMO_JUSTO})."

        es_valido_global = cumple_organico and cumple_comercio_justo

        return {
            "estado_sugerido": "PRE_VALIDADO" if es_valido_global else "NO CUMPLE",
            "detalles": {
                "organico": {"cumple": cumple_organico, "observacion": motivo_organico},
                "comercio_justo": {"cumple": cumple_comercio_justo, "observacion": motivo_comercio_justo}
            }
        }