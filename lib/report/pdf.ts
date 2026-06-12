import { chromium } from "playwright";

/** Render self-contained HTML to an A4 PDF buffer using headless Chromium. */
export async function renderPdf(html: string): Promise<Buffer> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" }
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
