custom web crawler

- $ node crawler.js
    get metada.json and image itself
    verify manually and move
- after fix 
python rename_by_apartment_dir.py (--dry-run for debug)
python generate_alt_apartments.py (--dry-run for debug) 
    general is labaled as exterior
    for rooms, you have to rename manually


python jpe_to_webp.py initial_dir_jpeg \
  --output-dir public/images/ \
  --sizes 640,1280

    converts jpg/jpeg to webpy - web friendly fromat 
    generates multiple web friendly sizes
    geenrates manifest with naming