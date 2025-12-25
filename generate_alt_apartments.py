from pathlib import Path
import argparse
import json

ROOT_DIR = Path("./output")

def generate_alt(data: dict) -> dict:
    # 🔑 apartment = autorita
    apartment = data.get("apartment") or data.get("gallery_name")
    location = data.get("location")

    if not apartment or not location:
        return {}

    apartment_lc = apartment.lower()

    # výchozí hodnoty
    context = data.get("context") or "interior"

    # 🍴 GENERAL = EXTERIOR
    if apartment_lc == "general":
        context = "exterior"

    alt = (
        f"Apartmán {apartment.capitalize()} – "
        f"{context} – Pine Tree Dalmatia, {location.capitalize()}"
    )

    alt_en = (
        f"Apartment {apartment.capitalize()} – "
        f"{context} – Pine Tree Dalmatia, {location.capitalize()}"
    )

    return {
        "apartment": apartment,
        "location": location,
        "context": context,
        "room": data.get("room"),
        "alt": alt,
        "alt_en": alt_en,
        "confidence": "auto-generated"
    }

def process_json(json_path: Path, dry_run: bool):
    data = json.loads(json_path.read_text(encoding="utf-8"))

    # už má ALT → nesahat
    if "alt" in data:
        return

    new_fields = generate_alt(data)
    if not new_fields:
        return

    if dry_run:
        print(f"[DRY-RUN] ALT for {json_path.name}: {new_fields['alt']}")
    else:
        data.update(new_fields)
        json_path.write_text(
            json.dumps(data, indent=2, ensure_ascii=False),
            encoding="utf-8"
        )
        print(f"🖼️ ALT generated: {json_path.name}")

def run(dry_run: bool):
    for json_path in ROOT_DIR.rglob("*.json"):
        process_json(json_path, dry_run)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Generate SEO/ML friendly ALT labels for images"
    )
    parser.add_argument("--dry-run", action="store_true")

    args = parser.parse_args()
    run(args.dry_run)
