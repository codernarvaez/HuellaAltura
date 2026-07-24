import asyncio
import os
import secrets
import sys

from prisma import Prisma
from app.security import get_password_hash
from app.core.roles import EUDR_ROLES, SUPER_ADMIN

# Credenciales del administrador inicial. Nunca deben versionarse: se leen del
# entorno y, si falta la contraseña, se genera una aleatoria de un solo uso.
ADMIN_EMAIL = os.getenv("SEED_ADMIN_EMAIL")
ADMIN_PASSWORD = os.getenv("SEED_ADMIN_PASSWORD")

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
    {
        "name": "PRODUCTOR",
        "description": "Usuario general.",
    },
    {
        "name": "ANALISTA_FISICO",
        "description": "Laboratorista que registra humedad, criba, densidad y defectos sobre la muestra de 350 g.",
    },
    {
        "name": "CATADOR_Q",
        "description": "Catador certificado Q que evalúa el perfil sensorial según el protocolo SCA.",
    },
    {
        "name": "JEFE_CALIDAD",
        "description": "Responsable de consolidar el informe global de la muestra y su clasificación.",
    },
    {
        "name": "GERENCIA_ACOPIO",
        "description": "Autoriza órdenes de compra y despachos, sujeto a la validación EUDR.",
    },
    {
        "name": "BODEGUERO",
        "description": "Opera el ingreso a bodega por código QR, el pesaje y el proceso de trilla.",
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

    if not ADMIN_EMAIL:
        print(
            "SEED_ADMIN_EMAIL no está definido: se omite la creación del "
            "administrador y solo se sincronizan los roles."
        )
    else:
        print("Sincronizando usuario administrador...")
        admin_role = await db.role.find_unique(where={"name": SUPER_ADMIN})
        if not admin_role:
            print(f"No se encontró el rol {SUPER_ADMIN}; se aborta.", file=sys.stderr)
            await db.disconnect()
            return

        # Sin contraseña explícita se genera una aleatoria: así el seed nunca
        # deja una credencial predecible en un entorno desplegado.
        password_plain = ADMIN_PASSWORD or secrets.token_urlsafe(18)
        generada = ADMIN_PASSWORD is None
        hashed_password = get_password_hash(password_plain)

        await db.user.upsert(
            where={"email": ADMIN_EMAIL},
            data={
                "create": {
                    "email": ADMIN_EMAIL,
                    "password_hash": hashed_password,
                    "role_id": admin_role.id,
                },
                "update": {
                    "password_hash": hashed_password,
                    "role_id": admin_role.id,
                },
            },
        )

        if generada:
            print(
                f"Administrador {ADMIN_EMAIL} creado con contraseña generada: "
                f"{password_plain}\nGuárdala ahora: no vuelve a mostrarse."
            )
        else:
            print(f"Administrador {ADMIN_EMAIL} sincronizado con la contraseña del entorno.")

    await db.disconnect()
    print(f"Seed completado. Roles activos: {', '.join(EUDR_ROLES)}")


if __name__ == "__main__":
    asyncio.run(main())
