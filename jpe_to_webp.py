#!/usr/bin/env python3
import argparse
from pathlib import Path
from PIL import Image


def convert_jpg_to_webp(
    input_dir: Path,
    quality: int = 82,
    max_size: int = 1920,
    overwrite: bool = False,
):
    jpg_files = list(input_dir.rglob("*.jpg")) + list(input_dir.rglob("*.jpeg"))

    if not jpg_files:
        print("No files to convert found.")
        return

    for jpg_path in jpg_files:
        # base name without suffix
        base_name = jpg_path.stem
        # new name with size suffix
        webp_name = f"{base_name}-{max_size}.webp"
        webp_path = jpg_path.with_name(webp_name)

        if webp_path.exists() and not overwrite:
            print(f"webp exists: {webp_path}")
            continue

        try:
            with Image.open(jpg_path) as img:
                img = img.convert("RGB")

                img.thumbnail((max_size, max_size), Image.LANCZOS)

                img.save(
                    webp_path,
                    format="WEBP",
                    quality=quality,
                    method=6,
                    optimize=True,
                )

                print(f"OK {jpg_path.name} -> {webp_path.name}")

        except Exception as e:
            print(f"Error {jpg_path}: {e}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Convert JPG images to WebP format with size suffix",
    )
    parser.add_argument(
        "directory",
        type=Path,
        help="Folder with JPG images",
    )
    parser.add_argument(
        "--quality",
        type=int,
        default=82,
        help="WebP quality (0–100)",
    )
    parser.add_argument(
        "--max-size",
        type=int,
        default=1920,
        help="Max size (px) – also added to filename",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite existing .webp files",
    )

    args = parser.parse_args()

    convert_jpg_to_webp(
        input_dir=args.directory,
        quality=args.quality,
        max_size=args.max_size,
        overwrite=args.overwrite,
    )
