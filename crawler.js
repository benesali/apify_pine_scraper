import { PlaywrightCrawler } from 'crawlee';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';

/* =========================
   CONFIG
========================= */
const OUTPUT_DIR = './output';
await fs.ensureDir(OUTPUT_DIR);

/**
 * Order of galleries on:
 * https://www.pinetreedalmatia.cz/apartmany-srima-1
 */
const GALLERY_ORDER = [
  'general',
  'mayer',
  'tea',
  'dario',
  'pine-tree'
];

const MAX_NAVIGATION_STEPS = 60;

/* =========================
   HELPERS
========================= */
function detectLocation(url) {
  if (url.includes('srima')) return 'srima';
  if (url.includes('vodice')) return 'vodice';
  if (url.includes('kastel')) return 'kastela';
  if (url.includes('sibenik')) return 'sibenik';
  return 'other';
}

function toHighQualityWix(url) {
  // enforce large image size
  return url.replace(
    /\/v1\/fill\/.*?\//,
    '/v1/fill/w_3000,h_3000,q_95/'
  );
}

function hashUrl(url) {
  return crypto.createHash('sha1').update(url).digest('hex').slice(0, 10);
}

/* =========================
   EXTRACT
========================= */
async function extract(page, url) {
  const location = detectLocation(url);

  const gallerySelector = '.pro-gallery.thumbnails-gallery';
  const galleryCount = await page.locator(gallerySelector).count();

  console.log(`🧩 Found ${galleryCount} galleries`);

  for (let i = 0; i < galleryCount; i++) {
    const apartment = GALLERY_ORDER[i] || `gallery-${i + 1}`;

    const baseDir = path.join(
      OUTPUT_DIR,
      location,
      apartment,
      'original'
    );
    await fs.ensureDir(baseDir);

    console.log(`📸 Gallery ${i + 1} → ${apartment}`);

    const seen = new Set();
    const collected = [];

    /* 🔥 sniffer only for THIS gallery */
    const onResponse = response => {
      const u = response.url();
      if (
        u.includes('static.wixstatic.com/media') &&
        u.includes('~mv2') &&
        !seen.has(u)
      ) {
        seen.add(u);
        collected.push(u);
      }
    };

    page.on('response', onResponse);

    /* ⚠️ DO NOT reuse element handles */
    const gallery = page.locator(gallerySelector).nth(i);
    const firstThumb = gallery.locator('div.thumbnailItem').first();

    if (!(await firstThumb.count())) {
      console.log('   ↳ no thumbnails, skip');
      page.off('response', onResponse);
      continue;
    }

    await firstThumb.scrollIntoViewIfNeeded();
    await firstThumb.click({ force: true });
    await page.waitForTimeout(1500);

    /* ▶️ navigate gallery */
    for (let step = 0; step < MAX_NAVIGATION_STEPS; step++) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(350);
    }

    /* ❌ close viewer */
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1500);

    page.off('response', onResponse);

    if (collected.length === 0) {
      console.log('   ↳ sniffed 0 images (gallery reused / skipped)');
      continue;
    }

    console.log(`   ↳ sniffed ${collected.length} images`);

    /* ⬇️ DOWNLOAD */
    for (const src of collected) {
      try {
        const hqUrl = toHighQualityWix(src);
        const hash = hashUrl(hqUrl);

        const res = await page.request.get(hqUrl);
        if (!res.ok()) continue;

        const buffer = Buffer.from(await res.body());
        if (buffer.length < 1500) continue;

        const ct = res.headers()['content-type'] || '';
        let ext = 'bin';
        if (ct.includes('avif')) ext = 'avif';
        else if (ct.includes('webp')) ext = 'webp';
        else if (ct.includes('jpeg')) ext = 'jpg';

        const filePath = path.join(
          baseDir,
          `${location}-${apartment}-${hash}.${ext}`
        );

        if (await fs.pathExists(filePath)) continue;

        await fs.writeFile(filePath, buffer);
        console.log(`💾 ${filePath}`);
      } catch {
        console.warn('❌ image failed');
      }
    }
  }
}

/* =========================
   CRAWLER
========================= */
const crawler = new PlaywrightCrawler({
  maxConcurrency: 1,
  requestHandlerTimeoutSecs: 600,

  async requestHandler({ page, request }) {
    console.log(`➡ Crawling ${request.url}`);
    await page.waitForTimeout(3000);
    await extract(page, request.url);
  }
});

/* =========================
   START
========================= */
await crawler.run([
  'https://www.pinetreedalmatia.cz/apartmany-srima-1'
]);
