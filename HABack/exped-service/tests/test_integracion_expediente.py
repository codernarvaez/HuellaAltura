"""Prueba de integración del expediente del productor contra base de datos real.

Cubre el flujo completo de los tracks A2, A3 y A4:
Productor -> campos dinámicos -> valores -> requisitos documentales ->
documentos -> completitud -> finca asociada.

Requiere una base PostgreSQL de pruebas. Se omite si no está disponible:

    createdb geoguard_test
    DATABASE_URL=postgresql://postgres@localhost:5432/geoguard_test \\
        python -m prisma db push
    DATABASE_URL=postgresql://postgres@localhost:5432/geoguard_test \\
        python -m pytest tests/test_integracion_expediente.py -v
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

ORG = "APECAEL_TEST"


def _hay_bd() -> bool:
    """Comprueba la BD sin dejar la conexión abierta.

    Esto se evalúa en tiempo de importación (pytest recolecta todos los módulos
    antes de ejecutar), así que dejar la conexión viva rompería el lifespan de
    los demás módulos de prueba con AlreadyConnectedError.
    """
    try:
        if not db.is_connected():
            db.connect()
        db.productor.count()
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
    # Sin context manager a propósito: el lifespan de la app volvería a llamar a
    # db.connect() sobre la conexión que ya abrió _hay_bd().
    yield TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def limpiar():
    """Deja la organización de pruebas vacía antes y después del módulo."""

    if not db.is_connected():
        db.connect()

    def _borrar():
        db.valorcampo.delete_many(where={"entidad": "PRODUCTOR"})
        db.campoformulario.delete_many(where={"organizacion_inquilino": ORG})
        db.documento.delete_many(where={"organizacion_inquilino": ORG})
        db.requisitodocumental.delete_many(where={"organizacion_inquilino": ORG})
        db.finca.delete_many(where={"usuario_id": "user-TECNICO_CAMPO"})
        db.productor.delete_many(where={"organizacion_inquilino": ORG})

    _borrar()
    yield
    _borrar()
    # Liberar la conexión: otros módulos abren la suya vía el lifespan de la app
    if db.is_connected():
        db.disconnect()


# ===== A2: Productor =====

def test_crear_productor_natural(client):
    """RF-01/RF-03: registrar una persona natural con sus datos personales."""
    r = client.post(
        "/api/v1/productores/",
        headers=auth("TECNICO_CAMPO"),
        json={
            "tipo_persona": "NATURAL",
            "organizacion_inquilino": ORG,
            "nombres": "María",
            "apellidos": "Quizhpe",
            "cedula": f"110{uuid.uuid4().hex[:7]}",
            "provincia": "Loja",
        },
    )
    assert r.status_code == 201, r.text
    cuerpo = r.json()
    assert cuerpo["tipo_persona"] == "NATURAL"
    assert cuerpo["estado"] == "BORRADOR"
    assert cuerpo["razon_social"] is None


def test_crear_productor_juridica(client):
    """RF-01: registrar una persona jurídica con representante legal."""
    r = client.post(
        "/api/v1/productores/",
        headers=auth("TECNICO_CAMPO"),
        json={
            "tipo_persona": "JURIDICA",
            "organizacion_inquilino": ORG,
            "razon_social": "Asociación Cafetalera APECAEL",
            "ruc": f"119{uuid.uuid4().hex[:10]}",
            "representante_nombres": "Luis",
            "representante_apellidos": "Narváez",
            "representante_cedula": "1102223334",
        },
    )
    assert r.status_code == 201, r.text
    assert r.json()["razon_social"] == "Asociación Cafetalera APECAEL"


def test_cedula_duplicada_rechazada(client):
    """La cédula identifica unívocamente al productor dentro del inquilino."""
    cedula = f"110{uuid.uuid4().hex[:7]}"
    payload = {
        "tipo_persona": "NATURAL",
        "organizacion_inquilino": ORG,
        "nombres": "Ana",
        "apellidos": "Lima",
        "cedula": cedula,
    }
    assert client.post("/api/v1/productores/", headers=auth("TECNICO_CAMPO"), json=payload).status_code == 201
    r = client.post("/api/v1/productores/", headers=auth("TECNICO_CAMPO"), json=payload)
    assert r.status_code == 409
    assert "cedula" in r.json()["detail"]


def test_productor_bloqueado_no_admite_edicion(client):
    """Un expediente BLOQUEADO por sanciones no puede modificarse (RF-16)."""
    creado = client.post(
        "/api/v1/productores/",
        headers=auth("TECNICO_CAMPO"),
        json={
            "tipo_persona": "NATURAL",
            "organizacion_inquilino": ORG,
            "nombres": "Carlos",
            "apellidos": "Sanción",
            "cedula": f"110{uuid.uuid4().hex[:7]}",
        },
    ).json()

    db.productor.update(where={"id": creado["id"]}, data={"estado": "BLOQUEADO"})

    r = client.patch(
        f"/api/v1/productores/{creado['id']}",
        headers=auth("TECNICO_CAMPO"),
        json={"telefono": "0999999999"},
    )
    assert r.status_code == 409
    assert "BLOQUEADO" in r.json()["detail"]


# ===== A3: Formularios dinámicos =====

def test_ciclo_campo_dinamico(client):
    """RF-08/RF-09: definir campo, capturar valor y desactivarlo sin perder datos."""
    productor = client.post(
        "/api/v1/productores/",
        headers=auth("TECNICO_CAMPO"),
        json={
            "tipo_persona": "NATURAL",
            "organizacion_inquilino": ORG,
            "nombres": "Rosa",
            "apellidos": "Campo",
            "cedula": f"110{uuid.uuid4().hex[:7]}",
        },
    ).json()

    # El admin define un campo personalizado
    campo = client.post(
        "/api/v1/formularios/campos",
        headers=auth("TENANT_ADMIN"),
        json={
            "organizacion_inquilino": ORG,
            "entidad": "PRODUCTOR",
            "clave": "biomasa_aerea",
            "etiqueta": "Biomasa aérea",
            "tipo_dato": "FLOAT",
            "requerido": True,
        },
    )
    assert campo.status_code == 201, campo.text

    # El esquema ya lo expone a las apps
    esquema = client.get(
        f"/api/v1/formularios/PRODUCTOR?organizacion={ORG}", headers=auth("TECNICO_CAMPO")
    ).json()
    assert "biomasa_aerea" in [c["clave"] for c in esquema["campos"]]

    # El técnico captura el valor
    guardado = client.put(
        f"/api/v1/formularios/PRODUCTOR/{productor['id']}/valores?organizacion={ORG}",
        headers=auth("TECNICO_CAMPO"),
        json=[{"clave": "biomasa_aerea", "valor": "32.5"}],
    )
    assert guardado.status_code == 200, guardado.text
    assert guardado.json()["completo"] is True

    valores = client.get(
        f"/api/v1/formularios/PRODUCTOR/{productor['id']}/valores", headers=auth("TECNICO_CAMPO")
    ).json()
    assert valores[0]["valor"] == "32.5"

    # Desactivar el campo lo retira del esquema pero conserva el valor (RF-09)
    campo_id = campo.json()["id"]
    assert client.patch(
        f"/api/v1/formularios/campos/{campo_id}",
        headers=auth("TENANT_ADMIN"),
        json={"activo": False},
    ).status_code == 200

    esquema = client.get(
        f"/api/v1/formularios/PRODUCTOR?organizacion={ORG}", headers=auth("TECNICO_CAMPO")
    ).json()
    assert "biomasa_aerea" not in [c["clave"] for c in esquema["campos"]]
    assert db.valorcampo.find_first(where={"campo_id": campo_id}) is not None


def test_valor_de_campo_no_definido_rechazado(client):
    """Un cliente desactualizado no puede introducir datos huérfanos."""
    productor = client.post(
        "/api/v1/productores/",
        headers=auth("TECNICO_CAMPO"),
        json={
            "tipo_persona": "NATURAL",
            "organizacion_inquilino": ORG,
            "nombres": "Sin",
            "apellidos": "Campo",
            "cedula": f"110{uuid.uuid4().hex[:7]}",
        },
    ).json()

    r = client.put(
        f"/api/v1/formularios/PRODUCTOR/{productor['id']}/valores?organizacion={ORG}",
        headers=auth("TECNICO_CAMPO"),
        json=[{"clave": "campo_inexistente", "valor": "x"}],
    )
    assert r.status_code == 400
    assert "campo_inexistente" in r.json()["detail"]


def test_campo_condicionado_por_tipo_persona(client):
    """RF-02: los campos visibles cambian según el tipo de persona."""
    client.post(
        "/api/v1/formularios/campos",
        headers=auth("TENANT_ADMIN"),
        json={
            "organizacion_inquilino": ORG,
            "entidad": "PRODUCTOR",
            "clave": "numero_socios",
            "etiqueta": "Número de socios",
            "tipo_dato": "INTEGER",
            "visible_si_tipo_persona": "JURIDICA",
        },
    )

    natural = client.get(
        f"/api/v1/formularios/PRODUCTOR?organizacion={ORG}&tipo_persona=NATURAL",
        headers=auth("TECNICO_CAMPO"),
    ).json()
    juridica = client.get(
        f"/api/v1/formularios/PRODUCTOR?organizacion={ORG}&tipo_persona=JURIDICA",
        headers=auth("TECNICO_CAMPO"),
    ).json()

    assert "numero_socios" not in [c["clave"] for c in natural["campos"]]
    assert "numero_socios" in [c["clave"] for c in juridica["campos"]]


# ===== A4: Expediente documental =====

def test_completitud_documental(client):
    """RF-07/08/09: el expediente no está completo hasta cargar lo obligatorio."""
    productor = client.post(
        "/api/v1/productores/",
        headers=auth("TECNICO_CAMPO"),
        json={
            "tipo_persona": "NATURAL",
            "organizacion_inquilino": ORG,
            "nombres": "Pedro",
            "apellidos": "Documento",
            "cedula": f"110{uuid.uuid4().hex[:7]}",
        },
    ).json()

    # El admin exige dos documentos a las personas naturales
    for tipo, etiqueta in [("CEDULA_IDENTIDAD", "Cédula"), ("ESCRITURA_PREDIO", "Escritura")]:
        r = client.post(
            "/api/v1/documentos/requisitos",
            headers=auth("TENANT_ADMIN"),
            json={
                "organizacion_inquilino": ORG,
                "tipo_persona": "NATURAL",
                "tipo_documento": tipo,
                "etiqueta": etiqueta,
            },
        )
        assert r.status_code == 201, r.text

    estado = client.get(
        f"/api/v1/productores/{productor['id']}/completitud", headers=auth("TECNICO_CAMPO")
    ).json()
    assert estado["expediente_completo"] is False
    assert set(estado["documentos"]["faltantes"]) == {"CEDULA_IDENTIDAD", "ESCRITURA_PREDIO"}

    # Se cargan ambos documentos
    for tipo in ("CEDULA_IDENTIDAD", "ESCRITURA_PREDIO"):
        r = client.post(
            "/api/v1/documentos/",
            headers=auth("TECNICO_CAMPO"),
            json={
                "organizacion_inquilino": ORG,
                "productor_id": productor["id"],
                "tipo_documento": tipo,
                "url_storage": f"expedientes/{tipo.lower()}",
                "hash_sha256": "a" * 64,
            },
        )
        assert r.status_code == 201, r.text

    estado = client.get(
        f"/api/v1/productores/{productor['id']}/completitud", headers=auth("TECNICO_CAMPO")
    ).json()
    assert estado["documentos"]["faltantes"] == []
    assert estado["expediente_completo"] is True


def test_documento_rechazado_no_cuenta_como_cargado(client):
    """Un documento RECHAZADO deja el expediente incompleto de nuevo."""
    productor = client.post(
        "/api/v1/productores/",
        headers=auth("TECNICO_CAMPO"),
        json={
            "tipo_persona": "NATURAL",
            "organizacion_inquilino": ORG,
            "nombres": "Lucía",
            "apellidos": "Rechazo",
            "cedula": f"110{uuid.uuid4().hex[:7]}",
        },
    ).json()

    doc = client.post(
        "/api/v1/documentos/",
        headers=auth("TECNICO_CAMPO"),
        json={
            "organizacion_inquilino": ORG,
            "productor_id": productor["id"],
            "tipo_documento": "CEDULA_IDENTIDAD",
            "url_storage": "expedientes/cedula",
        },
    ).json()

    client.patch(
        f"/api/v1/documentos/{doc['id']}",
        headers=auth("AUDITOR_INTERNO"),
        json={"estado_validacion": "RECHAZADO", "observaciones": "Ilegible"},
    )

    estado = client.get(
        f"/api/v1/productores/{productor['id']}/completitud", headers=auth("TECNICO_CAMPO")
    ).json()
    assert "CEDULA_IDENTIDAD" in estado["documentos"]["faltantes"]


def test_documento_con_productor_inexistente(client):
    r = client.post(
        "/api/v1/documentos/",
        headers=auth("TECNICO_CAMPO"),
        json={
            "organizacion_inquilino": ORG,
            "productor_id": "no-existe",
            "tipo_documento": "CEDULA_IDENTIDAD",
            "url_storage": "x",
        },
    )
    assert r.status_code == 404


# ===== RF-04: fincas del productor =====

def test_fincas_asociadas_al_productor(client):
    """RF-04: un productor puede tener varias fincas asociadas."""
    productor = client.post(
        "/api/v1/productores/",
        headers=auth("TECNICO_CAMPO"),
        json={
            "tipo_persona": "NATURAL",
            "organizacion_inquilino": ORG,
            "nombres": "Jorge",
            "apellidos": "Finca",
            "cedula": f"110{uuid.uuid4().hex[:7]}",
        },
    ).json()

    for nombre in ("El Ahuacate", "La Esperanza"):
        r = client.post(
            "/api/v1/fincas/",
            headers=auth("TECNICO_CAMPO"),
            json={
                "nombre": nombre,
                "usuario_id": "user-TECNICO_CAMPO",
                "productor_id": productor["id"],
                "provincia": "Loja",
            },
        )
        assert r.status_code == 201, r.text

    fincas = client.get(
        f"/api/v1/productores/{productor['id']}/fincas", headers=auth("TECNICO_CAMPO")
    ).json()
    assert {f["nombre"] for f in fincas} == {"El Ahuacate", "La Esperanza"}
    assert all(f["eudr_id"] for f in fincas)
