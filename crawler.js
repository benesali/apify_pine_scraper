import { PlaywrightCrawler } from 'crawlee';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';

/* =========================
   CONFIG
========================= */
const OUTPUT_DIR = './output';
await fs.ensureDir(OUTPUT_DIR);

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
  return url.replace(
    /\/v1\/fill\/.*?\//,
    '/v1/fill/w_3000,h_3000,q_95/'
  );
}

function hashBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
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
    const galleryName = GALLERY_ORDER[i] || `gallery-${i + 1}`;

    console.log(`📸 Gallery ${i + 1} → ${galleryName}`);

    const baseDir = path.join(
      OUTPUT_DIR,
      location,
      galleryName
    );
    await fs.ensureDir(baseDir);

    const seen = new Set();
    const collected = [];

    /* 🔥 NETWORK SNIFFER – JÁDRO FUNKČNOSTI */
    const onResponse = async response => {
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

    const gallery = page.locator(gallerySelector).nth(i);
    const clickable = gallery.locator('div').first();

    if (!(await clickable.count())) {
      console.log('   ↳ no clickable element, skip');
      page.off('response', onResponse);
      continue;
    }

    await clickable.scrollIntoViewIfNeeded();
    await clickable.click({ force: true });
    await page.waitForTimeout(1200);

    for (let step = 0; step < MAX_NAVIGATION_STEPS; step++) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(350);
    }

    await page.keyboard.press('Escape');
    await page.waitForTimeout(800);

    page.off('response', onResponse);

    console.log(`   ↳ sniffed ${collected.length} images`);

    /* ⬇️ DOWNLOAD + METADATA */
    let index = 1;
    for (const src of collected) {
      try {
        const hqUrl = toHighQualityWix(src);
        const res = await page.request.get(hqUrl);
        if (!res.ok()) continue;

        const buffer = Buffer.from(await res.body());
        if (buffer.length < 1500) continue;

        const contentType = res.headers()['content-type'] || 'unknown';
        let ext = 'bin';
        if (contentType.includes('jpeg')) ext = 'jpg';
        else if (contentType.includes('webp')) ext = 'webp';
        else if (contentType.includes('avif')) ext = 'avif';

        const hash = hashBuffer(buffer).slice(0, 12);

        const fileBase = `${location}-${galleryName}-${String(index).padStart(3, '0')}-${hash}`;
        const imgPath = path.join(baseDir, `${fileBase}.${ext}`);
        const metaPath = path.join(baseDir, `${fileBase}.json`);

        if (await fs.pathExists(imgPath)) {
          index++;
          continue;
        }

        await fs.writeFile(imgPath, buffer);

        const metadata = {
          source_page: url,
          location,
          gallery_index: i + 1,
          gallery_name: galleryName,
          original_url: src,
          high_quality_url: hqUrl,
          content_type: contentType,
          size_bytes: buffer.length,
          sha256: hashBuffer(buffer),
          downloaded_at: new Date().toISOString()
        };

        await fs.writeJson(metaPath, metadata, { spaces: 2 });

        console.log(`💾 ${imgPath}`);
        index++;
      } catch (err) {
        console.warn('❌ image failed', err?.message);
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
