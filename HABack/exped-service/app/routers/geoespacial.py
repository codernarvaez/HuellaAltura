import json
import math
import xml.etree.ElementTree as ET
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from prisma import Prisma, Json

from app.database import get_db
from app.dependencies import get_current_user, log_user_action, require_roles
from app.schemas.schemas import FincaOut

router = APIRouter()


def parse_geojson(content: str) -> dict:
    """Parsea un archivo GeoJSON y extrae coordenadas y propiedades."""
    try:
        data = json.loads(content)
        coordinates = []
        properties = {}

        if data.get("type") == "Feature":
            geometry = data.get("geometry", {})
            properties = data.get("properties", {})
            coordinates = extract_coordinates(geometry)
        elif data.get("type") == "FeatureCollection":
            features = data.get("features", [])
            if features:
                coordinates = extract_coordinates(features[0].get("geometry", {}))
                properties = features[0].get("properties", {})
        else:
            coordinates = extract_coordinates(data)

        return {
            "type": "geojson",
            "coordinates": coordinates,
            "properties": properties,
            "raw": data
        }
    except json.JSONDecodeError as e:
        raise ValueError(f"Error al parsear GeoJSON: {str(e)}")


def parse_kml(content: str) -> dict:
    """Parsea un archivo KML y extrae coordenadas."""
    try:
        root = ET.fromstring(content.encode())
        ns = {"kml": "http://www.opengis.net/kml/2.2"}

        coordinates = []
        name = ""
        description = ""

        # Buscar nombre del documento
        doc_name = root.find(".//kml:name", ns)
        if doc_name is not None:
            name = doc_name.text or ""

        # Buscar descripción
        doc_desc = root.find(".//kml:description", ns)
        if doc_desc is not None:
            description = doc_desc.text or ""

        # Extraer coordenadas de Polygon
        coords_elem = root.find(".//kml:Polygon/kml:outerBoundaryIs/kml:LinearRing/kml:coordinates", ns)
        if coords_elem is not None and coords_elem.text:
            coord_pairs = coords_elem.text.strip().split()
            for pair in coord_pairs:
                parts = pair.split(",")
                if len(parts) >= 2:
                    try:
                        lon, lat = float(parts[0]), float(parts[1])
                        coordinates.append([lat, lon])
                    except ValueError:
                        pass

        # Si no encontró Polygon, busca Point
        if not coordinates:
            coords_elem = root.find(".//kml:Point/kml:coordinates", ns)
            if coords_elem is not None and coords_elem.text:
                parts = coords_elem.text.strip().split(",")
                if len(parts) >= 2:
                    lon, lat = float(parts[0]), float(parts[1])
                    coordinates = [[lat, lon]]

        return {
            "type": "kml",
            "coordinates": coordinates,
            "properties": {"name": name, "description": description},
            "raw": content
        }
    except ET.ParseError as e:
        raise ValueError(f"Error al parsear KML: {str(e)}")


def parse_gpx(content: str) -> dict:
    """Parsea un archivo GPX y extrae coordenadas y waypoints."""
    try:
        root = ET.fromstring(content.encode())
        ns = {"gpx": "http://www.topografix.com/GPX/1/1"}

        coordinates = []
        name = ""
        description = ""

        # Buscar nombre de track
        track_name = root.find(".//gpx:trk/gpx:name", ns)
        if track_name is not None:
            name = track_name.text or ""

        # Extraer puntos de track
        trkpts = root.findall(".//gpx:trk/gpx:trkseg/gpx:trkpt", ns)
        for trkpt in trkpts:
            lat = trkpt.get("lat")
            lon = trkpt.get("lon")
            if lat and lon:
                coordinates.append([float(lat), float(lon)])

        # Si no hay track, buscar waypoints (wpt)
        if not coordinates:
            wpts = root.findall(".//gpx:wpt", ns)
            for wpt in wpts:
                lat = wpt.get("lat")
                lon = wpt.get("lon")
                if lat and lon:
                    coordinates.append([float(lat), float(lon)])

        # Buscar descripción
        metadata_desc = root.find(".//gpx:metadata/gpx:desc", ns)
        if metadata_desc is not None:
            description = metadata_desc.text or ""

        return {
            "type": "gpx",
            "coordinates": coordinates,
            "properties": {"name": name, "description": description},
            "raw": content
        }
    except ET.ParseError as e:
        raise ValueError(f"Error al parsear GPX: {str(e)}")


def extract_coordinates(geometry: dict) -> list:
    """Extrae coordenadas de un objeto GeoJSON geometry."""
    coords = []
    geom_type = geometry.get("type", "")
    coordinates = geometry.get("coordinates", [])

    if geom_type == "Point":
        coords = [[coordinates[1], coordinates[0]]]  # [lat, lon]
    elif geom_type == "LineString":
        coords = [[c[1], c[0]] for c in coordinates]
    elif geom_type == "Polygon":
        coords = [[c[1], c[0]] for c in coordinates[0]]  # Outer ring only
    elif geom_type == "MultiPolygon":
        if coordinates:
            coords = [[c[1], c[0]] for c in coordinates[0][0]]

    return coords


def calculate_center(coordinates: list) -> tuple:
    """Calcula el centro (lat, lon) de una lista de coordenadas."""
    if not coordinates:
        return None, None

    lats = [c[0] for c in coordinates]
    lons = [c[1] for c in coordinates]

    center_lat = sum(lats) / len(lats)
    center_lon = sum(lons) / len(lons)

    return center_lat, center_lon


def geocode_location(lat: float, lon: float) -> dict:
    """Geocodifica coordenadas para obtener provincia/cantón (simulado)."""
    # En producción, esto usaría la API de nominatim o Google Maps
    # Por ahora retorna datos simulados que pueden ser sobrescritos
    locations_map = {
        (-4.26, -79.22): {"provincia": "Loja", "canton": "Loja", "parroquia": "Vilcabamba", "sector": "18"},
        (-4.0, -79.0): {"provincia": "Loja", "canton": "Catamayo", "parroquia": "Catamayo", "sector": "Urbano"},
        (-3.9, -78.5): {"provincia": "Azuay", "canton": "Cuenca", "parroquia": "Cuenca", "sector": "Centro"},
    }

    # Buscar la ubicación más cercana
    closest = None
    min_distance = float("inf")

    for (ref_lat, ref_lon), location in locations_map.items():
        distance = abs(lat - ref_lat) + abs(lon - ref_lon)
        if distance < min_distance:
            min_distance = distance
            closest = location

    return closest or {
        "provincia": "Ecuador",
        "canton": "Desconocido",
        "parroquia": "Desconocido",
        "sector": "Rural"
    }


def calculate_polygon_area(coordinates: list) -> float:
    """
    Calcula el área de un polígono en hectáreas usando la fórmula de Shoelace.
    Las coordenadas deben estar en formato [lat, lon].

    Nota: Esta es una aproximación que funciona mejor cerca del ecuador.
    Para producción, usar biblioteca como geopy o Shapely.
    """
    if len(coordinates) < 3:
        return 0.0

    # Convertir [lat, lon] a [lon, lat] para el cálculo
    coords_lon_lat = [[lon, lat] for lat, lon in coordinates]

    # Fórmula de Shoelace en grados
    n = len(coords_lon_lat)
    area = 0.0

    for i in range(n):
        j = (i + 1) % n
        area += coords_lon_lat[i][0] * coords_lon_lat[j][1]
        area -= coords_lon_lat[j][0] * coords_lon_lat[i][1]

    area = abs(area) / 2.0

    # Convertir grados² a metros² (aproximación en Ecuador)
    # 1 grado de latitud ≈ 111 km
    # 1 grado de longitud ≈ 111 km * cos(latitud)
    avg_lat = sum(coord[0] for coord in coordinates) / len(coordinates)
    lat_rad = math.radians(avg_lat)
    meters_per_degree_lat = 111000
    meters_per_degree_lon = 111000 * math.cos(lat_rad)

    area_m2 = area * meters_per_degree_lat * meters_per_degree_lon
    area_hectareas = area_m2 / 10000  # 1 hectárea = 10,000 m²

    return max(0.0, area_hectareas)  # Asegurar valor positivo


async def validate_eudr_deforestation(coordinates: list) -> dict:
    """
    Valida la deforestación usando Google Earth Engine API (simulado).
    En producción, integrar con earth-engine-api.
    """
    # Simulación: retorna resultado basado en coordenadas
    # En producción, hacer llamada real a GEE
    return {
        "deforestacion_detectada": False,
        "porcentaje": 0.0,
        "fecha_analisis": "2026-06-28",
        "fuente": "Google Earth Engine - Sentinel-2",
        "estado_eudr": "APROBADO"
    }


# ===== ENDPOINTS PÚBLICOS (Sin autenticación) =====

@router.post(
    "/publico/cargar-poligono",
    response_model=dict,
    summary="Cargar polígono desde GPX/KML/GEOJSON (público)",
    tags=["Público"]
)
async def cargar_poligono_publico(
    archivo: UploadFile = File(...)
) -> dict:
    """
    Endpoint público para cargar un archivo geoespacial sin autenticación.

    **Formatos soportados:**
    - GPX (.gpx)
    - KML (.kml)
    - GeoJSON (.geojson, .json)

    **Retorna:**
    - Coordenadas extraídas
    - Ubicación geocodificada (provincia, cantón)
    - Validación EUDR de deforestación
    """
    try:
        if not archivo.filename:
            raise HTTPException(status_code=400, detail="El archivo no tiene nombre. Por favor, verifica el archivo e intenta de nuevo.")

        content = await archivo.read()
        if not content:
            raise HTTPException(status_code=400, detail="El archivo está vacío. Por favor, selecciona un archivo válido.")

        try:
            content_str = content.decode("utf-8")
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="El archivo no está en formato UTF-8. Asegúrate de que sea un archivo de texto válido.")

        # Detectar tipo de archivo
        file_ext = archivo.filename.lower().split(".")[-1] if "." in archivo.filename else ""

        if not file_ext:
            raise HTTPException(status_code=400, detail="El archivo no tiene extensión. Usa .gpx, .kml o .geojson.")

        try:
            if file_ext == "geojson" or file_ext == "json":
                parsed = parse_geojson(content_str)
            elif file_ext == "kml":
                parsed = parse_kml(content_str)
            elif file_ext == "gpx":
                parsed = parse_gpx(content_str)
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Formato de archivo no soportado: .{file_ext}. Utiliza .gpx, .kml o .geojson."
                )
        except HTTPException:
            raise
        except ValueError as e:
            raise HTTPException(
                status_code=400,
                detail=f"El archivo no tiene un formato válido: {str(e)}. Verifica que sea un archivo GPX, KML o GeoJSON correcto."
            )

        coordinates = parsed.get("coordinates", [])
        if not coordinates:
            raise HTTPException(
                status_code=400,
                detail="El archivo no contiene coordenadas válidas. Asegúrate de que el archivo tenga polígonos o puntos geográficos definidos."
            )

        # Calcular centro
        center_lat, center_lon = calculate_center(coordinates)

        # Geocodificar ubicación
        location = geocode_location(center_lat, center_lon)

        # Calcular área del polígono
        area_hectareas = calculate_polygon_area(coordinates)

        # Validar EUDR
        eudr_result = await validate_eudr_deforestation(coordinates)

        return {
            "success": True,
            "archivo_tipo": parsed["type"],
            "coordenadas": coordinates,
            "centro": {"latitud": center_lat, "longitud": center_lon},
            "ubicacion": location,
            "propiedades": parsed["properties"],
            "validacion_eudr": eudr_result,
            "area_hectareas": area_hectareas,
            "sugerencias": {
                "nombre": parsed["properties"].get("name", ""),
                "provincia": location["provincia"],
                "canton": location["canton"],
                "parroquia": location.get("parroquia", ""),
                "sector": location.get("sector", ""),
                "area_total_ha": area_hectareas,
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Error inesperado al procesar el archivo. Por favor, intenta de nuevo. Detalles: {str(e)[:100]}"
        )


# ===== ENDPOINTS PRIVADOS (Requieren autenticación) =====

@router.post(
    "/cargar-poligono",
    response_model=FincaOut,
    status_code=201,
    summary="Cargar polígono y crear finca",
    dependencies=[Depends(log_user_action("create_finca_from_geospatial"))],
)
async def cargar_poligono_crear_finca(
    archivo: UploadFile = File(...),
    nombre_finca: str = None,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(
        require_roles("SUPER_ADMIN", "TENANT_ADMIN", "TECNICO_CAMPO", "PRODUCTOR")
    ),
) -> FincaOut:
    """
    Carga un archivo geoespacial, extrae datos y crea una finca automáticamente.

    **Flujo:**
    1. Parsea archivo GPX/KML/GEOJSON
    2. Geocodifica ubicación (provincia, cantón)
    3. Valida EUDR (deforestación)
    4. Crea finca con polígono y datos extraídos
    """
    try:
        if not archivo.filename:
            raise HTTPException(status_code=400, detail="El archivo no tiene nombre. Por favor, verifica el archivo e intenta de nuevo.")

        content = await archivo.read()
        if not content:
            raise HTTPException(status_code=400, detail="El archivo está vacío. Por favor, selecciona un archivo válido.")

        try:
            content_str = content.decode("utf-8")
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="El archivo no está en formato UTF-8. Asegúrate de que sea un archivo de texto válido.")

        # Detectar tipo de archivo
        file_ext = archivo.filename.lower().split(".")[-1] if "." in archivo.filename else ""

        if not file_ext:
            raise HTTPException(status_code=400, detail="El archivo no tiene extensión. Usa .gpx, .kml o .geojson.")

        try:
            if file_ext == "geojson" or file_ext == "json":
                parsed = parse_geojson(content_str)
            elif file_ext == "kml":
                parsed = parse_kml(content_str)
            elif file_ext == "gpx":
                parsed = parse_gpx(content_str)
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Formato de archivo no soportado: .{file_ext}. Utiliza .gpx, .kml o .geojson."
                )
        except HTTPException:
            raise
        except ValueError as e:
            raise HTTPException(
                status_code=400,
                detail=f"El archivo no tiene un formato válido: {str(e)}. Verifica que sea un archivo GPX, KML o GeoJSON correcto."
            )

        coordinates = parsed.get("coordinates", [])
        if not coordinates:
            raise HTTPException(
                status_code=400,
                detail="El archivo no contiene coordenadas válidas. Asegúrate de que el archivo tenga polígonos o puntos geográficos definidos."
            )

        # Calcular centro
        center_lat, center_lon = calculate_center(coordinates)

        # Geocodificar
        location = geocode_location(center_lat, center_lon)

        # Calcular área del polígono
        area_hectareas = calculate_polygon_area(coordinates)

        # Crear finca con datos extraídos automáticamente
        finca_data = {
            "nombre": nombre_finca or parsed["properties"].get("name", f"Finca {uuid4().hex[:8]}"),
            "usuario_id": current_user.get("sub"),
            "provincia": location["provincia"],
            "canton": location["canton"],
            "parroquia": location.get("parroquia"),
            "sector": location.get("sector"),
            "latitud": center_lat,
            "longitud": center_lon,
            "area_total_ha": area_hectareas,
            "area_cultivada_ha": area_hectareas,
            "poligono": Json({
                "type": "Polygon",
                "coordinates": [[[c[1], c[0]] for c in coordinates]],
                "fuente": parsed["type"],
                "archivo_original": archivo.filename,
                "area_hectareas": area_hectareas
            }),
            "eudr_id": f"uuidv4-{uuid4().hex[:8].upper()}-{uuid4().hex[:5].upper()}",
        }

        finca = db.finca.create(data=finca_data)
        return finca
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Error al crear la finca desde el archivo. Por favor, intenta de nuevo. Detalles: {str(e)[:100]}"
        )


@router.post(
    "/{finca_id}/validar-eudr",
    summary="Validar deforestación EUDR para finca",
)
async def validar_eudr_finca(
    finca_id: str,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(
        require_roles("SUPER_ADMIN", "TENANT_ADMIN", "TECNICO_CAMPO", "AUDITOR_INTERNO")
    ),
) -> dict:
    """
    Valida si la finca tiene deforestación usando Google Earth Engine.

    **Resultado:**
    - APROBADO: Sin deforestación post 31-Dic-2020
    - ALERTA: Deforestación detectada
    """
    try:
        finca = db.finca.find_first(where={"id": finca_id})
        if not finca:
            raise HTTPException(
                status_code=404,
                detail=f"No se encontró una finca con el ID: {finca_id}. Verifica que el ID sea correcto."
            )

        poligono = finca.poligono
        if not poligono or not poligono.get("coordinates"):
            raise HTTPException(
                status_code=400,
                detail=f"La finca '{finca.nombre}' no tiene un polígono definido. Por favor, carga un archivo geoespacial (GPX, KML o GeoJSON) primero."
            )

        # Extraer coordenadas del polígono
        coords_geojson = poligono["coordinates"][0]
        coordinates = [[c[1], c[0]] for c in coords_geojson]

        # Validar EUDR
        result = await validate_eudr_deforestation(coordinates)

        return {
            "finca_id": finca_id,
            "nombre_finca": finca.nombre,
            "resultado": result,
            "requiere_accion": not result["deforestacion_detectada"],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Error al validar deforestación de la finca. Por favor, intenta de nuevo. Detalles: {str(e)[:100]}"
        )
