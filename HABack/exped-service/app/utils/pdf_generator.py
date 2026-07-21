from io import BytesIO

try:
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4
except ModuleNotFoundError:  # pragma: no cover - optional dependency in some environments
    canvas = None
    A4 = None


def generar_certificado_pdf(datos: dict) -> BytesIO:
    if canvas is None or A4 is None:
        buffer = BytesIO()
        buffer.write(b"PDF generation requires reportlab")
        buffer.seek(0)
        return buffer

    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    
    # Encabezado
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, 800, "CERTIFICADO DE TRAZABILIDAD Y CUMPLIMIENTO EUDR")
    c.setFont("Helvetica", 10)
    c.drawString(50, 780, f"ID Certificado: {datos['identificador_trazabilidad']}")
    
    # Cuerpo con datos
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, 750, "DATOS DE ORIGEN:")
    c.setFont("Helvetica", 10)
    c.drawString(50, 735, f"Finca: {datos['origen']['finca_nombre']}")
    c.drawString(50, 720, f"ID Productor: {datos['origen']['productor_id']}")
    
    # Cumplimiento EUDR
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, 690, "CUMPLIMIENTO NORMATIVO:")
    c.setFont("Helvetica", 10)
    status = "APROBADO (CERO DEFORESTACIÓN)" if datos['cumplimiento_eudr']['aprobado_cero_deforestacion'] else "RECHAZADO"
    c.drawString(50, 675, f"Estado EUDR: {status}")
    
    # Pie de página
    c.drawString(50, 50, "Documento generado automáticamente por Huella de Altura - Sistema de Trazabilidad")
    
    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer