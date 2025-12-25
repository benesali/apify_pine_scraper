import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('➡ Opening page');
  await page.goto('https://www.pinetreedalmatia.cz/apartmany-srima-1', {
    waitUntil: 'networkidle'
  });

  console.log('➡ Waiting');
  await page.waitForTimeout(3000);

  const data = await page.evaluate(() => {
    const out = [];

    document
      .querySelectorAll('.pro-gallery.thumbnails-gallery .thumbnailItem')
      .forEach((el, i) => {
        const bg = getComputedStyle(el).backgroundImage;
        out.push({ i, bg });
      });

    return out;
  });

  console.log('=== BACKGROUND IMAGES FOUND ===');
  console.dir(data, { depth: null });

  if (!data[0]?.bg) {
    console.log('❌ NO background-image found at all');
    await browser.close();
    return;
  }

  const match = data[0].bg.match(/url\(["']?(.*?)["']?\)/);
  if (!match) {
    console.log('❌ background-image URL parse failed');
    await browser.close();
    return;
  }

  const imgUrl = match[1];
  console.log('➡ Trying to download:', imgUrl);

  const res = await page.request.get(imgUrl);
  console.log('➡ HTTP status:', res.status());

  const buf = await res.body();
  console.log('➡ Bytes length:', buf.length);

  if (buf.length > 0) {
    console.log('✅ IMAGE DATA RECEIVED');
  } else {
    console.log('❌ ZERO BYTES RECEIVED');
  }

  await browser.close();
})();
