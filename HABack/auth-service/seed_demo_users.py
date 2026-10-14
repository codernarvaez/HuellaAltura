"""Usuarios de prueba, uno por rol EUDR, para probar cada fase en local.

Solo para la base de desarrollo (Docker). No ejecutar contra Neon ni producción.
Uso (con docker compose levantado):
    docker compose exec -T auth-service python - < HABack/auth-service/seed_demo_users.py
"""
import asyncio
import os
from prisma import Prisma
from app.security import get_password_hash
from app.core.roles import TENANT_ADMIN, TECNICO_CAMPO, AUDITOR_INTERNO, PRODUCTOR

# Contraseña compartida, solo de prueba. Dominio example.com (reservado): la app rechaza .test.
DEMO_PASSWORD = "Demo2026!huella"

DEMO_USERS = [
    {"email": "admin.tenant.demo@example.com", "role": TENANT_ADMIN, "first_name": "Admin", "last_name": "Cooperativa Demo"},
    {"email": "tecnico.demo@example.com", "role": TECNICO_CAMPO, "first_name": "Técnico", "last_name": "Cooperativa Demo"},
    {"email": "auditor.demo@example.com", "role": AUDITOR_INTERNO, "first_name": "Auditor", "last_name": "Cooperativa Demo"},
    {"email": "productor.demo@example.com", "role": PRODUCTOR, "first_name": "Productor", "last_name": "Cooperativa Demo"},
]


async def main():
    url = os.environ.get("DATABASE_URL", "")
    if "@db:" not in url and "localhost" not in url and "127.0.0.1" not in url:
        raise SystemExit("Abortado: DATABASE_URL no es la base local de Docker.")

    db = Prisma()
    await db.connect(timeout=60)
    hashed = get_password_hash(DEMO_PASSWORD)
    for u in DEMO_USERS:
        role = await db.role.find_unique(where={"name": u["role"]})
        if not role:
            raise SystemExit(f"Falta el rol {u['role']}: ejecuta antes seed.py")
        fields = {
            "password_hash": hashed,
            "role_id": role.id,
            "first_name": u["first_name"],
            "last_name": u["last_name"],
            "status": "ACTIVO",
        }
        await db.user.upsert(
            where={"email": u["email"]},
            data={"create": {"email": u["email"], **fields}, "update": fields},
        )
        print(f"{u['role']:<16} {u['email']}")
    await db.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
