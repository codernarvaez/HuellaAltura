import json
import pytest
from io import BytesIO
from fastapi.testclient import TestClient

from app.main import app
from app.routers.geoespacial import (
    parse_geojson, parse_kml, parse_gpx,
    calculate_center, calculate_polygon_area
)


client = TestClient(app)


# ===== PRUEBAS DE PARSEO =====

class TestGeoJSON:
    """Pruebas de parseo de archivos GeoJSON."""

    def test_parse_geojson_feature_polygon(self):
        """Parsea GeoJSON Feature con Polygon."""
        geojson_content = json.dumps({
            "type": "Feature",
            "properties": {"name": "El Ahuacate"},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [-79.2231, -4.2625],
                    [-79.2230, -4.2620],
                    [-79.2235, -4.2630],
                    [-79.2231, -4.2625]
                ]]
            }
        })

        result = parse_geojson(geojson_content)

        assert result["type"] == "geojson"
        assert len(result["coordinates"]) == 4
        assert result["coordinates"][0] == [-4.2625, -79.2231]  # [lat, lon]
        assert result["properties"]["name"] == "El Ahuacate"

    def test_parse_geojson_feature_collection(self):
        """Parsea GeoJSON FeatureCollection."""
        geojson_content = json.dumps({
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {"name": "Finca 1"},
                    "geometry": {
                        "type": "Point",
                        "coordinates": [-79.2231, -4.2625]
                    }
                }
            ]
        })

        result = parse_geojson(geojson_content)

        assert result["type"] == "geojson"
        assert len(result["coordinates"]) == 1
        assert result["coordinates"][0] == [-4.2625, -79.2231]

    def test_parse_geojson_invalid(self):
        """Valida error con JSON inválido."""
        with pytest.raises(ValueError, match="Error al parsear GeoJSON"):
            parse_geojson("{invalid json}")


class TestKML:
    """Pruebas de parseo de archivos KML."""

    def test_parse_kml_polygon(self):
        """Parsea KML con Polygon."""
        kml_content = '''<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>El Ahuacate</name>
    <description>Finca cafetalera</description>
    <Placemark>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              -79.2231,-4.2625,0
              -79.2230,-4.2620,0
              -79.2235,-4.2630,0
              -79.2231,-4.2625,0
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>'''

        result = parse_kml(kml_content)

        assert result["type"] == "kml"
        assert len(result["coordinates"]) == 4
        assert result["coordinates"][0] == [-4.2625, -79.2231]
        assert result["properties"]["name"] == "El Ahuacate"

    def test_parse_kml_point(self):
        """Parsea KML con Point."""
        kml_content = '''<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <Point>
        <coordinates>-79.2231,-4.2625,0</coordinates>
      </Point>
    </Placemark>
  </Document>
</kml>'''

        result = parse_kml(kml_content)

        assert result["type"] == "kml"
        assert len(result["coordinates"]) == 1
        assert result["coordinates"][0] == [-4.2625, -79.2231]

    def test_parse_kml_invalid(self):
        """Valida error con KML inválido."""
        with pytest.raises(ValueError, match="Error al parsear KML"):
            parse_kml("<invalid><kml>")


class TestGPX:
    """Pruebas de parseo de archivos GPX."""

    def test_parse_gpx_track(self):
        """Parsea GPX con Track."""
        gpx_content = '''<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Mi Finca</name>
    <desc>Ruta de monitoreo</desc>
  </metadata>
  <trk>
    <name>Finca El Ahuacate</name>
    <trkseg>
      <trkpt lat="-4.2625" lon="-79.2231"><ele>2100</ele></trkpt>
      <trkpt lat="-4.2620" lon="-79.2230"><ele>2105</ele></trkpt>
      <trkpt lat="-4.2630" lon="-79.2235"><ele>2095</ele></trkpt>
    </trkseg>
  </trk>
</gpx>'''

        result = parse_gpx(gpx_content)

        assert result["type"] == "gpx"
        assert len(result["coordinates"]) == 3
        assert result["coordinates"][0] == [-4.2625, -79.2231]
        assert result["properties"]["name"] == "Finca El Ahuacate"

    def test_parse_gpx_waypoints(self):
        """Parsea GPX con Waypoints."""
        gpx_content = '''<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <wpt lat="-4.2625" lon="-79.2231"><name>Punto 1</name></wpt>
  <wpt lat="-4.2620" lon="-79.2230"><name>Punto 2</name></wpt>
</gpx>'''

        result = parse_gpx(gpx_content)

        assert result["type"] == "gpx"
        assert len(result["coordinates"]) == 2
        assert result["coordinates"][0] == [-4.2625, -79.2231]

    def test_parse_gpx_invalid(self):
        """Valida error con GPX inválido."""
        with pytest.raises(ValueError, match="Error al parsear GPX"):
            parse_gpx("<invalid><gpx>")


# ===== PRUEBAS DE CÁLCULOS =====

class TestCalculations:
    """Pruebas de funciones de cálculo."""

    def test_calculate_center_polygon(self):
        """Calcula centro de polígono."""
        coordinates = [
            [-4.2625, -79.2231],
            [-4.2620, -79.2230],
            [-4.2630, -79.2235]
        ]

        center_lat, center_lon = calculate_center(coordinates)

        assert abs(center_lat - (-4.26250)) < 0.0001
        assert abs(center_lon - (-79.22320)) < 0.0001

    def test_calculate_center_empty(self):
        """Valida centro con lista vacía."""
        center_lat, center_lon = calculate_center([])

        assert center_lat is None
        assert center_lon is None

    def test_calculate_center_single_point(self):
        """Calcula centro de un punto."""
        coordinates = [[-4.2625, -79.2231]]

        center_lat, center_lon = calculate_center(coordinates)

        assert center_lat == -4.2625
        assert center_lon == -79.2231


class TestAreaCalculation:
    """Pruebas de cálculo de área de polígonos."""

    def test_calculate_area_small_polygon(self):
        """Calcula área de polígono pequeño (3 hectáreas aprox)."""
        # Cuadrado de ~182m x 182m ≈ 3.3 ha
        coordinates = [
            [-4.2625, -79.2231],
            [-4.2608, -79.2231],
            [-4.2608, -79.2214],
            [-4.2625, -79.2214],
            [-4.2625, -79.2231]
        ]

        area = calculate_polygon_area(coordinates)

        # Debe ser positivo y cercano a 3 hectáreas
        assert area > 0
        assert area < 5  # Menos de 5 hectáreas

    def test_calculate_area_triangle(self):
        """Calcula área de triángulo."""
        coordinates = [
            [-4.2625, -79.2231],
            [-4.2620, -79.2231],
            [-4.2622, -79.2225],
            [-4.2625, -79.2231]
        ]

        area = calculate_polygon_area(coordinates)

        assert area > 0
        assert area < 1  # Menos de 1 hectárea

    def test_calculate_area_empty_polygon(self):
        """Valida área de polígono vacío."""
        area = calculate_polygon_area([])
        assert area == 0.0

    def test_calculate_area_insufficient_points(self):
        """Valida área con menos de 3 puntos."""
        area = calculate_polygon_area([[-4.2625, -79.2231], [-4.2620, -79.2231]])
        assert area == 0.0


# ===== PRUEBAS DE ENDPOINTS =====

class TestEndpointsPublic:
    """Pruebas de endpoints públicos (sin autenticación)."""

    def test_upload_geojson_publico(self):
        """Carga y procesa archivo GeoJSON público."""
        geojson_data = json.dumps({
            "type": "Feature",
            "properties": {"name": "Finca Prueba"},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [-79.2231, -4.2625],
                    [-79.2230, -4.2620],
                    [-79.2235, -4.2630],
                    [-79.2231, -4.2625]
                ]]
            }
        })

        files = {"archivo": ("test.geojson", geojson_data, "application/json")}

        response = client.post("/api/v1/geoespacial/publico/cargar-poligono", files=files)

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert data["archivo_tipo"] == "geojson"
        assert len(data["coordenadas"]) == 4
        assert "centro" in data
        assert "ubicacion" in data
        assert "validacion_eudr" in data
        assert "sugerencias" in data
        assert "area_hectareas" in data

        # Verificar sugerencias
        assert "nombre" in data["sugerencias"]
        assert "provincia" in data["sugerencias"]
        assert "canton" in data["sugerencias"]
        assert "area_total_ha" in data["sugerencias"]

        # Verificar área calculada
        assert data["area_hectareas"] > 0
        assert data["area_hectareas"] < 10  # Debe ser pequeña para este test

    def test_upload_kml_publico(self):
        """Carga y procesa archivo KML público."""
        kml_data = '''<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Test Finca</name>
    <Placemark>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              -79.2231,-4.2625,0
              -79.2230,-4.2620,0
              -79.2235,-4.2630,0
              -79.2231,-4.2625,0
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>'''

        files = {"archivo": ("test.kml", kml_data, "application/vnd.google-earth.kml+xml")}

        response = client.post("/api/v1/geoespacial/publico/cargar-poligono", files=files)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["archivo_tipo"] == "kml"

    def test_upload_gpx_publico(self):
        """Carga y procesa archivo GPX público."""
        gpx_data = '''<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>Finca Prueba</name>
    <trkseg>
      <trkpt lat="-4.2625" lon="-79.2231"><ele>2100</ele></trkpt>
      <trkpt lat="-4.2620" lon="-79.2230"><ele>2105</ele></trkpt>
    </trkseg>
  </trk>
</gpx>'''

        files = {"archivo": ("test.gpx", gpx_data, "application/gpx+xml")}

        response = client.post("/api/v1/geoespacial/publico/cargar-poligono", files=files)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["archivo_tipo"] == "gpx"

    def test_upload_unsupported_format_publico(self):
        """Valida rechazo de formato no soportado."""
        files = {"archivo": ("test.txt", "contenido", "text/plain")}

        response = client.post("/api/v1/geoespacial/publico/cargar-poligono", files=files)

        assert response.status_code == 400
        assert "Formato de archivo no soportado" in response.json()["detail"]

    def test_upload_empty_coordinates_publico(self):
        """Valida rechazo de archivo sin coordenadas."""
        geojson_data = json.dumps({
            "type": "Feature",
            "properties": {"name": "Finca Vacía"},
            "geometry": {
                "type": "Polygon",
                "coordinates": []
            }
        })

        files = {"archivo": ("test.geojson", geojson_data, "application/json")}

        response = client.post("/api/v1/geoespacial/publico/cargar-poligono", files=files)

        assert response.status_code == 400
        assert "no contiene coordenadas válidas" in response.json()["detail"]


# ===== PRUEBAS DE ESTRUCTURA JSON =====

class TestJSONStructure:
    """Pruebas de estructura de respuesta JSON."""

    def test_response_structure_public(self):
        """Valida estructura completa de respuesta pública."""
        geojson_data = json.dumps({
            "type": "Feature",
            "properties": {"name": "El Ahuacate", "area": "3.0 ha"},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [-79.2231, -4.2625],
                    [-79.2230, -4.2620],
                    [-79.2235, -4.2630],
                    [-79.2231, -4.2625]
                ]]
            }
        })

        files = {"archivo": ("test.geojson", geojson_data, "application/json")}
        response = client.post("/api/v1/geoespacial/publico/cargar-poligono", files=files)
        data = response.json()

        # Estructura raíz
        assert "success" in data
        assert "archivo_tipo" in data
        assert "coordenadas" in data
        assert "centro" in data
        assert "ubicacion" in data
        assert "propiedades" in data
        assert "validacion_eudr" in data
        assert "sugerencias" in data

        # Centro debe tener lat/lon
        assert "latitud" in data["centro"]
        assert "longitud" in data["centro"]

        # Ubicación debe tener provincia/cantón
        assert "provincia" in data["ubicacion"]
        assert "canton" in data["ubicacion"]
        assert "parroquia" in data["ubicacion"]

        # EUDR debe tener resultado
        assert "deforestacion_detectada" in data["validacion_eudr"]
        assert "porcentaje" in data["validacion_eudr"]
        assert "estado_eudr" in data["validacion_eudr"]

        # Sugerencias deben ser útiles para auto-completar
        assert "nombre" in data["sugerencias"]
        assert "provincia" in data["sugerencias"]
        assert "canton" in data["sugerencias"]
        assert "parroquia" in data["sugerencias"]

    def test_eudr_validation_structure(self):
        """Valida estructura de validación EUDR."""
        geojson_data = json.dumps({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [-79.2231, -4.2625]
            }
        })

        files = {"archivo": ("test.geojson", geojson_data, "application/json")}
        response = client.post("/api/v1/geoespacial/publico/cargar-poligono", files=files)
        eudr = response.json()["validacion_eudr"]

        # Validar estructura EUDR
        assert isinstance(eudr["deforestacion_detectada"], bool)
        assert isinstance(eudr["porcentaje"], (int, float))
        assert isinstance(eudr["fecha_analisis"], str)
        assert isinstance(eudr["fuente"], str)
        assert eudr["estado_eudr"] in ["APROBADO", "ALERTA"]


# ===== PRUEBAS DE INTEGRACIÓN CON FRONTEND =====

class TestFrontendIntegration:
    """Pruebas de integración con frontend (formato esperado)."""

    def test_frontend_autocomplete_fields(self):
        """Valida que respuesta permite auto-completar campos del frontend."""
        geojson_data = json.dumps({
            "type": "Feature",
            "properties": {"name": "La Esperanza"},
            "geometry": {
                "type": "Point",
                "coordinates": [-79.2231, -4.2625]
            }
        })

        files = {"archivo": ("test.geojson", geojson_data, "application/json")}
        response = client.post("/api/v1/geoespacial/publico/cargar-poligono", files=files)
        data = response.json()

        # Frontend esperaría estos valores en sugerencias
        assert data["sugerencias"]["nombre"] == "La Esperanza"
        assert len(data["sugerencias"]["provincia"]) > 0
        assert len(data["sugerencias"]["canton"]) > 0

        # Frontend podría hacer esto:
        # document.getElementById('f-nombre').value = data["sugerencias"]["nombre"]
        # document.getElementById('f-provincia').value = data["sugerencias"]["provincia"]

    def test_frontend_map_rendering(self):
        """Valida que coordenadas son válidas para renderizar en Leaflet."""
        geojson_data = json.dumps({
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [-79.2231, -4.2625],
                    [-79.2230, -4.2620],
                    [-79.2235, -4.2630],
                    [-79.2231, -4.2625]
                ]]
            }
        })

        files = {"archivo": ("test.geojson", geojson_data, "application/json")}
        response = client.post("/api/v1/geoespacial/publico/cargar-poligono", files=files)
        coords = response.json()["coordenadas"]

        # Leaflet requiere [lat, lon] en ese orden
        for coord in coords:
            assert len(coord) == 2
            lat, lon = coord
            assert -90 <= lat <= 90, "Latitud debe estar entre -90 y 90"
            assert -180 <= lon <= 180, "Longitud debe estar entre -180 y 180"

    def test_frontend_eudr_status_display(self):
        """Valida que status EUDR es legible para frontend."""
        geojson_data = json.dumps({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [-79.2231, -4.2625]}
        })

        files = {"archivo": ("test.geojson", geojson_data, "application/json")}
        response = client.post("/api/v1/geoespacial/publico/cargar-poligono", files=files)
        eudr = response.json()["validacion_eudr"]

        # Frontend espera esto en gee-status-pill
        if not eudr["deforestacion_detectada"]:
            expected_status = "APROBADO"
        else:
            expected_status = "ALERTA"

        assert eudr["estado_eudr"] == expected_status


# ===== PRUEBAS DE EXTRACCIÓN COMPLETA DE DATOS =====

class TestDataExtraction:
    """Pruebas de extracción automática de datos: polígono, ubicación, cantón, área."""

    def test_extract_poligono_ubicacion_canton_area(self):
        """Valida extracción completa: polígono + ubicación + cantón + área."""
        geojson_data = json.dumps({
            "type": "Feature",
            "properties": {"name": "El Ahuacate"},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [-79.2231, -4.2625],
                    [-79.2230, -4.2620],
                    [-79.2235, -4.2630],
                    [-79.2233, -4.2635],
                    [-79.2231, -4.2625]
                ]]
            }
        })

        files = {"archivo": ("finca.geojson", geojson_data, "application/json")}
        response = client.post("/api/v1/geoespacial/publico/cargar-poligono", files=files)
        data = response.json()

        # ✓ Polígono extraído
        assert len(data["coordenadas"]) == 5
        assert all(isinstance(c, list) and len(c) == 2 for c in data["coordenadas"])

        # ✓ Ubicación extraída (provincia, cantón, parroquia)
        assert "provincia" in data["ubicacion"]
        assert "canton" in data["ubicacion"]
        assert "parroquia" in data["ubicacion"]
        assert data["ubicacion"]["provincia"] == "Loja"
        assert data["ubicacion"]["canton"] == "Loja"

        # ✓ Área calculada automáticamente
        assert "area_hectareas" in data
        assert data["area_hectareas"] > 0
        assert data["area_hectareas"] < 5

        # ✓ Sugerencias incluyen todos los datos para auto-completar
        sugerencias = data["sugerencias"]
        assert sugerencias["nombre"] == "El Ahuacate"
        assert sugerencias["provincia"] == "Loja"
        assert sugerencias["canton"] == "Loja"
        assert sugerencias["area_total_ha"] == data["area_hectareas"]

    def test_extract_from_kml_polygon(self):
        """Valida extracción desde archivo KML."""
        kml_data = '''<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Mi Finca KML</name>
    <Placemark>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              -79.2231,-4.2625,0
              -79.2230,-4.2620,0
              -79.2235,-4.2630,0
              -79.2231,-4.2625,0
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>'''

        files = {"archivo": ("finca.kml", kml_data, "application/vnd.google-earth.kml+xml")}
        response = client.post("/api/v1/geoespacial/publico/cargar-poligono", files=files)
        data = response.json()

        # Verificar que todos los datos se extrajeron
        assert data["success"] is True
        assert len(data["coordenadas"]) > 0
        assert data["area_hectareas"] > 0
        assert data["ubicacion"]["canton"] == "Loja"

    def test_extract_from_gpx_track(self):
        """Valida extracción desde archivo GPX."""
        gpx_data = '''<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>Ruta Finca El Ahuacate</name>
    <trkseg>
      <trkpt lat="-4.2625" lon="-79.2231"><ele>2100</ele></trkpt>
      <trkpt lat="-4.2620" lon="-79.2231"><ele>2105</ele></trkpt>
      <trkpt lat="-4.2620" lon="-79.2235"><ele>2095</ele></trkpt>
      <trkpt lat="-4.2625" lon="-79.2235"><ele>2100</ele></trkpt>
    </trkseg>
  </trk>
</gpx>'''

        files = {"archivo": ("ruta_finca.gpx", gpx_data, "application/gpx+xml")}
        response = client.post("/api/v1/geoespacial/publico/cargar-poligono", files=files)
        data = response.json()

        # Verificar extracción
        assert data["success"] is True
        assert data["area_hectareas"] > 0
        assert "provincia" in data["ubicacion"]
        assert "canton" in data["ubicacion"]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
