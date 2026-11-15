"""Arma la guía final: un solo HTML con el logo y las capturas incluidos.

Uso:  python3 docs/instructivo/armar.py [dirección del sitio]
Ej.:  python3 docs/instructivo/armar.py https://aneloescenico.com
"""
import base64, pathlib, re, sys

aqui = pathlib.Path(__file__).parent
raiz = aqui.parent.parent
direccion = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "[dirección de tu sitio]"

def datos(ruta: pathlib.Path, tipo: str) -> str:
    return f"data:{tipo};base64," + base64.b64encode(ruta.read_bytes()).decode()

html = (aqui / "plantilla.html").read_text(encoding="utf-8")
html = html.replace("{{logo}}", datos(raiz / "public" / "logo.png", "image/png"))
html = html.replace("{{direccion}}", direccion)
html = re.sub(r"\{\{img ([\w-]+)\}\}", lambda m: datos(aqui / "capturas" / f"{m.group(1)}.jpg", "image/jpeg"), html)
if direccion.startswith("http"):
    html = html.replace(f'<span class="rellenar">{direccion}</span>/ingresar', f'<a href="{direccion}/ingresar">{direccion}/ingresar</a>')
falta = re.findall(r"\{\{[^}]+\}\}", html)
if falta:
    sys.exit(f"Quedaron marcas sin reemplazar: {falta}")
salida = aqui / "Guia-del-panel-A-Nelo-Escenico.html"
salida.write_text(html, encoding="utf-8")
print(f"{salida} · {salida.stat().st_size // 1024} KB")
