"""Validaciones de los esquemas de ejecución de labores (RF PPC-05).

Son pruebas puras de Pydantic: no requieren base de datos.
"""
import pytest
from pydantic import ValidationError

from app.schemas.schemas import EjecucionLaborCreate, InsumoLaborCreate


def _base(**overrides):
    datos = {
        "persona_desarrollo": "TITULAR",
        "detalle_aplicacion": "Aplicación de abono orgánico",
    }
    datos.update(overrides)
    return datos


def test_titular_no_requiere_datos_de_jornalero():
    ejecucion = EjecucionLaborCreate(**_base())
    assert ejecucion.edad_jornalero is None
    assert ejecucion.dias_trabajo is None


def test_jornalero_sin_edad_es_rechazado():
    with pytest.raises(ValidationError, match="edad del jornalero"):
        EjecucionLaborCreate(
            **_base(persona_desarrollo="JORNALERO", nombre_jornalero="Juan Pérez")
        )


def test_jornalero_menor_de_edad_es_rechazado():
    with pytest.raises(ValidationError, match="al menos 18"):
        EjecucionLaborCreate(
            **_base(
                persona_desarrollo="JORNALERO",
                nombre_jornalero="Juan Pérez",
                edad_jornalero=17,
            )
        )


def test_jornalero_sin_nombre_es_rechazado():
    with pytest.raises(ValidationError, match="nombre del jornalero"):
        EjecucionLaborCreate(
            **_base(persona_desarrollo="JORNALERO", edad_jornalero=25)
        )


def test_jornalero_mayor_de_edad_es_aceptado():
    ejecucion = EjecucionLaborCreate(
        **_base(
            persona_desarrollo="JORNALERO",
            nombre_jornalero="Juan Pérez",
            edad_jornalero=18,
            dias_trabajo=2.5,
            salario=15.0,
        )
    )
    assert ejecucion.edad_jornalero == 18
    assert ejecucion.dias_trabajo == 2.5


def test_insumos_duplicados_son_rechazados():
    insumo = {"nombre": "Compost", "cantidad": 5, "unidad": "kg"}
    with pytest.raises(ValidationError, match="repetido"):
        EjecucionLaborCreate(**_base(insumos=[insumo, dict(insumo, cantidad=3)]))


def test_insumo_con_cantidad_cero_es_rechazado():
    with pytest.raises(ValidationError):
        InsumoLaborCreate(nombre="Compost", cantidad=0, unidad="kg")


def test_herramientas_se_limpian_de_vacios_y_espacios():
    ejecucion = EjecucionLaborCreate(
        **_base(herramientas=[" Machete ", "", "  ", "Tijeras"])
    )
    assert ejecucion.herramientas == ["Machete", "Tijeras"]
