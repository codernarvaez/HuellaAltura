"""
Finca de prueba para desarrollo local (no se ejecuta al arrancar el contenedor).

    docker compose exec exped-service python seed_dev.py

Se asigna al productor de prueba creado por auth-service/seed_dev.py (mismo ID fijo).
"""
import os
import sys

from prisma import Json, Prisma

PRODUCTOR_DEV_ID = "00000000-0000-4000-8000-0000000000b1"
FINCA_DEV_ID = "00000000-0000-4000-8000-0000000000f1"

POLIGONO = {
    "type": "Polygon",
    "coordinates": [
        [
            [-79.2239, -4.2618],
            [-79.2223, -4.2618],
            [-79.2223, -4.2633],
            [-79.2239, -4.2633],
            [-79.2239, -4.2618],
        ]
    ],
}

FINCA = {
    "nombre": "El Ahuacate (prueba)",
    "eudr_id": "uuidv4-DE000001-0F001",
    "usuario_id": PRODUCTOR_DEV_ID,
    "provincia": "Loja",
    "canton": "Loja",
    "parroquia": "Vilcabamba",
    "sector": "Yamburara",
    "area_total_ha": 3.0,
    "area_cultivada_ha": 1.5,
    "tenencia": "PROPIA",
    "latitud": -4.2625,
    "longitud": -79.2231,
}


def main():
    if os.getenv("ENVIRONMENT") == "production":
        sys.exit("seed_dev.py no se ejecuta con ENVIRONMENT=production")

    db = Prisma()
    db.connect()
    try:
        datos = {**FINCA, "poligono": Json(POLIGONO)}
        finca = db.finca.upsert(
            where={"id": FINCA_DEV_ID},
            data={"create": {"id": FINCA_DEV_ID, **datos}, "update": datos},
        )
        print(f"Finca: {finca.nombre} (id {finca.id}, eudr_id {finca.eudr_id})")
    finally:
        db.disconnect()


if __name__ == "__main__":
    main()
