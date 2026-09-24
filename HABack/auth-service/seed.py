import asyncio
import os
import secrets
import sys

from app.core.roles import EUDR_ROLES, SUPER_ADMIN
from app.security import get_password_hash
from prisma import Prisma

# Credenciales del administrador inicial. Nunca deben versionarse: se leen del
# entorno y, si falta la contraseña, se genera una aleatoria de un solo uso.
ADMIN_EMAIL = os.getenv("SEED_ADMIN_EMAIL")
ADMIN_PASSWORD = os.getenv("SEED_ADMIN_PASSWORD")

# Cuentas demo por rol (una por cada rol EUDR/acopio). Activar con SEED_DEMO_USERS=1.
SEED_DEMO_USERS = os.getenv("SEED_DEMO_USERS", "").lower() in {"1", "true", "yes"}
SEED_DEMO_PASSWORD = os.getenv("SEED_DEMO_PASSWORD")
SEED_DEMO_DOMAIN = os.getenv("SEED_DEMO_DOMAIN", "demo.huellaaltura.com")

ROLES_DATA = [
    {
        "name": SUPER_ADMIN,
        "description": "Administrador global de la infraestructura multi-inquilino del sistema.",
    },
    {
        "name": "TENANT_ADMIN",
        "description": "Administrador del inquilino: variables dinámicas y gestión de usuarios.",
    },
    {
        "name": "TECNICO_CAMPO",
        "description": "Operario de campo que registra expedientes, datos agroambientales y polígonos GPS.",
    },
    {
        "name": "AUDITOR_INTERNO",
        "description": "Analista de expedientes, auditoría satelital Copernicus y certificados.",
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


def _demo_email(role_name: str) -> str:
    return f"{role_name.lower()}@{SEED_DEMO_DOMAIN}"


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
            "SEED_ADMIN_EMAIL no está definido: se omite la creación del administrador y solo se sincronizan los roles."
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

    if SEED_DEMO_USERS:
        if not SEED_DEMO_PASSWORD:
            print(
                "SEED_DEMO_USERS activo pero falta SEED_DEMO_PASSWORD; se omiten cuentas demo.",
                file=sys.stderr,
            )
        else:
            print(f"Sincronizando cuentas demo por rol (@{SEED_DEMO_DOMAIN})...")
            hashed_demo = get_password_hash(SEED_DEMO_PASSWORD)
            created: list[str] = []
            for role_name in EUDR_ROLES:
                role = await db.role.find_unique(where={"name": role_name})
                if not role:
                    print(f"  · rol {role_name} no encontrado; se omite", file=sys.stderr)
                    continue
                email = _demo_email(role_name)
                await db.user.upsert(
                    where={"email": email},
                    data={
                        "create": {
                            "email": email,
                            "password_hash": hashed_demo,
                            "role_id": role.id,
                        },
                        "update": {
                            "password_hash": hashed_demo,
                            "role_id": role.id,
                        },
                    },
                )
                created.append(f"{email} → {role_name}")
            print("Cuentas demo listas (misma contraseña SEED_DEMO_PASSWORD):")
            for line in created:
                print(f"  · {line}")

    await db.disconnect()
    print(f"Seed completado. Roles activos: {', '.join(EUDR_ROLES)}")


if __name__ == "__main__":
    asyncio.run(main())
