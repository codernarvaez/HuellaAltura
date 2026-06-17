from datetime import datetime
from pydantic import BaseModel, Field

class AsociacionBase(BaseModel):
    nombre: str = Field(..., example="Asociación de Productores de Café")
    nombre_finca: str = Field(..., example="Finca La Esperanza")

class AsociacionCreate(AsociacionBase):
    pass

class AsociacionOut(AsociacionBase):
    id: str
    fecha_creacion: datetime
    creado_por: str
    user_id: str

    class Config:
        from_attributes = True
