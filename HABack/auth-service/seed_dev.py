"""
Usuarios de prueba para desarrollo local (no se ejecuta al arrancar el contenedor).

    docker compose exec auth-service python seed_dev.py

Los IDs son fijos para que exped-service/seed_dev.py pueda asignar la finca de prueba
al productor sin consultar este servicio. Requiere que seed.py ya haya creado los roles.
"""
import asyncio
import os
import sys

from prisma import Prisma

from app.core.roles import PRODUCTOR, SUPER_ADMIN
from app.security import get_password_hash

USUARIOS_DEV = [
    {
        "id": "00000000-0000-4000-8000-0000000000a1",
        "email": "admin.dev@example.com",
        "password": "AdminDev#2026",
        "first_name": "Admin",
        "last_name": "Desarrollo",
        "role": SUPER_ADMIN,
    },
    {
        "id": "00000000-0000-4000-8000-0000000000b1",
        "email": "productor.dev@example.com",
        "password": "ProductorDev#2026",
        "first_name": "Productor",
        "last_name": "Prueba",
        "role": PRODUCTOR,
    },
]


async def main():
    if os.getenv("ENVIRONMENT") == "production":
        sys.exit("seed_dev.py no se ejecuta con ENVIRONMENT=production")

    db = Prisma()
    await db.connect(timeout=60)
    try:
        for u in USUARIOS_DEV:
            role = await db.role.find_unique(where={"name": u["role"]})
            if not role:
                sys.exit(f"Falta el rol {u['role']}: ejecuta primero seed.py")

            datos = {
                "first_name": u["first_name"],
                "last_name": u["last_name"],
                "password_hash": get_password_hash(u["password"]),
                "role_id": role.id,
                "status": "ACTIVO",
            }
            await db.user.upsert(
                where={"email": u["email"]},
                data={"create": {"id": u["id"], "email": u["email"], **datos}, "update": datos},
            )
            print(f"Usuario {u['role']}: {u['email']}")
    finally:
        await db.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
