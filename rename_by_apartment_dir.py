from pathlib import Path
import argparse
import json

ROOT_DIR = Path("./output")

def json_needs_fix(json_path: Path, correct_apartment: str) -> bool:
    try:
        data = json.loads(json_path.read_text(encoding="utf-8"))
    except Exception:
        return False

    def walk(obj):
        if isinstance(obj, dict):
            for k, v in obj.items():
                if isinstance(v, str) and k.lower() in ("apartment", "gallery_name"):
                    if v.lower() != correct_apartment.lower():
                        return True
                else:
                    if walk(v):
                        return True
        elif isinstance(obj, list):
            for i in obj:
                if walk(i):
                    return True
        return False

    return walk(data)

def apply_json_fix(json_path: Path, correct_apartment: str):
    data = json.loads(json_path.read_text(encoding="utf-8"))

    def walk(obj):
        if isinstance(obj, dict):
            for k, v in obj.items():
                if isinstance(v, str) and k.lower() in ("apartment", "gallery_name"):
                    obj[k] = correct_apartment
                else:
                    walk(v)
        elif isinstance(obj, list):
            for i in obj:
                walk(i)

    walk(data)

    json_path.write_text(
        json.dumps(data, indent=2, ensure_ascii=False),
        encoding="utf-8"
    )

def process_apartment_dir(apartment_dir: Path, dry_run: bool):
    correct_apartment = apartment_dir.name
    print(f"\n📂 Processing {apartment_dir}")

    for file in apartment_dir.iterdir():
        if not file.is_file():
            continue

        name = file.name

        if "-" not in name:
            continue

        location = name.split("-", 1)[0]
        correct_prefix = f"{location}-{correct_apartment}-"

        filename_is_correct = name.startswith(correct_prefix)

        # 1️⃣ SOUBOR JE OK → NIC NEDĚLEJ, ANI JSON
        if filename_is_correct:
            continue

        # 2️⃣ SOUBOR JE ŠPATNĚ → připrav rename
        rest = name.split("-", 1)[1]
        new_name = f"{location}-{correct_apartment}-{rest}"
        new_path = apartment_dir / new_name

        if new_path.exists():
            print(f"⚠️ exists, skip: {new_name}")
            continue

        if dry_run:
            print(f"[DRY-RUN] RENAME {file.name} → {new_name}")
            if file.suffix.lower() == ".json" and json_needs_fix(file, correct_apartment):
                print(f"[DRY-RUN] JSON UPDATE {file.name}")
        else:
            file.rename(new_path)
            print(f"🔁 {file.name} → {new_name}")

            if new_path.suffix.lower() == ".json" and json_needs_fix(new_path, correct_apartment):
                apply_json_fix(new_path, correct_apartment)
                print(f"🧾 JSON updated: {new_name}")

def run(dry_run: bool):
    for location_dir in ROOT_DIR.iterdir():
        if not location_dir.is_dir():
            continue

        for apartment_dir in location_dir.iterdir():
            if not apartment_dir.is_dir():
                continue

            process_apartment_dir(apartment_dir, dry_run)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Rename files and fix JSON metadata according to apartment folder name"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Only print changes, do not modify files or JSON"
    )

    args = parser.parse_args()
    run(dry_run=args.dry_run)
