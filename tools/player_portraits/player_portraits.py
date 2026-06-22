#!/usr/bin/env python3
"""Normaliza retratos de jugadores y elimina su fondo en procesamiento por lotes."""

from __future__ import annotations

import argparse
import json
import logging
import math
import shutil
import sys
from dataclasses import dataclass, fields
from pathlib import Path
from typing import Iterable

import cv2
import numpy as np
from PIL import Image, ImageOps


SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"}


@dataclass(frozen=True)
class Config:
    output_size: int = 512
    face_scale: float = 0.42
    target_eye_height: float = 0.36
    top_margin: float = 0.22
    bottom_margin: float = 0.72
    min_face_pixels: int = 45
    max_roll_degrees: float = 25.0
    rembg_model: str = "u2net_human_seg"
    alpha_threshold: int = 5
    alpha_feather_radius: float = 0.7

    @classmethod
    def from_json(cls, path: Path) -> "Config":
        raw = json.loads(path.read_text(encoding="utf-8"))
        allowed = {field.name for field in fields(cls)}
        unknown = set(raw) - allowed
        if unknown:
            raise ValueError(f"Parámetros desconocidos: {', '.join(sorted(unknown))}")
        config = cls(**raw)
        config.validate()
        return config

    def validate(self) -> None:
        if self.output_size < 64:
            raise ValueError("output_size debe ser >= 64")
        if not 0.15 <= self.face_scale <= 0.8:
            raise ValueError("face_scale debe estar entre 0.15 y 0.8")
        if not 0.15 <= self.target_eye_height <= 0.65:
            raise ValueError("target_eye_height debe estar entre 0.15 y 0.65")
        if self.top_margin < 0 or self.bottom_margin < 0:
            raise ValueError("Los márgenes no pueden ser negativos")


@dataclass(frozen=True)
class Face:
    box: tuple[float, float, float, float]
    left_eye: tuple[float, float]
    right_eye: tuple[float, float]
    confidence: float

    @property
    def width(self) -> float:
        return self.box[2] - self.box[0]

    @property
    def height(self) -> float:
        return self.box[3] - self.box[1]


class FaceDetector:
    """MediaPipe como detector principal; OpenCV como alternativa local."""

    def __init__(self) -> None:
        self._mp_detector = None
        try:
            import mediapipe as mp

            self._mp_detector = mp.solutions.face_detection.FaceDetection(
                model_selection=1, min_detection_confidence=0.55
            )
        except (ImportError, AttributeError):
            logging.warning("MediaPipe no disponible; se usará el detector de OpenCV.")

        cascade_dir = Path(cv2.data.haarcascades)
        self._face_cascade = cv2.CascadeClassifier(str(cascade_dir / "haarcascade_frontalface_default.xml"))
        self._eye_cascade = cv2.CascadeClassifier(str(cascade_dir / "haarcascade_eye_tree_eyeglasses.xml"))

    def detect(self, rgb: np.ndarray) -> Face:
        faces = self._detect_mediapipe(rgb) if self._mp_detector else []
        if not faces:
            faces = self._detect_opencv(rgb)
        if not faces:
            raise RuntimeError("No se encontró ninguna cara")
        # Una foto de cuerpo entero puede contener público: elegimos la cara grande
        # y próxima al centro, no simplemente la primera detección.
        h, w = rgb.shape[:2]

        def score(face: Face) -> float:
            cx = (face.box[0] + face.box[2]) / 2 / w
            cy = (face.box[1] + face.box[3]) / 2 / h
            centrality = 1.0 - min(1.0, math.hypot(cx - 0.5, cy - 0.42))
            return face.width * face.height * (0.75 + 0.25 * centrality) * face.confidence

        return max(faces, key=score)

    def _detect_mediapipe(self, rgb: np.ndarray) -> list[Face]:
        result = self._mp_detector.process(rgb)
        if not result.detections:
            return []
        h, w = rgb.shape[:2]
        found: list[Face] = []
        for detection in result.detections:
            box = detection.location_data.relative_bounding_box
            keypoints = detection.location_data.relative_keypoints
            if len(keypoints) < 2:
                continue
            # MediaPipe: ojo derecho de la persona, ojo izquierdo de la persona.
            eye_a = (keypoints[0].x * w, keypoints[0].y * h)
            eye_b = (keypoints[1].x * w, keypoints[1].y * h)
            left_eye, right_eye = sorted((eye_a, eye_b), key=lambda point: point[0])
            found.append(
                Face(
                    box=(box.xmin * w, box.ymin * h, (box.xmin + box.width) * w, (box.ymin + box.height) * h),
                    left_eye=left_eye,
                    right_eye=right_eye,
                    confidence=float(detection.score[0]),
                )
            )
        return found

    def _detect_opencv(self, rgb: np.ndarray) -> list[Face]:
        gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
        boxes = self._face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(40, 40))
        found: list[Face] = []
        for x, y, w, h in boxes:
            upper = gray[y : y + int(h * 0.62), x : x + w]
            eyes = self._eye_cascade.detectMultiScale(upper, 1.08, 5, minSize=(10, 10))
            candidates = sorted(
                ((x + ex + ew / 2, y + ey + eh / 2, ew * eh) for ex, ey, ew, eh in eyes),
                key=lambda item: item[2],
                reverse=True,
            )[:4]
            if len(candidates) < 2:
                continue
            pair = max(
                ((a, b) for i, a in enumerate(candidates) for b in candidates[i + 1 :]),
                key=lambda p: abs(p[0][0] - p[1][0]) - 2 * abs(p[0][1] - p[1][1]),
            )
            left, right = sorted(((pair[0][0], pair[0][1]), (pair[1][0], pair[1][1])))
            found.append(Face((x, y, x + w, y + h), left, right, 0.65))
        return found

    def close(self) -> None:
        if self._mp_detector:
            self._mp_detector.close()


def rotate_level(image: Image.Image, face: Face, max_degrees: float) -> tuple[Image.Image, Face]:
    lx, ly = face.left_eye
    rx, ry = face.right_eye
    angle = math.degrees(math.atan2(ry - ly, rx - lx))
    if abs(angle) > max_degrees:
        raise RuntimeError(f"Inclinación facial excesiva ({angle:.1f}°)")
    if abs(angle) < 0.35:
        return image, face

    center = ((lx + rx) / 2, (ly + ry) / 2)
    rotated = image.rotate(angle, resample=Image.Resampling.BICUBIC, center=center, expand=False)
    rad = math.radians(-angle)

    def turn(point: tuple[float, float]) -> tuple[float, float]:
        x, y = point[0] - center[0], point[1] - center[1]
        return (x * math.cos(rad) - y * math.sin(rad) + center[0], x * math.sin(rad) + y * math.cos(rad) + center[1])

    corners = [turn((face.box[xi], face.box[yi])) for xi, yi in ((0, 1), (2, 1), (2, 3), (0, 3))]
    xs, ys = zip(*corners)
    return rotated, Face((min(xs), min(ys), max(xs), max(ys)), turn(face.left_eye), turn(face.right_eye), face.confidence)


def normalized_crop(image: Image.Image, face: Face, config: Config) -> Image.Image:
    if face.width < config.min_face_pixels:
        raise RuntimeError(f"Cara demasiado pequeña ({face.width:.0f}px)")

    size = config.output_size
    eye_x = (face.left_eye[0] + face.right_eye[0]) / 2
    eye_y = (face.left_eye[1] + face.right_eye[1]) / 2
    # face_scale expresa la fracción del ancho final ocupada por la cara.
    source_per_output = face.width / (config.face_scale * size)
    crop_side = size * source_per_output

    left = eye_x - crop_side / 2
    top = eye_y - config.target_eye_height * crop_side

    # Los márgenes actúan como requisitos mínimos alrededor de la cara. Si hace
    # falta, se reduce ligeramente el zoom conservando el centro y la proporción.
    required_top = face.box[1] - config.top_margin * face.height
    required_bottom = face.box[3] + config.bottom_margin * face.height
    need_above = eye_y - required_top
    need_below = required_bottom - eye_y
    crop_side = max(crop_side, need_above / config.target_eye_height, need_below / (1 - config.target_eye_height))
    left = eye_x - crop_side / 2
    top = eye_y - config.target_eye_height * crop_side

    # Pillow añade negro fuera de imagen; reflejamos los bordes para que rembg no
    # confunda esas bandas con la silueta. El exterior terminará transparente.
    pad_l = max(0, math.ceil(-left))
    pad_t = max(0, math.ceil(-top))
    pad_r = max(0, math.ceil(left + crop_side - image.width))
    pad_b = max(0, math.ceil(top + crop_side - image.height))
    if any((pad_l, pad_t, pad_r, pad_b)):
        arr = cv2.copyMakeBorder(
            np.asarray(image), pad_t, pad_b, pad_l, pad_r, cv2.BORDER_REFLECT_101
        )
        image = Image.fromarray(arr)
        left += pad_l
        top += pad_t

    box = (round(left), round(top), round(left + crop_side), round(top + crop_side))
    return image.crop(box).resize((size, size), Image.Resampling.LANCZOS)


def remove_background(image: Image.Image, config: Config, session: object) -> Image.Image:
    from rembg import remove

    result = remove(image.convert("RGB"), session=session, alpha_matting=False)
    rgba = result.convert("RGBA")
    data = np.asarray(rgba).copy()
    alpha = data[:, :, 3]
    alpha[alpha < config.alpha_threshold] = 0
    if config.alpha_feather_radius > 0:
        alpha = cv2.GaussianBlur(alpha, (0, 0), config.alpha_feather_radius)
    data[:, :, 3] = alpha
    return Image.fromarray(data, "RGBA")


def unique_destination(folder: Path, source: Path, suffix: str) -> Path:
    candidate = folder / f"{source.stem}{suffix}"
    counter = 2
    while candidate.exists():
        candidate = folder / f"{source.stem}_{counter}{suffix}"
        counter += 1
    return candidate


def image_files(folder: Path, recursive: bool) -> Iterable[Path]:
    iterator = folder.rglob("*") if recursive else folder.iterdir()
    return sorted(path for path in iterator if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS)


def process_one(source: Path, output_dir: Path, detector: FaceDetector, session: object, config: Config) -> Path:
    with Image.open(source) as opened:
        image = ImageOps.exif_transpose(opened).convert("RGB")
    rgb = np.asarray(image)
    face = detector.detect(rgb)
    image, face = rotate_level(image, face, config.max_roll_degrees)
    portrait = normalized_crop(image, face, config)
    portrait = remove_background(portrait, config, session)
    destination = unique_destination(output_dir, source, ".png")
    portrait.save(destination, "PNG", optimize=True)
    return destination


def parse_args() -> argparse.Namespace:
    base = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=base / "input", help="Carpeta de fotos originales")
    parser.add_argument("--output", type=Path, default=base / "output", help="Carpeta de PNG finales")
    parser.add_argument("--failed", type=Path, default=base / "failed", help="Carpeta de imágenes fallidas")
    parser.add_argument("--config", type=Path, default=base / "config.json", help="Archivo de configuración JSON")
    parser.add_argument("--recursive", action="store_true", help="Buscar también en subcarpetas")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    config = Config.from_json(args.config)
    for folder in (args.input, args.output, args.failed):
        folder.mkdir(parents=True, exist_ok=True)
    log_path = args.failed / "processing.log"
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s",
        handlers=[logging.FileHandler(log_path, encoding="utf-8"), logging.StreamHandler(sys.stdout)],
    )

    sources = list(image_files(args.input, args.recursive))
    if not sources:
        logging.warning("No hay imágenes compatibles en %s", args.input)
        return 0

    try:
        from rembg import new_session
        session = new_session(config.rembg_model)
    except Exception as exc:
        logging.error("No se pudo iniciar rembg: %s", exc)
        return 2

    detector = FaceDetector()
    successes = 0
    try:
        for index, source in enumerate(sources, 1):
            try:
                destination = process_one(source, args.output, detector, session, config)
                successes += 1
                logging.info("[%d/%d] OK %s -> %s", index, len(sources), source.name, destination.name)
            except Exception as exc:
                failed_path = unique_destination(args.failed, source, source.suffix.lower())
                try:
                    shutil.copy2(source, failed_path)
                except OSError as copy_error:
                    logging.error("No se pudo copiar el archivo fallido %s: %s", source, copy_error)
                logging.exception("[%d/%d] ERROR %s: %s", index, len(sources), source.name, exc)
    finally:
        detector.close()

    logging.info("Terminado: %d correctas, %d fallidas", successes, len(sources) - successes)
    return 0 if successes == len(sources) else 1


if __name__ == "__main__":
    raise SystemExit(main())
