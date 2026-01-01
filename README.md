custom web crawler

- $ node crawler.js
    get metada.json and image itself
    verify manually and move
- after fix 
python rename_by_apartment_dir.py (--dry-run for debug)
python generate_alt_apartments.py (--dry-run for debug) 
    general is labaled as exterior
    for rooms, you have to rename manually


python jpg_to_webp.py ./images (optional) --quality 80 (optional) --max-size 1600
    converts jpg/jpeg to webpy - web friendly fromat 