#!/usr/bin/env python3
"""Seed completo: usuario PRODUCTOR + finca + labores + EUDR + lab + lote oro."""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

AUTH = "https://huellaaltura-aaft.onrender.com"
EXPED = "https://exped-service.onrender.com"

ADMIN_EMAIL = "admin@demo.huellaaltura.com"
ADMIN_PASSWORD = "HuellaDemo2026!"

STAMP = datetime.now(timezone.utc).strftime("%m%d%H%M")
EMAIL = f"maria.chamba.{STAMP}@demo.huellaaltura.com"
PASSWORD = "CafeLoja2026!"
CEDULA = f"1104{STAMP[-6:]}"[:10].ljust(10, "0")
QR = f"QR-LOJA-{STAMP}"


def req(method: str, url: str, token: str | None = None, body: dict | None = None):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=90) as resp:
            raw = resp.read().decode()
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode()
        try:
            payload = json.loads(raw) if raw else {"detail": raw}
        except json.JSONDecodeError:
            payload = {"detail": raw[:500]}
        raise RuntimeError(f"{method} {url} -> {exc.code}: {payload}") from None


def main() -> int:
    out: dict = {"credenciales": {}, "ids": {}, "producto": {}}

    _, login = req(
        "POST",
        f"{AUTH}/api/auth/login",
        body={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    admin_token = login["access_token"]

    status, user = req(
        "POST",
        f"{AUTH}/api/auth/register",
        token=admin_token,
        body={
            "email": EMAIL,
            "password": PASSWORD,
            "role_name": "PRODUCTOR",
            "first_name": "María",
            "last_name": "Chamba Ortega",
            "identifier": CEDULA,
            "phone_number": f"099{STAMP[-7:]}",
            "edad": 38,
            "genero": "FEMENINO",
            "nivel_educativo": "SECUNDARIA",
        },
    )
    usuario_id = user["id"]
    out["ids"]["usuario_id"] = usuario_id
    out["credenciales"] = {
        "email": EMAIL,
        "password": PASSWORD,
        "rol": "PRODUCTOR",
        "nombre": "María Chamba Ortega",
        "cedula": CEDULA,
        "login_front": "https://ws-ha.onrender.com",
    }
    print(f"user {status} {usuario_id}")

    # Re-login admin (register may rotate nothing, but keep fresh session)
    _, login = req(
        "POST",
        f"{AUTH}/api/auth/login",
        body={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    admin_token = login["access_token"]

    _, productor = req(
        "POST",
        f"{EXPED}/api/v1/productores/",
        token=admin_token,
        body={
            "tipo_persona": "NATURAL",
            "organizacion_inquilino": "Agrobamba",
            "nombres": "María",
            "apellidos": "Chamba Ortega",
            "cedula": CEDULA,
            "email": EMAIL,
            "telefono": f"099{STAMP[-7:]}",
            "direccion": "Barrio San Pedro, vía a Valladolid",
            "provincia": "Loja",
            "canton": "Loja",
            "parroquia": "Valladolid",
            "usuario_id": usuario_id,
        },
    )
    productor_id = productor["id"]
    out["ids"]["productor_id"] = productor_id
    req(
        "PATCH",
        f"{EXPED}/api/v1/productores/{productor_id}",
        token=admin_token,
        body={"estado": "COMPLETO"},
    )
    print(f"productor {productor_id}")

    lon, lat = -79.1320, -4.3205
    d = 0.0018
    _, finca = req(
        "POST",
        f"{EXPED}/api/v1/fincas/",
        token=admin_token,
        body={
            "nombre": "Finca Los Arrayanes",
            "usuario_id": usuario_id,
            "productor_id": productor_id,
            "provincia": "Loja",
            "canton": "Loja",
            "parroquia": "Valladolid",
            "sector": "Los Arrayanes",
            "area_total_ha": 4.2,
            "area_cultivada_ha": 3.1,
            "tenencia": "PROPIA",
            "latitud": lat,
            "longitud": lon,
            "poligono": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [lon - d, lat - d],
                        [lon + d, lat - d],
                        [lon + d, lat + d],
                        [lon - d, lat + d],
                        [lon - d, lat - d],
                    ]
                ],
                "fuente": "seed-finca-completa-demo",
                "area_hectareas": 3.1,
            },
            "variedad_cafe": "Typica / Bourbon",
            "densidad_siembra": "2800 plantas/ha",
            "origen_semilla": "Vivero comunitario Valladolid",
            "anio_establecimiento": 2015,
        },
    )
    finca_id = finca["id"]
    out["ids"]["finca_id"] = finca_id
    out["ids"]["eudr_id"] = finca.get("eudr_id")
    print(f"finca {finca_id}")

    labores = []
    for spec in (
        {
            "nombre": "Poda de mantenimiento",
            "tipo_proceso": "MANTENIMIENTO",
            "mes": "Febrero",
            "cantidad_proyectada": "3 jornales",
            "ejecucion": {
                "persona_desarrollo": "PROPIETARIO",
                "detalle_aplicacion": "Poda sanitaria en hileras 1-20, eliminación de chupones",
                "dias_trabajo": 3,
                "salario": 0,
                "latitud": lat,
                "longitud": lon,
                "insumos": [{"nombre": "Pasta cicatrizante", "cantidad": 2, "unidad": "kg"}],
                "herramientas": ["Tijera de podar", "Serrucho"],
            },
        },
        {
            "nombre": "Fertilización orgánica",
            "tipo_proceso": "NUTRICION",
            "mes": "Marzo",
            "cantidad_proyectada": "2 jornales",
            "ejecucion": {
                "persona_desarrollo": "JORNALERO",
                "nombre_jornalero": "Pedro Jiménez",
                "edad_jornalero": 29,
                "detalle_aplicacion": "Aplicación de compost y bocashi en corona",
                "dias_trabajo": 2,
                "salario": 35,
                "latitud": lat,
                "longitud": lon,
                "insumos": [
                    {"nombre": "Compost", "cantidad": 80, "unidad": "kg"},
                    {"nombre": "Bocashi", "cantidad": 40, "unidad": "kg"},
                ],
                "herramientas": ["Lampa", "Caneca"],
            },
        },
    ):
        ejecucion = spec.pop("ejecucion")
        _, labor = req(
            "POST",
            f"{EXPED}/api/v1/labores/agendar",
            token=admin_token,
            body={"finca_id": finca_id, **spec},
        )
        _, ejec = req(
            "POST",
            f"{EXPED}/api/v1/labores/{labor['id']}/ejecutar",
            token=admin_token,
            body=ejecucion,
        )
        labores.append({"labor_id": labor["id"], "ejecucion_id": ejec["id"], "nombre": labor["nombre"]})
    out["ids"]["labores"] = labores
    print(f"labores {len(labores)}")

    _, dato = req(
        "POST",
        f"{EXPED}/api/v1/agroambiental/",
        token=admin_token,
        body={
            "finca_id": finca_id,
            "sistema_produccion": "AGROFORESTAL",
            "uso_suelo": "AGRICOLA",
            "cobertura_forestal": "CULTIVOS",
            "indice_shannon": 2.35,
            "indice_simpson": 0.78,
            "biomasa_arboles": 28.4,
            "biomasa_cafe": 12.1,
            "hojarasca_mantillo": 4.6,
            "carbono_organico_suelo": 3.2,
            "total_stock_carbono": 48.3,
        },
    )
    dato_id = dato["id"]
    out["ids"]["dato_id"] = dato_id

    _, expediente = req(
        "POST",
        f"{EXPED}/api/v1/expedientes/",
        token=admin_token,
        body={"dato_id": dato_id, "organizacion_inquilino": "Agrobamba"},
    )
    expediente_id = expediente["id"]
    out["ids"]["expediente_id"] = expediente_id

    _, auditoria = req(
        "POST",
        f"{EXPED}/api/v1/auditoria/",
        token=admin_token,
        body={
            "expediente_id": expediente_id,
            "resultado": "APROBADO",
            "deforestacion_detectada": False,
            "fuente": "Google Earth Engine",
            "observaciones": "Sin pérdida de cobertura forestal post-2020. Polígono coherente con uso café.",
            "ejecutado_por": "seed-demo",
        },
    )
    out["ids"]["auditoria_id"] = auditoria["id"]

    _, certificado = req(
        "POST",
        f"{EXPED}/api/v1/certificados/",
        token=admin_token,
        body={"expediente_id": expediente_id, "generado_por": "seed-demo"},
    )
    out["producto"]["certificado_dds"] = {
        "id": certificado["id"],
        "codigo": certificado.get("codigo_certificado"),
        "estado": certificado.get("estado"),
    }
    print(f"certificado {certificado.get('codigo_certificado')}")

    _, muestra = req(
        "POST",
        f"{EXPED}/acopio/muestras/",
        token=admin_token,
        body={
            "fincaId": finca_id,
            "productorId": productor_id,
            "codigoQR": QR,
            "tipoProceso": "Lavado",
            "peso_lb": 1.10,
        },
    )
    muestra_id = muestra["muestra_id"]
    out["ids"]["muestra_id"] = muestra_id
    out["ids"]["codigoQR"] = QR

    _, fisico = req(
        "POST",
        f"{EXPED}/acopio/laboratorio/fisico",
        token=admin_token,
        body={
            "muestraId": muestra_id,
            "humedad": 11.2,
            "criba": "16",
            "densidad": 685,
            "defectosPrim": 0,
            "defectosSec": 2,
        },
    )
    out["producto"]["analisis_fisico"] = {
        "conforme": fisico.get("conforme"),
        "no_conformidades": fisico.get("no_conformidades"),
    }

    _, sensorial = req(
        "POST",
        f"{EXPED}/acopio/laboratorio/sensorial",
        token=admin_token,
        body={
            "muestraId": muestra_id,
            "fraganciaAroma": 8.5,
            "sabor": 8.25,
            "saborResidual": 8.0,
            "acidez": 8.0,
            "cuerpo": 7.75,
            "uniformidad": 10,
            "balance": 8.0,
            "tazaLimpia": 10,
            "dulzor": 10,
            "puntajeCatador": 8.0,
            "defectos": 0,
            "nivelTueste": "Medio",
        },
    )
    out["producto"]["analisis_sensorial"] = {
        "puntaje_total": sensorial.get("puntaje_total") or sensorial.get("puntajeTotal"),
        "clasificacion": sensorial.get("clasificacion"),
        "mensaje": sensorial.get("mensaje"),
    }
    print(f"lab sensorial {sensorial}")

    _, compra = req(
        "POST",
        f"{EXPED}/acopio/compras/aprobar",
        token=admin_token,
        body={
            "muestraId": muestra_id,
            "precioAcordado": 3.95,
            "volumenKg": 460,
            "primas": 0.30,
        },
    )
    orden_id = compra["orden_id"]
    out["ids"]["orden_compra_id"] = orden_id

    _, bodega = req(
        "POST",
        f"{EXPED}/acopio/bodega/ingreso",
        token=admin_token,
        body={
            "ordenCompraId": orden_id,
            "codigoQR": QR,
            "pesoIngresado_lb": 1014.13,
            "tipoProceso": "Lavado",
        },
    )
    inventario_id = bodega["inventario_id"]
    out["ids"]["inventario_id"] = inventario_id

    _, trilla = req(
        "POST",
        f"{EXPED}/acopio/trilla/procesar",
        token=admin_token,
        body={"inventarioId": inventario_id, "factorRendimiento": 0.80},
    )
    out["producto"]["lote_oro"] = {
        "inventario_id": inventario_id,
        "orden_compra_id": orden_id,
        "codigo_qr": QR,
        "tipo_proceso": "Lavado",
        "peso_ingreso_kg": bodega.get("peso_ingreso_kg"),
        "trilla": trilla,
    }
    print(f"trilla {trilla}")

    # Verify producer can login
    code, prod_login = req(
        "POST",
        f"{AUTH}/api/auth/login",
        body={"email": EMAIL, "password": PASSWORD},
    )
    out["login_ok"] = bool(prod_login.get("access_token"))
    print(json.dumps(out, indent=2, ensure_ascii=False, default=str))
    return 0 if out["login_ok"] else 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
