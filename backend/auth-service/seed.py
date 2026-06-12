import asyncio
from prisma import Prisma
from app.security import get_password_hash
from app.core.roles import EUDR_ROLES, SUPER_ADMIN

ROLES_DATA = [
    {
        "name": SUPER_ADMIN,
        "description": "Administrador global responsable de gestionar la infraestructura multi-inquilino del sistema completo.",
    },
    {
        "name": "TENANT_ADMIN",
        "description": "Administrador del inquilino encargado de configurar variables dinámicas y gestionar a los usuarios.",
    },
    {
        "name": "TECNICO_CAMPO",
        "description": "Operario de campo que registra expedientes, datos agroambientales y polígonos GPS.",
    },
    {
        "name": "AUDITOR_INTERNO",
        "description": "Analista que revisa expedientes, evalúa la auditoría satelital Copernicus y emite certificados.",
    },
]


async def main():
    db = Prisma()
    try:
        await db.connect(timeout=60)
    except Exception as e:
        print(f"Error al conectar a la base de datos: {e}")
        return

    print("Sincronizando roles EUDR...")
    for rd in ROLES_DATA:
        await db.role.upsert(
            where={"name": rd["name"]},
            data={
                "create": {"name": rd["name"], "description": rd["description"]},
                "update": {"description": rd["description"]},
            },
        )

    print("Sincronizando usuario administrador...")
    admin_role = await db.role.find_unique(where={"name": SUPER_ADMIN})
    if admin_role:
        password_plain = "admin@admin"
        hashed_password = get_password_hash(password_plain)

        await db.user.upsert(
            where={"email": "admin@eudr.local"},
            data={
                "create": {
                    "email": "admin@eudr.local",
                    "password_hash": hashed_password,
                    "role_id": admin_role.id,
                },
                "update": {
                    "password_hash": hashed_password,
                    "role_id": admin_role.id,
                },
            },
        )
        print(f"Usuario admin@eudr.local sincronizado con contraseña: {password_plain}")

    await db.disconnect()
    print(f"Seed completado. Roles activos: {', '.join(EUDR_ROLES)}")


if __name__ == "__main__":
    asyncio.run(main())
