import asyncio
import bcrypt
from prisma import Prisma

async def main():
    db = Prisma()
    await db.connect()

    # Crear rol si no existe
    role = await db.role.find_first(where={"name": "ADMIN"})
    if not role:
        role = await db.role.create(data={"name": "ADMIN", "description": "Administrador"})

    # Crear usuario admin
    password_hash = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode()
    user = await db.user.create(data={
        "email": "admin@huelladealtura.com",
        "password_hash": password_hash,
        "role_id": role.id,
        "first_name": "Admin",
        "last_name": "Sistema",
        "status": "ACTIVO"
    })

    print(f"Usuario creado: {user.email}")
    await db.disconnect()

asyncio.run(main())