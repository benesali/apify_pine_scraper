import { PlaywrightCrawler } from 'crawlee';
import fs from 'fs-extra';
import path from 'path';
import slugify from 'slugify';
import sharp from 'sharp';

const OUTPUT_DIR = './output';

const crawler = new PlaywrightCrawler({
    maxRequestsPerCrawl: 100,
    async requestHandler({ page, request, enqueueLinks }) {
        const url = request.url;
        const slug = slugify(new URL(url).pathname.replace(/\//g, ' '), {
            lower: true,
            strict: true
        });

        const pageDir = path.join(OUTPUT_DIR, slug || 'home');
        const imagesDir = path.join(pageDir, 'images');

        await fs.ensureDir(imagesDir);

        const title = await page.title();
        const h1 = await page.$eval('h1', el => el.innerText).catch(() => null);
        const description = await page.$eval(
            'meta[name="description"]',
            el => el.content
        ).catch(() => null);

        const bodyText = await page.evaluate(() => document.body.innerText);

        // Heuristika apartmánu
        const apartmentSignals = ['apartment', 'apartman', 'bedroom', 'guests', 'terrace', 'm²'];
        const isApartment = apartmentSignals.some(s =>
            bodyText.toLowerCase().includes(s)
        );

        // --- ULOŽ META ---
        await fs.writeJson(
            path.join(pageDir, 'meta.json'),
            { url, title, h1, description, isApartment },
            { spaces: 2 }
        );

        // --- ULOŽ TEXT ---
        await fs.writeFile(
            path.join(pageDir, 'text.md'),
            bodyText
        );

        // --- STÁHNI A OPTIMALIZUJ OBRÁZKY ---
        const images = await page.$$eval('img', imgs =>
            imgs.map(img => img.src).filter(src => src.startsWith('http'))
        );

        let index = 1;
        for (const imgUrl of images) {
            try {
                const res = await fetch(imgUrl);
                const buffer = Buffer.from(await res.arrayBuffer());

                const fileName = `image-${index}.webp`;
                await sharp(buffer)
                    .resize(2000)
                    .webp({ quality: 80 })
                    .toFile(path.join(imagesDir, fileName));

                index++;
            } catch {
                // ignoruj rozbité obrázky
            }
        }

        await enqueueLinks({
            sameDomain: true
        });
    }
});

await crawler.run([
    'https://www.pinetreedalmatia.cz/pine-tree-apartments-srima-1',
    'https://www.pinetreedalmatia.cz/vodice-apartmany-brunac'
]);
