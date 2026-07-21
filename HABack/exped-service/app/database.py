from prisma import Prisma

db = Prisma()
prisma = db


def get_db() -> Prisma:
    return db
