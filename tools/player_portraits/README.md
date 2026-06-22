# Retratos normalizados de jugadores

Convierte fotos completas en PNG transparentes de 512 × 512, con ojos nivelados,
encuadre uniforme y cabeza/cuello/parte superior del pecho visibles.

## Instalación

Se recomienda Python 3.11 o 3.12 y un entorno virtual:

```powershell
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

En la primera ejecución, `rembg` descargará el modelo de segmentación humana
(`u2net_human_seg`, aproximadamente 176 MB). Después queda en caché.

## Uso

1. Copia las fotos originales en `input`.
2. Ejecuta:

```powershell
python player_portraits.py
```

Los PNG aparecen en `output`. Las imágenes que no se puedan tratar se copian a
`failed`, junto con `processing.log`. El programa devuelve código 1 si hubo algún
fallo, algo útil para automatizaciones, pero continúa procesando todo el lote.

También se pueden indicar otras carpetas:

```powershell
python player_portraits.py --input D:\fotos --output D:\retratos --failed D:\fallidas --recursive
```

## Ajustes (`config.json`)

- `output_size`: lado del PNG final en píxeles.
- `face_scale`: ancho deseado de la cara respecto al lienzo. Un valor mayor acerca la cara.
- `target_eye_height`: altura de los ojos respecto al lienzo (0 arriba, 1 abajo).
- `top_margin`: espacio mínimo sobre la caja facial, medido en alturas de cara.
- `bottom_margin`: espacio mínimo bajo la caja facial; controla cuánto cuello/pecho aparece.
- `min_face_pixels`: rechaza caras fuente demasiado pequeñas para evitar resultados borrosos.
- `max_roll_degrees`: inclinación máxima que se corregirá automáticamente.
- `rembg_model`: `u2net_human_seg` está especializado en personas.
- `alpha_threshold` y `alpha_feather_radius`: limpieza y suavizado del borde transparente.

No se estira la imagen en ningún eje: el recorte siempre es cuadrado y se escala
proporcionalmente, por lo que la cara conserva sus proporciones.

## Consejos de entrada

- Funcionan mejor fotos nítidas, frontales o casi frontales, con ambos ojos visibles.
- Una cara menor de 45 píxeles se rechaza para no inventar detalle.
- Si hay varias personas, se elige la cara grande más cercana al centro de la foto.
