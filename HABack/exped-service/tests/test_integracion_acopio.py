"""Prueba de integración del Módulo 3 (Acopio) contra base de datos real.

Recorre la cadena completa: muestra en finca -> análisis físico y sensorial ->
orden de compra con validación EUDR -> ingreso a bodega -> trilla -> despacho
con control antifraude -> certificado de trazabilidad.

Requiere la misma base de pruebas que `test_integracion_expediente.py`.
"""

import os
import uuid

import pytest

TEST_DB_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql://postgres@localhost:5432/geoguard_test"
)
os.environ["DATABASE_URL"] = TEST_DB_URL
os.environ["SESSION_VALIDATION_ENABLED"] = "false"
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-ci")

import jwt  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.config import settings  # noqa: E402
from app.database import db  # noqa: E402
from app.main import app  # noqa: E402


def _hay_bd() -> bool:
    try:
        if not db.is_connected():
            db.connect()
        db.muestra.count()
        return True
    except Exception:
        return False
    finally:
        if db.is_connected():
            db.disconnect()


pytestmark = pytest.mark.skipif(
    not _hay_bd(), reason="Base de datos de pruebas no disponible"
)


def auth(rol: str) -> dict:
    token = jwt.encode({"sub": f"user-{rol}", "role": rol}, settings.secret_key, algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def client():
    yield TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def conexion():
    if not db.is_connected():
        db.connect()
    yield
    for tabla in (
        db.procesotrilla,
        db.inventarioacopio,
        db.ordencompra,
        db.analisisfisico,
        db.analisissensorial,
        db.muestra,
    ):
        tabla.delete_many()
    if db.is_connected():
        db.disconnect()


def _crear_finca_con_eudr(aprobada: bool) -> str:
    """Crea una finca con su cadena expediente + auditoría satelital."""
    finca = db.finca.create(
        data={
            "nombre": f"Finca {uuid.uuid4().hex[:6]}",
            "usuario_id": "productor-test",
            "eudr_id": f"uuidv4-{uuid.uuid4().hex[:8].upper()}",
        }
    )
    dato = db.dato.create(data={"finca_id": finca.id})
    expediente = db.expediente.create(
        data={"dato_id": dato.id, "organizacion_inquilino": "APECAEL_TEST"}
    )
    db.auditoria.create(
        data={
            "expediente_id": expediente.id,
            "resultado": "APROBADO" if aprobada else "RECHAZADO",
            "deforestacion_detectada": not aprobada,
        }
    )
    return finca.id


def _post_muestra(client, finca_id: str, **campos):
    payload = {
        "fincaId": finca_id,
        "productorId": "productor-test",
        "codigoQR": f"QR-{uuid.uuid4().hex[:10]}",
        "tipoProceso": "Lavado",
        "peso_lb": 1.1,  # ~0.5 kg, el exigido para Lavado
    }
    payload.update(campos)
    return client.post("/acopio/muestras/", headers=auth("TECNICO_CAMPO"), json=payload)


def _crear_muestra(client, finca_id: str) -> dict:
    r = _post_muestra(client, finca_id)
    assert r.status_code == 200, r.text
    return r.json()


# ===== RF-APE-01/02: muestras =====

def test_registrar_muestra_convierte_a_kg(client):
    finca_id = _crear_finca_con_eudr(aprobada=True)
    muestra = _crear_muestra(client, finca_id)

    guardada = db.muestra.find_unique(where={"id": muestra["muestra_id"]})
    assert guardada.fincaId == finca_id
    assert guardada.pesoKg == pytest.approx(0.5, abs=0.01)  # 1.1 lb -> kg


def test_peso_de_muestra_exigido_por_proceso(client):
    """RF-APE-01: 0,5 kg para Lavado y Honey; 1 kg para Natural."""
    finca_id = _crear_finca_con_eudr(aprobada=True)

    # Natural exige 1 kg: media libra se queda muy corto
    assert _post_muestra(
        client, finca_id, tipoProceso="Natural", peso_lb=1.1
    ).status_code == 422

    # Natural con ~1 kg sí se acepta
    assert _post_muestra(
        client, finca_id, tipoProceso="Natural", peso_lb=2.2
    ).status_code == 200

    # Lavado con 1 kg duplica el peso exigido
    assert _post_muestra(
        client, finca_id, tipoProceso="Lavado", peso_lb=2.2
    ).status_code == 422


def test_tipo_de_proceso_restringido_al_catalogo(client):
    finca_id = _crear_finca_con_eudr(aprobada=True)
    r = _post_muestra(client, finca_id, tipoProceso="Semilavado")
    assert r.status_code == 422


def test_muestra_con_finca_inexistente(client):
    r = _post_muestra(client, "no-existe")
    assert r.status_code == 404


# ===== RF-APE-03/04/05: laboratorio =====

def _analisis_fisico(client, muestra_id: int, **campos):
    payload = {
        "muestraId": muestra_id,
        "humedad": 11.0,
        "criba": "16",
        "densidad": 700.0,
        "defectosPrim": 0,
        "defectosSec": 2,
    }
    payload.update(campos)
    return client.post(
        "/acopio/laboratorio/fisico", headers=auth("ANALISTA_FISICO"), json=payload
    )


def test_analisis_fisico_conforme(client):
    finca_id = _crear_finca_con_eudr(aprobada=True)
    muestra = _crear_muestra(client, finca_id)

    r = _analisis_fisico(client, muestra["muestra_id"])
    assert r.status_code == 200, r.text
    assert r.json()["conforme"] is True
    assert r.json()["no_conformidades"] == []


def test_humedad_fuera_de_umbral_se_registra_como_no_conforme(client):
    """RF-APE-03: el lote defectuoso debe quedar documentado, no rechazado.

    Devolver 422 dejaría al laboratorio sin forma de registrar una medición
    real fuera de especificación, que es justo lo que la trazabilidad prueba.
    """
    finca_id = _crear_finca_con_eudr(aprobada=True)
    muestra = _crear_muestra(client, finca_id)

    r = _analisis_fisico(client, muestra["muestra_id"], humedad=15.0)
    assert r.status_code == 200, r.text
    cuerpo = r.json()

    assert cuerpo["conforme"] is False
    assert any("Humedad" in nc for nc in cuerpo["no_conformidades"])

    guardado = db.analisisfisico.find_unique(where={"id": cuerpo["id"]})
    assert guardado.conforme is False
    assert guardado.humedad == 15.0  # la medición real se conserva


def test_criba_y_defecto_primario_generan_no_conformidad(client):
    finca_id = _crear_finca_con_eudr(aprobada=True)
    muestra = _crear_muestra(client, finca_id)

    cuerpo = _analisis_fisico(
        client, muestra["muestra_id"], criba="12", defectosPrim=3
    ).json()

    assert cuerpo["conforme"] is False
    assert len(cuerpo["no_conformidades"]) == 2


def test_analisis_fisico_requiere_rol_de_laboratorio(client):
    """Separación de funciones: el técnico de campo no analiza en laboratorio."""
    finca_id = _crear_finca_con_eudr(aprobada=True)
    muestra = _crear_muestra(client, finca_id)

    r = client.post(
        "/acopio/laboratorio/fisico",
        headers=auth("TECNICO_CAMPO"),
        json={
            "muestraId": muestra["muestra_id"],
            "humedad": 11.0,
            "criba": "16",
            "densidad": 700.0,
            "defectosPrim": 0,
            "defectosSec": 0,
        },
    )
    assert r.status_code == 403


_ATRIBUTOS_SCA = (
    "fraganciaAroma", "sabor", "saborResidual", "acidez", "cuerpo",
    "uniformidad", "balance", "tazaLimpia", "dulzor", "puntajeCatador",
)


def _catar(client, muestra_id: int, puntaje_atributo: float, defectos: float = 0.0):
    return client.post(
        "/acopio/laboratorio/sensorial",
        headers=auth("CATADOR_Q"),
        json={
            "muestraId": muestra_id,
            "nivelTueste": "Medio",
            "defectos": defectos,
            **{k: puntaje_atributo for k in _ATRIBUTOS_SCA},
        },
    )


def test_cafe_de_especialidad_si_puntaje_supera_80(client):
    finca_id = _crear_finca_con_eudr(aprobada=True)
    muestra = _crear_muestra(client, finca_id)

    r = _catar(client, muestra["muestra_id"], 8.5)
    assert r.status_code == 200, r.text
    assert r.json()["puntaje_total"] == pytest.approx(85.0)
    assert r.json()["clasificacion"] == "Café de Especialidad"


def test_cafe_comercial_si_puntaje_bajo_80(client):
    finca_id = _crear_finca_con_eudr(aprobada=True)
    muestra = _crear_muestra(client, finca_id)

    r = _catar(client, muestra["muestra_id"], 7.0)
    assert r.json()["clasificacion"] == "Café Comercial"


def test_defectos_de_taza_restan_del_puntaje_sca(client):
    """RF-APE-04: los defectos son el 11º ítem del formato y penalizan.

    Sin la resta, un café con taints o faults conservaría intacta su
    clasificación de especialidad.
    """
    finca_id = _crear_finca_con_eudr(aprobada=True)
    muestra = _crear_muestra(client, finca_id)

    # 85 puntos de atributos - 6 de defectos = 79 -> deja de ser especialidad
    r = _catar(client, muestra["muestra_id"], 8.5, defectos=6.0)
    cuerpo = r.json()

    assert cuerpo["puntaje_atributos"] == pytest.approx(85.0)
    assert cuerpo["penalizacion_defectos"] == pytest.approx(6.0)
    assert cuerpo["puntaje_total"] == pytest.approx(79.0)
    assert cuerpo["clasificacion"] == "Café Comercial"


def test_catacion_requiere_rol_de_catador(client):
    finca_id = _crear_finca_con_eudr(aprobada=True)
    muestra = _crear_muestra(client, finca_id)

    r = client.post(
        "/acopio/laboratorio/sensorial",
        headers=auth("ANALISTA_FISICO"),
        json={
            "muestraId": muestra["muestra_id"],
            "nivelTueste": "Medio",
            **{k: 8.0 for k in _ATRIBUTOS_SCA},
        },
    )
    assert r.status_code == 403


# ===== RF-APE-07: bloqueo EUDR =====

def test_compra_bloqueada_si_finca_no_cumple_eudr(client):
    """El requisito crítico: sin cero deforestación no se autoriza la compra."""
    finca_id = _crear_finca_con_eudr(aprobada=False)
    muestra = _crear_muestra(client, finca_id)

    r = client.post(
        "/acopio/compras/aprobar",
        headers=auth("TENANT_ADMIN"),
        json={"muestraId": muestra["muestra_id"], "precioAcordado": 200.0, "volumenKg": 100.0},
    )
    assert r.status_code == 403
    assert "EUDR" in r.json()["detail"]


def test_compra_autorizada_si_finca_cumple_eudr(client):
    finca_id = _crear_finca_con_eudr(aprobada=True)
    muestra = _crear_muestra(client, finca_id)

    r = client.post(
        "/acopio/compras/aprobar",
        headers=auth("TENANT_ADMIN"),
        json={"muestraId": muestra["muestra_id"], "precioAcordado": 200.0, "volumenKg": 100.0},
    )
    assert r.status_code == 200, r.text
    assert db.ordencompra.find_unique(where={"id": r.json()["orden_id"]}).aprobadoEUDR is True


# ===== RF-APE-08 + trilla + despacho: cadena completa =====

def _cadena_hasta_bodega(client, peso_lb: float = 220.46):
    finca_id = _crear_finca_con_eudr(aprobada=True)
    muestra = _crear_muestra(client, finca_id)
    orden = client.post(
        "/acopio/compras/aprobar",
        headers=auth("TENANT_ADMIN"),
        json={"muestraId": muestra["muestra_id"], "precioAcordado": 200.0, "volumenKg": 100.0},
    ).json()

    qr = db.muestra.find_unique(where={"id": muestra["muestra_id"]}).codigoQR
    ingreso = client.post(
        "/acopio/bodega/ingreso",
        headers=auth("BODEGUERO"),
        json={
            "ordenCompraId": orden["orden_id"],
            "codigoQR": qr,
            "pesoIngresado_lb": peso_lb,
            "tipoProceso": "Lavado",
        },
    )
    assert ingreso.status_code == 201, ingreso.text
    return ingreso.json()


def test_ingreso_bodega_valida_qr(client):
    finca_id = _crear_finca_con_eudr(aprobada=True)
    muestra = _crear_muestra(client, finca_id)
    orden = client.post(
        "/acopio/compras/aprobar",
        headers=auth("TENANT_ADMIN"),
        json={"muestraId": muestra["muestra_id"], "precioAcordado": 200.0, "volumenKg": 100.0},
    ).json()

    r = client.post(
        "/acopio/bodega/ingreso",
        headers=auth("BODEGUERO"),
        json={
            "ordenCompraId": orden["orden_id"],
            "codigoQR": "QR-QUE-NO-CORRESPONDE",
            "pesoIngresado_lb": 100.0,
            "tipoProceso": "Lavado",
        },
    )
    assert r.status_code == 400
    assert "QR" in r.json()["detail"]


def test_ingreso_duplicado_rechazado(client):
    inventario = _cadena_hasta_bodega(client)
    orden_id = db.inventarioacopio.find_unique(where={"id": inventario["inventario_id"]}).ordenCompraId
    qr = "cualquiera"

    r = client.post(
        "/acopio/bodega/ingreso",
        headers=auth("BODEGUERO"),
        json={
            "ordenCompraId": orden_id,
            "codigoQR": qr,
            "pesoIngresado_lb": 50.0,
            "tipoProceso": "Lavado",
        },
    )
    assert r.status_code == 400


def test_balance_de_masa_en_trilla(client):
    """RS-AGR-003: oro esperado = entrada x factor; merma = entrada - oro."""
    inventario = _cadena_hasta_bodega(client, peso_lb=220.46)  # ~100 kg
    peso_kg = inventario["peso_ingreso_kg"]

    r = client.post(
        "/acopio/trilla/procesar",
        headers=auth("BODEGUERO"),
        json={"inventarioId": inventario["inventario_id"], "factorRendimiento": 0.80},
    )
    assert r.status_code == 200, r.text
    res = r.json()["resultados"]
    assert res["kg_cafe_oro_esperados"] == pytest.approx(round(peso_kg * 0.80, 2))
    assert res["merma_esperada_kg"] == pytest.approx(round(peso_kg - peso_kg * 0.80, 2))

    # El lote queda marcado como procesado
    assert db.inventarioacopio.find_unique(
        where={"id": inventario["inventario_id"]}
    ).estado == "EN_TRILLA"


def test_trilla_rechaza_factor_fuera_de_rango(client):
    inventario = _cadena_hasta_bodega(client)
    r = client.post(
        "/acopio/trilla/procesar",
        headers=auth("BODEGUERO"),
        json={"inventarioId": inventario["inventario_id"], "factorRendimiento": 0.95},
    )
    assert r.status_code == 422


def test_trilla_rechaza_lote_ya_procesado(client):
    inventario = _cadena_hasta_bodega(client)
    payload = {"inventarioId": inventario["inventario_id"], "factorRendimiento": 0.80}
    assert client.post("/acopio/trilla/procesar", headers=auth("BODEGUERO"), json=payload).status_code == 200
    r = client.post("/acopio/trilla/procesar", headers=auth("BODEGUERO"), json=payload)
    assert r.status_code == 400


def test_antifraude_bloquea_despacho_mayor_al_ingreso(client):
    """No se puede despachar más masa de la que entró certificada."""
    inventario = _cadena_hasta_bodega(client, peso_lb=220.46)
    peso_kg = inventario["peso_ingreso_kg"]

    r = client.post(
        "/acopio/despachos/registrar",
        headers=auth("TENANT_ADMIN"),
        json={
            "inventarioId": inventario["inventario_id"],
            "peso_salida_kg": peso_kg + 1,
            "destino": "Puerto de Guayaquil",
        },
    )
    assert r.status_code == 403
    assert "Fraude" in r.json()["detail"]


def test_despacho_parcial_y_cierre_de_lote(client):
    inventario = _cadena_hasta_bodega(client, peso_lb=220.46)
    peso_kg = inventario["peso_ingreso_kg"]
    mitad = round(peso_kg / 2, 2)

    primero = client.post(
        "/acopio/despachos/registrar",
        headers=auth("TENANT_ADMIN"),
        json={"inventarioId": inventario["inventario_id"], "peso_salida_kg": mitad, "destino": "Puerto"},
    ).json()
    assert primero["saldo_restante_bodega"] == pytest.approx(peso_kg - mitad)

    segundo = client.post(
        "/acopio/despachos/registrar",
        headers=auth("TENANT_ADMIN"),
        json={
            "inventarioId": inventario["inventario_id"],
            "peso_salida_kg": round(peso_kg - mitad, 2),
            "destino": "Puerto",
        },
    ).json()
    assert segundo["estado_lote"] == "DESPACHADO"
    assert segundo["saldo_restante_bodega"] == pytest.approx(0.0)


def test_certificado_de_trazabilidad_consolidado(client):
    """El certificado enlaza origen, EUDR, calidad y rendimiento industrial."""
    inventario = _cadena_hasta_bodega(client, peso_lb=220.46)
    client.post(
        "/acopio/trilla/procesar",
        headers=auth("BODEGUERO"),
        json={"inventarioId": inventario["inventario_id"], "factorRendimiento": 0.80},
    )

    r = client.get(
        f"/acopio/despachos/certificado/{inventario['inventario_id']}",
        headers=auth("AUDITOR_INTERNO"),
    )
    assert r.status_code == 200, r.text
    cert = r.json()["datos_certificado"]

    assert cert["cumplimiento_eudr"]["aprobado_cero_deforestacion"] is True
    assert cert["cumplimiento_eudr"]["fecha_analisis_satelital"] != "N/A"
    assert cert["origen"]["finca_nombre"] != "No registrada"
    assert cert["rendimiento_industrial"]["factor_trilla"] == 0.80
    assert cert["identificador_trazabilidad"].startswith("HA-DDS-")


def test_certificado_pdf_se_genera(client):
    inventario = _cadena_hasta_bodega(client)
    r = client.get(
        f"/acopio/despachos/certificado/{inventario['inventario_id']}/pdf",
        headers=auth("AUDITOR_INTERNO"),
    )
    assert r.status_code == 200, r.text
    assert r.headers["content-type"] == "application/pdf"
    assert r.content.startswith(b"%PDF")
