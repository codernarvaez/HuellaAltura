from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"


class TemplateService:
    """Renderiza plantillas HTML con Jinja2 (autoescape HTML)."""

    def __init__(self, templates_dir: Path | None = None) -> None:
        root = templates_dir or TEMPLATES_DIR
        self._env = Environment(
            loader=FileSystemLoader(str(root)),
            autoescape=select_autoescape(["html", "xml"]),
            enable_async=True,
        )

    async def render(self, template_name: str, context: dict) -> str:
        template = self._env.get_template(template_name)
        return await template.render_async(**context)
