#!/usr/bin/env python3
import argparse
import json
from pathlib import Path
from PIL import Image


def convert_images(
    input_dir: Path,
    output_dir: Path,
    sizes: list[int],
    quality: int,
    overwrite: bool,
):
    jpg_files = sorted(
        list(input_dir.rglob("*.jpg")) + list(input_dir.rglob("*.jpeg"))
    )

    if not jpg_files:
        print("No JPG files found.")
        return

    manifest = {
        "main": None,
        "gallery": [],
    }

    for index, jpg_path in enumerate(jpg_files):
        rel_path = jpg_path.relative_to(input_dir)
        out_dir = output_dir / rel_path.parent
        out_dir.mkdir(parents=True, exist_ok=True)

        base_name = jpg_path.stem
        logical_name = f"{base_name}.webp"

        if index == 0:
            manifest["main"] = logical_name
        else:
            manifest["gallery"].append(logical_name)

        for size in sizes:
            webp_name = f"{base_name}-{size}.webp"
            webp_path = out_dir / webp_name

            if webp_path.exists() and not overwrite:
                continue

            try:
                with Image.open(jpg_path) as img:
                    img = img.convert("RGB")
                    img.thumbnail((size, size), Image.LANCZOS)

                    img.save(
                        webp_path,
                        format="WEBP",
                        quality=quality,
                        method=6,
                        optimize=True,
                    )

            except Exception as e:
                print(f"Error {jpg_path}: {e}")

    # write manifest
    manifest_path = output_dir / "manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"Manifest generated: {manifest_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Generate responsive WebP images and manifest.json"
    )

    parser.add_argument(
        "input_dir",
        type=Path,
        help="Source directory with JPG images",
    )

    parser.add_argument(
        "--output-dir",
        type=Path,
        required=True,
        help="Target directory for WebP images",
    )

    parser.add_argument(
        "--sizes",
        type=str,
        default="640,1280",
        help="Comma-separated image sizes (e.g. 640,1280)",
    )

    parser.add_argument(
        "--quality",
        type=int,
        default=82,
        help="WebP quality (0–100)",
    )

    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite existing WebP files",
    )

    args = parser.parse_args()

    sizes = [int(s.strip()) for s in args.sizes.split(",") if s.strip().isdigit()]

    if not sizes:
        raise ValueError("At least one valid size must be provided.")

    convert_images(
        input_dir=args.input_dir,
        output_dir=args.output_dir,
        sizes=sizes,
        quality=args.quality,
        overwrite=args.overwrite,
    )
