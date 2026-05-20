"""
Extrae placas y tapacantos del JSON DIAC y genera CSVs editables.

Input:  C:/Users/emara/Desktop/productos-diac.json
Output: scripts/lista-placas.csv
        scripts/lista-tapacantos.csv

Cada CSV tiene columnas para que el usuario complete/ajuste y la app importe.
Parser tolerante: si no logra extraer un campo, lo deja vacio.
"""
import json
import csv
import re
import os
from pathlib import Path

INPUT = Path(r"C:/Users/emara/Desktop/productos-diac.json")
OUT_DIR = Path(__file__).parent

# ── Detectores ─────────────────────────────────────────────────────────────
# Orden importa: mas especifico primero.
TIPO_DETECTORS = [
    (re.compile(r"\bench(?:apad[oa]|\.)\b", re.IGNORECASE), "enchapado"),
    (re.compile(r"\bmel(?:amina|am)?\b",     re.IGNORECASE), "melamina"),
    (re.compile(r"\bmdf\b",                  re.IGNORECASE), "mdf"),
    (re.compile(r"\baglo(?:merado)?\b",      re.IGNORECASE), "aglomerado"),
    (re.compile(r"\bterc(?:iado)?\b",        re.IGNORECASE), "terciado"),
    (re.compile(r"\bmac(?:iza)?\b",          re.IGNORECASE), "madera_maciza"),
    (re.compile(r"\bmfc\b",                  re.IGNORECASE), "melamina"),
    (re.compile(r"\bgua(?:tambu)?\b",        re.IGNORECASE), "terciado"),
    (re.compile(r"\bfibrofacil\b",           re.IGNORECASE), "mdf"),
]

ESPESOR_RE = re.compile(r"(\d+(?:\.\d+)?)\s*mm", re.IGNORECASE)
DIMS_RE = re.compile(r"(\d\.\d{2})\s*[xX/]\s*(\d\.\d{2})\s*m", re.IGNORECASE)
DIMS_ALT_RE = re.compile(r"(\d{3,4})\s*[xX]\s*(\d{3,4})", re.IGNORECASE)

TAPACANTO_RE = re.compile(r"\b(tapa\s*canto|tapacanto|pvc\s*cubrec|cubrecanto|abs|melaminico\s*p/?canto)\b", re.IGNORECASE)

def detectar_tipo(desc):
    for rx, tipo in TIPO_DETECTORS:
        if rx.search(desc):
            return tipo
    return ""

def extraer_espesor(desc):
    m = ESPESOR_RE.search(desc)
    if m:
        return float(m.group(1))
    return ""

def extraer_dims(desc):
    """Devuelve (largo_mm, ancho_mm) o ('', '')."""
    m = DIMS_RE.search(desc)
    if m:
        return (int(float(m.group(1)) * 1000), int(float(m.group(2)) * 1000))
    m = DIMS_ALT_RE.search(desc)
    if m:
        a, b = int(m.group(1)), int(m.group(2))
        # Solo aceptar si parecen dimensiones de placa (>= 1000mm)
        if a >= 1000 and b >= 1000:
            return (a, b)
    return ("", "")

def limpiar_nombre(desc, tipo):
    """Quita los descriptores tecnicos para dejar solo el nombre/color."""
    s = desc
    s = ESPESOR_RE.sub("", s)
    s = DIMS_RE.sub("", s)
    s = DIMS_ALT_RE.sub("", s)
    # Quitar prefijos tipo "Ench Euca MDF", "Mel", etc.
    for rx, _ in TIPO_DETECTORS:
        s = rx.sub("", s)
    # Limpiar abrevs/palabras tecnicas
    s = re.sub(r"\b(euca|euda|rec\s*\w+|simil|ln|x\d{2,}|lc|lex?\d+|xa\d+)\b", "", s, flags=re.IGNORECASE)
    s = re.sub(r"\s+", " ", s).strip(" -·.,")
    return s

def es_placa(desc):
    """Heuristic: tiene tipo detectado AND espesor AND alguna dim."""
    if detectar_tipo(desc) == "":
        return False
    if extraer_espesor(desc) == "":
        return False
    dims = extraer_dims(desc)
    if dims == ("", ""):
        return False
    return True

def es_tapacanto(desc):
    return bool(TAPACANTO_RE.search(desc))

# ── Procesamiento ──────────────────────────────────────────────────────────
print(f"Leyendo {INPUT}...")
with open(INPUT, "r", encoding="utf-8") as f:
    productos = json.load(f)

print(f"Total productos: {len(productos)}")

placas = []
tapacantos = []
descartados = 0

for p in productos:
    desc = p.get("descripcion", "")
    codigo_diac = p.get("codigo_diac", "")
    precio = p.get("precio", "")

    if es_tapacanto(desc):
        tapacantos.append({
            "codigo":         "",  # codigo EGGER/interno - completar manual
            "nombre":         desc,  # sin parsear; el usuario decide
            "espesor":        extraer_espesor(desc) or "",
            "precio":         precio,
            "codigoDiac":     codigo_diac,
            "descripcionDiac": desc,
        })
        continue

    if es_placa(desc):
        tipo = detectar_tipo(desc)
        espesor = extraer_espesor(desc)
        largo, ancho = extraer_dims(desc)
        nombre = limpiar_nombre(desc, tipo)
        placas.append({
            "codigo":         "",   # codigo EGGER/interno - completar manual
            "nombre":         nombre,
            "tipo":           tipo,
            "espesor":        espesor,
            "placaLargo":     largo,
            "placaAncho":     ancho,
            "precioPlaca":    precio,
            "codigoDiac":     codigo_diac,
            "descripcionDiac": desc,
        })
        continue

    descartados += 1

print(f"\nResultados:")
print(f"  Placas extraidas:     {len(placas)}")
print(f"  Tapacantos extraidos: {len(tapacantos)}")
print(f"  Descartados (no son placas ni tapacantos): {descartados}")

# ── CSVs ───────────────────────────────────────────────────────────────────
PLACAS_CSV = OUT_DIR / "lista-placas.csv"
TAPACANTOS_CSV = OUT_DIR / "lista-tapacantos.csv"

placas_sorted = sorted(placas, key=lambda x: (x["tipo"], x["espesor"] or 0, x["nombre"]))
tapacantos_sorted = sorted(tapacantos, key=lambda x: x["nombre"])

with open(PLACAS_CSV, "w", encoding="utf-8", newline="") as f:
    w = csv.DictWriter(f, fieldnames=["codigo", "nombre", "tipo", "espesor", "placaLargo", "placaAncho", "precioPlaca", "codigoDiac", "descripcionDiac"])
    w.writeheader()
    w.writerows(placas_sorted)

with open(TAPACANTOS_CSV, "w", encoding="utf-8", newline="") as f:
    w = csv.DictWriter(f, fieldnames=["codigo", "nombre", "espesor", "precio", "codigoDiac", "descripcionDiac"])
    w.writeheader()
    w.writerows(tapacantos_sorted)

print(f"\nArchivos generados:")
print(f"  {PLACAS_CSV}")
print(f"  {TAPACANTOS_CSV}")
