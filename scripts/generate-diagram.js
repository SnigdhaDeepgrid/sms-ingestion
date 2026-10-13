const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function render() {
  const svgPath = path.resolve(__dirname, '..', 'assets', 'er_diagram.svg');
  const outPng = path.resolve(__dirname, '..', 'assets', 'er_diagram.png');

  if (!fs.existsSync(svgPath)) {
    console.error('SVG not found:', svgPath);
    process.exit(1);
  }

  const svg = fs.readFileSync(svgPath, 'utf8');

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(`<!doctype html><html><body style="margin:0">${svg}</body></html>`);
  const el = await page.$('svg');
  const clip = await el.boundingBox();
  await page.setViewport({ width: Math.ceil(clip.width), height: Math.ceil(clip.height) });
  await el.screenshot({ path: outPng });
  await browser.close();
  console.log('Wrote PNG to', outPng);
}

render().catch(err => {
  console.error(err);
  process.exit(1);
});
