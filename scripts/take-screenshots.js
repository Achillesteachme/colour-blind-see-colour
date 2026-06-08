const puppeteer = require('puppeteer');
const path = require('path');

const SCREENS = [
  { file: '01-camera.html',      out: '01-camera.png' },
  { file: '02-photo-adjust.html', out: '02-photo-adjust.png' },
  { file: '03-gallery.html',     out: '03-gallery.png' },
  { file: '04-paywall.html',     out: '04-paywall.png' },
  { file: '05-types.html',       out: '05-types.png' },
];

const SCREENSHOTS_DIR = path.join(__dirname, '../app-store-screenshots');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const screen of SCREENS) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1320, height: 2868, deviceScaleFactor: 1 });

    const filePath = `file://${SCREENSHOTS_DIR}/${screen.file}`;
    console.log(`Opening ${screen.file}...`);
    await page.goto(filePath, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 800)); // let fonts/render settle

    const outPath = path.join(SCREENSHOTS_DIR, screen.out);
    await page.screenshot({ path: outPath, fullPage: false, type: 'png' });
    console.log(`✓ Saved ${screen.out}`);

    await page.close();
  }

  await browser.close();
  console.log('\nAll 5 screenshots saved to app-store-screenshots/');
})();
