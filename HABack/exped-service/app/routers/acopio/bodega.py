from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from prisma import Prisma

from app.database import get_db
from app.dependencies import log_user_action, require_roles
from app.routers.acopio.roles import BODEGA
from app.schemas.acopio import BodegaIngresoCreate, InventarioAcopioOut
from app.schemas.acopio import ProductoAcopioPublico

router = APIRouter(prefix="/acopio/bodega", tags=["Acopio - Bodega"])


@router.get(
    "/",
    response_model=list[InventarioAcopioOut],
    summary="Listar todo el registro de inventario",
)
def listar_inventario(
    db: Annotated[Prisma, Depends(get_db)],
    current_user: dict = Depends(require_roles(*BODEGA)),
):
    """
    Obtiene el registro completo de inventario en bodega.

    **Retorna:**
    - Lista de todos los lotes con: ID, orden asociada, peso ingreso, peso salida, estado actual
    - Permite filtrar y auditar el historial completo del inventario
    """
    inventarios = db.inventarioacopio.find_many(include={"ordenCompra": True})
    return inventarios


@router.post(
    "/ingreso",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(log_user_action("registrar_ingreso_bodega"))],
)
def registrar_ingreso(
    ingreso: BodegaIngresoCreate,
    db: Annotated[Prisma, Depends(get_db)],
    current_user: dict = Depends(require_roles(*BODEGA)),
):
    """
    Registra el ingreso físico del café en almacén mediante la lectura del código
    QR del productor, capturando peso y tipo de proceso (RF-APE-08).

    Es el paso que materializa el inventario del lote: sin él no existe
    `InventarioAcopio` y, por tanto, no puede haber trilla ni despacho.
    """
    orden = db.ordencompra.find_unique(
        where={"id": ingreso.ordenCompraId},
        include={"muestra": True},
    )
    if not orden:
        raise HTTPException(status_code=404, detail="Orden de compra no encontrada")

    if orden.estado != "APROBADA" or not orden.aprobadoEUDR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La orden de compra no está aprobada ni validada por EUDR.",
        )

    # El QR leído en báscula debe corresponder a la muestra de origen del lote
    if orden.muestra and ingreso.codigoQR != orden.muestra.codigoQR:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "El código QR leído no corresponde a la muestra asociada a esta "
                "orden de compra."
            ),
        )

    if orden.muestra and ingreso.tipoProceso != orden.muestra.tipoProceso:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"El tipo de proceso declarado ('{ingreso.tipoProceso}') no coincide "
                f"con el de la muestra ('{orden.muestra.tipoProceso}')."
            ),
        )

    if db.inventarioacopio.find_unique(where={"ordenCompraId": ingreso.ordenCompraId}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta orden de compra ya tiene un ingreso registrado en bodega.",
        )

    peso_kg = round(ingreso.pesoIngresado_lb * 0.453592, 2)

    inventario = db.inventarioacopio.create(
        data={
            "ordenCompraId": ingreso.ordenCompraId,
            "pesoIngresoKg": peso_kg,
            "pesoSalidaKg": 0.0,
            "estado": "EN_BODEGA",
        }
    )

    return {
        "mensaje": "Ingreso a bodega registrado con éxito.",
        "inventario_id": inventario.id,
        "peso_ingreso_kg": peso_kg,
        "estado": inventario.estado,
    }


@router.get("/{inventario_id}")
def obtener_inventario(
    inventario_id: int,
    db: Annotated[Prisma, Depends(get_db)],
    current_user: dict = Depends(require_roles(*BODEGA)),
):
    """Consulta el estado actual de un lote en bodega."""
    inventario = db.inventarioacopio.find_unique(where={"id": inventario_id})
    if not inventario:
        raise HTTPException(status_code=404, detail="Registro de inventario no encontrado")
    return inventario



public_router = APIRouter(
    prefix="/public/catalogo",
    tags=["Catálogo Público"]
)

@public_router.get("/", response_model=list[ProductoAcopioPublico])
def obtener_catalogo_publico(db: Annotated[Prisma, Depends(get_db)]):
    try:
        # Usamos inventarioacopio que es tu tabla real
        lotes_inventario = db.inventarioacopio.find_many(
            where={
                "estado": "EN_BODEGA" # Filtra por el estado comercial correcto
            },
            include={
                "ordenCompra": {
                    "include": {
                        "muestra": True # Relación anidada real
                    }
                }
            }
        )
        
        productos_formateados = []
        for lote in lotes_inventario:
            orden = lote.ordenCompra
            muestra = orden.muestra if orden else None
            
            # Sumamos el precio base más las primas si existen, o solo mandamos el precio base
            precio_base = getattr(orden, 'precioAcordado', 0.0) if orden else 0.0
            primas = getattr(orden, 'primas', 0.0) if (orden and orden.primas) else 0.0
            precio_total = precio_base + primas
            
            producto = {
                "id": lote.id,
                "codigoLote": getattr(muestra, 'codigoQR', "N/A") if muestra else "N/A", 
                "pesoDisponibleKg": lote.pesoIngresoKg - lote.pesoSalidaKg,
                "pesoTotalKg": lote.pesoIngresoKg,
                "tipoCafe": getattr(muestra, 'tipoProceso', None) if muestra else None,
                "precioReferencial": precio_total if precio_total > 0 else None, # <-- EXTRAEMOS EL PRECIO
                "puntajeSca": getattr(muestra, 'puntajeTotal', None) if muestra else None, 
                "proceso": getattr(muestra, 'tipoProceso', None) if muestra else None,
                "esEspecialidad": True if getattr(muestra, 'clasificacion', '') == 'Café de Especialidad' else False
            }
            productos_formateados.append(producto)
            
        return productos_formateados

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al consolidar el catálogo de acopio: {str(e)}"
        )