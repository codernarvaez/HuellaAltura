from prisma import Prisma
import asyncio

async def main():
    db = Prisma()
    await db.connect()
    fincas = await db.finca.find_many()
    print(f"Fincas count: {len(fincas)}")
    for f in fincas:
        print(f.id, f.nombre, f.usuario_id)
    await db.disconnect()

asyncio.run(main())
