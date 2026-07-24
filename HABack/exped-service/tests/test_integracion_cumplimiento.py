"""Pruebas de integración de screening de sanciones (A6) y firma digital (A5).

Cubre RF-11 (firma), RF-14 (consulta OFAC/ONU), RF-15 (reporte) y RF-16
(bloqueo automático por coincidencia sobre el umbral).
"""

import os
import uuid
from datetime import datetime, timezone

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
from app.services import screening_service  # noqa: E402

ORG = "APECAEL_SCREENING"


def _hay_bd() -> bool:
    try:
        if not db.is_connected():
            db.connect()
        db.listasancion.count()
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
def preparar(client):
    if not db.is_connected():
        db.connect()

    def _borrar():
        db.firmaproductor.delete_many()
        db.screeningproductor.delete_many()
        db.productor.delete_many(where={"organizacion_inquilino": ORG})
        db.listasancion.delete_many()

    _borrar()

    # Carga de un extracto de listas para poder cotejar
    client.post(
        "/api/v1/cumplimiento/listas",
        headers=auth("TENANT_ADMIN"),
        json=[
            {
                "fuente": "OFAC_SDN",
                "referencia": "SDN-12345",
                "nombre": "RODRIGUEZ MARTINEZ CARLOS ALBERTO",
                "tipo": "INDIVIDUO",
                "programa": "SDNTK",
            },
            {
                "fuente": "ONU_CONSOLIDATED",
                "referencia": "ONU-999",
                "nombre": "COMERCIALIZADORA GLOBAL SA",
                "tipo": "ENTIDAD",
                "programa": "Al-Qaida",
            },
        ],
    )

    yield
    _borrar()
    if db.is_connected():
        db.disconnect()


def _crear_productor(client, **kwargs) -> dict:
    payload = {
        "tipo_persona": "NATURAL",
        "organizacion_inquilino": ORG,
        "nombres": "Ana",
        "apellidos": "Pérez",
        "cedula": f"110{uuid.uuid4().hex[:7]}",
    }
    payload.update(kwargs)
    r = client.post("/api/v1/productores/", headers=auth("TECNICO_CAMPO"), json=payload)
    assert r.status_code == 201, r.text
    return r.json()


# ===== Normalización =====

def test_normalizar_quita_tildes_y_mayusculiza():
    """Las listas oficiales están en ASCII; los nombres locales llevan tildes."""
    assert screening_service.normalizar("José Muñoz  Pérez") == "JOSE MUNOZ PEREZ"
    assert screening_service.normalizar("") == ""


# ===== RF-14 / RF-16: screening y bloqueo =====

def test_productor_limpio_no_se_bloquea(client):
    productor = _crear_productor(client, nombres="Ana", apellidos="Pérez")

    r = client.post(
        f"/api/v1/cumplimiento/productores/{productor['id']}/screening",
        headers=auth("TECNICO_CAMPO"),
        json={"umbral": 85.0},
    )
    assert r.status_code == 200, r.text
    cuerpo = r.json()
    assert cuerpo["resultado"] == "LIMPIO"
    assert cuerpo["expediente_bloqueado"] is False
    assert db.productor.find_unique(where={"id": productor["id"]}).estado == "BORRADOR"


def test_coincidencia_bloquea_expediente(client):
    """RF-16: coincidencia sobre el umbral -> expediente BLOQUEADO."""
    productor = _crear_productor(client, nombres="Carlos Alberto", apellidos="Rodriguez Martinez")

    r = client.post(
        f"/api/v1/cumplimiento/productores/{productor['id']}/screening",
        headers=auth("TECNICO_CAMPO"),
        json={"umbral": 85.0},
    )
    cuerpo = r.json()

    assert cuerpo["resultado"] == "COINCIDENCIA"
    assert cuerpo["expediente_bloqueado"] is True
    assert cuerpo["puntaje_maximo"] >= 85.0
    assert cuerpo["coincidencias"][0]["fuente"] == "OFAC_SDN"
    assert db.productor.find_unique(where={"id": productor["id"]}).estado == "BLOQUEADO"


def test_screening_verifica_representante_legal(client):
    """RF-14: en persona jurídica se coteja también al representante legal."""
    productor = _crear_productor(
        client,
        tipo_persona="JURIDICA",
        nombres=None,
        apellidos=None,
        cedula=None,
        razon_social="Cafetalera Andina",
        ruc=f"119{uuid.uuid4().hex[:10]}",
        representante_nombres="Carlos Alberto",
        representante_apellidos="Rodriguez Martinez",
        representante_cedula="1101234567",
    )

    r = client.post(
        f"/api/v1/cumplimiento/productores/{productor['id']}/screening",
        headers=auth("TECNICO_CAMPO"),
        json={"umbral": 85.0},
    ).json()

    assert r["resultado"] == "COINCIDENCIA"
    assert "Rodriguez Martinez" in r["nombre_consultado"]


def test_umbral_alto_evita_falso_positivo(client):
    """Subir el umbral debe reducir las coincidencias marginales."""
    productor = _crear_productor(client, nombres="Carlos", apellidos="Rodriguez")

    laxo = client.post(
        f"/api/v1/cumplimiento/productores/{productor['id']}/screening",
        headers=auth("TECNICO_CAMPO"),
        json={"umbral": 50.0},
    ).json()
    estricto = client.post(
        f"/api/v1/cumplimiento/productores/{productor['id']}/screening",
        headers=auth("TECNICO_CAMPO"),
        json={"umbral": 99.0},
    ).json()

    assert len(laxo["coincidencias"]) >= len(estricto["coincidencias"])


def test_screening_automatico_al_registrar(client):
    """RF-14: el alta de un productor dispara la consulta de listas sin pedirla."""
    productor = _crear_productor(client, nombres="Carlos Alberto", apellidos="Rodriguez Martinez")

    # TestClient ejecuta las BackgroundTasks al cerrar la petición
    historico = client.get(
        f"/api/v1/cumplimiento/productores/{productor['id']}/screening",
        headers=auth("AUDITOR_INTERNO"),
    ).json()

    assert len(historico) == 1, "El alta debería haber generado un screening automático"
    assert historico[0]["resultado"] == "COINCIDENCIA"
    assert db.productor.find_unique(where={"id": productor["id"]}).estado == "BLOQUEADO"


# ===== RF-15: reporte =====

def test_historico_de_screening(client):
    """El histórico acumula el screening automático del alta más los manuales."""
    productor = _crear_productor(client)
    for _ in range(2):
        client.post(
            f"/api/v1/cumplimiento/productores/{productor['id']}/screening",
            headers=auth("TECNICO_CAMPO"),
            json={"umbral": 85.0},
        )

    historico = client.get(
        f"/api/v1/cumplimiento/productores/{productor['id']}/screening",
        headers=auth("AUDITOR_INTERNO"),
    ).json()

    assert len(historico) == 3  # 1 automático al registrar + 2 bajo demanda
    assert all(h["umbral"] == 85.0 for h in historico)
    assert all(h["ejecutado_por"] for h in historico)
    # Se devuelve del más reciente al más antiguo
    assert historico[0]["creado_en"] >= historico[-1]["creado_en"]


def test_estado_de_listas(client):
    r = client.get("/api/v1/cumplimiento/listas/estado", headers=auth("TECNICO_CAMPO")).json()
    assert r["operativo"] is True
    assert r["por_fuente"]["OFAC_SDN"] >= 1


# ===== Desbloqueo =====

def test_desbloqueo_requiere_admin_y_motivo(client):
    productor = _crear_productor(client, nombres="Carlos Alberto", apellidos="Rodriguez Martinez")
    client.post(
        f"/api/v1/cumplimiento/productores/{productor['id']}/screening",
        headers=auth("TECNICO_CAMPO"),
        json={"umbral": 85.0},
    )

    # El técnico no puede levantar el bloqueo
    assert client.post(
        f"/api/v1/cumplimiento/productores/{productor['id']}/desbloquear",
        headers=auth("TECNICO_CAMPO"),
        json={"motivo": "Revisado manualmente, es un homónimo"},
    ).status_code == 403

    # El motivo es obligatorio y con longitud mínima
    assert client.post(
        f"/api/v1/cumplimiento/productores/{productor['id']}/desbloquear",
        headers=auth("TENANT_ADMIN"),
        json={"motivo": "ok"},
    ).status_code == 422

    r = client.post(
        f"/api/v1/cumplimiento/productores/{productor['id']}/desbloquear",
        headers=auth("TENANT_ADMIN"),
        json={"motivo": "Homónimo confirmado con cédula y fecha de nacimiento"},
    )
    assert r.status_code == 200
    assert db.productor.find_unique(where={"id": productor["id"]}).estado == "BORRADOR"


# ===== RF-11: firma digital =====

def test_firma_sella_el_expediente(client):
    productor = _crear_productor(client)

    r = client.post(
        f"/api/v1/cumplimiento/productores/{productor['id']}/firma",
        headers=auth("TECNICO_CAMPO"),
        json={
            "latitud": -4.2625,
            "longitud": -79.2231,
            "firmado_en": datetime.now(timezone.utc).isoformat(),
        },
    )
    assert r.status_code == 201, r.text
    assert len(r.json()["hash_expediente"]) == 64  # SHA-256 en hexadecimal

    verificacion = client.get(
        f"/api/v1/cumplimiento/productores/{productor['id']}/firma/verificar",
        headers=auth("AUDITOR_INTERNO"),
    ).json()
    assert verificacion["integra"] is True


def test_modificar_datos_invalida_la_firma(client):
    """El valor auditor de la firma: detectar cambios posteriores."""
    productor = _crear_productor(client)
    client.post(
        f"/api/v1/cumplimiento/productores/{productor['id']}/firma",
        headers=auth("TECNICO_CAMPO"),
        json={"firmado_en": datetime.now(timezone.utc).isoformat()},
    )

    client.patch(
        f"/api/v1/productores/{productor['id']}",
        headers=auth("TECNICO_CAMPO"),
        json={"telefono": "0999123456", "direccion": "Nueva dirección"},
    )

    verificacion = client.get(
        f"/api/v1/cumplimiento/productores/{productor['id']}/firma/verificar",
        headers=auth("AUDITOR_INTERNO"),
    ).json()

    assert verificacion["integra"] is False
    assert "modificado" in verificacion["mensaje"]


def test_no_se_puede_firmar_expediente_bloqueado(client):
    productor = _crear_productor(client, nombres="Carlos Alberto", apellidos="Rodriguez Martinez")
    client.post(
        f"/api/v1/cumplimiento/productores/{productor['id']}/screening",
        headers=auth("TECNICO_CAMPO"),
        json={"umbral": 85.0},
    )

    r = client.post(
        f"/api/v1/cumplimiento/productores/{productor['id']}/firma",
        headers=auth("TECNICO_CAMPO"),
        json={"firmado_en": datetime.now(timezone.utc).isoformat()},
    )
    assert r.status_code == 409
    assert "BLOQUEADO" in r.json()["detail"]


def test_firma_sin_productor(client):
    r = client.post(
        "/api/v1/cumplimiento/productores/no-existe/firma",
        headers=auth("TECNICO_CAMPO"),
        json={"firmado_en": datetime.now(timezone.utc).isoformat()},
    )
    assert r.status_code == 404
