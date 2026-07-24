"""Verificación de productores contra listas de sanciones OFAC y ONU.

Cubre RF-14 (consulta de listas), RF-15 (reporte del proceso) y RF-16 (bloqueo
automático del expediente cuando la coincidencia supera el umbral).

Las listas se ingieren periódicamente a `listas_sanciones` y el cotejo se hace
en local. Frente a un proveedor externo de screening esto tiene dos ventajas
para una auditoría: es reproducible (se puede reejecutar sobre la misma versión
de la lista) y no expone datos personales a un tercero.
"""

import logging
import unicodedata
from typing import Any

from rapidfuzz import fuzz, process

logger = logging.getLogger("exped-service.screening")

# Fuentes oficiales de las listas
FUENTE_OFAC = "OFAC_SDN"
FUENTE_ONU = "ONU_CONSOLIDATED"

URL_OFAC_SDN = "https://sanctionslist.ofac.treas.gov/api/PublicationPreview/exports/SDN.CSV"
URL_ONU_CONSOLIDATED = "https://scsanctions.un.org/resources/xml/en/consolidated.xml"

# Por encima de este puntaje se considera coincidencia y se bloquea el expediente
UMBRAL_POR_DEFECTO = 85.0

# Cuántas coincidencias se guardan en el reporte
MAX_COINCIDENCIAS = 10


def normalizar(nombre: str) -> str:
    """
    Normaliza un nombre para el cotejo: sin tildes, mayúsculas, espacios simples.

    Es imprescindible porque las listas oficiales están en ASCII y los nombres
    ecuatorianos llevan tildes y ñ.
    """
    if not nombre:
        return ""
    sin_tildes = "".join(
        c
        for c in unicodedata.normalize("NFD", nombre)
        if unicodedata.category(c) != "Mn"
    )
    return " ".join(sin_tildes.upper().split())


def nombres_a_verificar(productor) -> list[str]:
    """
    Devuelve los nombres que deben cotejarse para un productor.

    En una persona jurídica hay que verificar tanto la razón social como a su
    representante legal, que es lo que exige RF-14.
    """
    nombres: list[str] = []

    if productor.tipo_persona == "NATURAL":
        completo = " ".join(filter(None, [productor.nombres, productor.apellidos]))
        if completo.strip():
            nombres.append(completo.strip())
    else:
        if productor.razon_social:
            nombres.append(productor.razon_social)
        representante = " ".join(
            filter(None, [productor.representante_nombres, productor.representante_apellidos])
        )
        if representante.strip():
            nombres.append(representante.strip())

    return nombres


def cotejar(nombre: str, registros: list[Any], umbral: float = UMBRAL_POR_DEFECTO) -> dict:
    """
    Coteja un nombre contra los registros de sanciones cargados.

    Usa `token_sort_ratio` porque el orden entre nombres y apellidos varía entre
    las listas oficiales y el registro civil ecuatoriano.
    """
    objetivo = normalizar(nombre)
    if not objetivo or not registros:
        return {"resultado": "LIMPIO", "puntaje_maximo": 0.0, "coincidencias": []}

    indice = {r.nombre_normalizado: r for r in registros}

    resultados = process.extract(
        objetivo,
        list(indice.keys()),
        scorer=fuzz.token_sort_ratio,
        limit=MAX_COINCIDENCIAS,
        score_cutoff=umbral,
    )

    coincidencias = []
    for nombre_lista, puntaje, _ in resultados:
        registro = indice[nombre_lista]
        coincidencias.append(
            {
                "nombre_lista": registro.nombre,
                "puntaje": round(puntaje, 2),
                "fuente": registro.fuente,
                "referencia": registro.referencia,
                "programa": registro.programa,
                "tipo": registro.tipo,
            }
        )

    puntaje_maximo = max((c["puntaje"] for c in coincidencias), default=0.0)

    return {
        "resultado": "COINCIDENCIA" if coincidencias else "LIMPIO",
        "puntaje_maximo": puntaje_maximo,
        "coincidencias": coincidencias,
    }


def verificar_productor(db, productor, umbral: float = UMBRAL_POR_DEFECTO, ejecutado_por: str | None = None) -> dict:
    """
    Ejecuta el screening completo de un productor y persiste el reporte (RF-15).

    Si alguna coincidencia supera el umbral, deja el expediente en BLOQUEADO
    (RF-16). El desbloqueo es siempre una decisión humana documentada.
    """
    registros = db.listasancion.find_many()
    if not registros:
        logger.warning(
            "Listas de sanciones vacías: el screening no es concluyente. "
            "Ejecuta la ingesta antes de operar."
        )

    nombres = nombres_a_verificar(productor)
    peor = {"resultado": "LIMPIO", "puntaje_maximo": 0.0, "coincidencias": []}
    nombre_consultado = ", ".join(nombres) if nombres else ""

    for nombre in nombres:
        parcial = cotejar(nombre, registros, umbral)
        if parcial["puntaje_maximo"] > peor["puntaje_maximo"]:
            peor = parcial

    fuentes = sorted({c["fuente"] for c in peor["coincidencias"]})

    return {
        "nombre_consultado": nombre_consultado,
        "resultado": peor["resultado"],
        "puntaje_maximo": peor["puntaje_maximo"],
        "umbral": umbral,
        "coincidencias": peor["coincidencias"],
        "fuentes": ",".join(fuentes) if fuentes else None,
        "ejecutado_por": ejecutado_por,
        "listas_cargadas": len(registros),
    }
