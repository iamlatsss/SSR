import puppeteer from 'puppeteer';

let browserPromise = null;

export async function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--disable-extensions'
      ]
    }).catch(err => {
      browserPromise = null;
      throw err;
    });
  }
  
  try {
    const browser = await browserPromise;
    if (!browser || !browser.isConnected()) {
      browserPromise = null;
      return getBrowser();
    }
    return browser;
  } catch (err) {
    browserPromise = null;
    throw err;
  }
}

// Pre-warm browser process in background on load
getBrowser().catch(() => {});

export async function generatePdf({ htmlContent, evaluateFn, evaluateData, pdfOptions = {} }) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded', timeout: 5000 });
    if (evaluateFn) {
      await page.evaluate(evaluateFn, evaluateData);
    }
    const defaultMargin = { top: '5mm', bottom: '5mm', left: '5mm', right: '5mm' };
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: pdfOptions.margin || defaultMargin,
      ...pdfOptions
    });
    return pdfBuffer;
  } finally {
    await page.close().catch(() => {});
  }
}

