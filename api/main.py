from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# CORS para permitir peticiones desde Astro
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4321"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/items")
def get_items():
    return [{"id": 1, "name": "Item uno"}]