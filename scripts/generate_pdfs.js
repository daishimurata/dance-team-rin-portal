import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('./public/pdf');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

(async () => {
  try {
    console.log("PDF Generation from Local HTML templates starting...");
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // 1. pdf_template_a4.html -> domatsuri2026_rin_schedule_a4.pdf (A4 1枚収まり)
    const pageA4 = await browser.newPage();
    const a4HtmlPath = 'file://' + path.resolve('./pdf_template_a4.html');
    await pageA4.goto(a4HtmlPath, { waitUntil: 'networkidle0' });
    await pageA4.evaluate(() => document.fonts.ready);
    
    const a4PdfPath = path.join(outDir, 'domatsuri2026_rin_schedule_a4.pdf');
    await pageA4.pdf({
      path: a4PdfPath,
      format: 'A4',
      preferCSSPageSize: true,
      printBackground: true,
      margin: { top: '4mm', bottom: '4mm', left: '6mm', right: '6mm' }
    });
    fs.copyFileSync(a4PdfPath, path.join(outDir, 'A4印刷用 演舞スケジュール.pdf'));
    fs.copyFileSync(a4PdfPath, path.join(outDir, 'どまつり2026_ダンスチーム凛_スケジュール_A4.pdf'));
    console.log(`Generated A4 PDF from local HTML with multiple aliases in ${outDir}`);
    await pageA4.close();

    // 2. pdf_template_mobile.html -> domatsuri2026_rin_schedule_mobile.pdf (スマホ長尺一枚物)
    const pageMobile = await browser.newPage();
    await pageMobile.setViewport({ width: 390, height: 800, deviceScaleFactor: 2 });
    const mobileHtmlPath = 'file://' + path.resolve('./pdf_template_mobile.html');
    await pageMobile.goto(mobileHtmlPath, { waitUntil: 'networkidle0' });
    await pageMobile.evaluate(() => document.fonts.ready);

    const bodyHeight = await pageMobile.evaluate(() => document.body.scrollHeight);
    const mobilePdfPath = path.join(outDir, 'domatsuri2026_rin_schedule_mobile.pdf');

    await pageMobile.pdf({
      path: mobilePdfPath,
      width: '390px',
      height: `${bodyHeight + 20}px`,
      printBackground: true,
      margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' }
    });
    fs.copyFileSync(mobilePdfPath, path.join(outDir, 'スマホ保存用 演舞スケジュール.pdf'));
    fs.copyFileSync(mobilePdfPath, path.join(outDir, 'どまつり2026_ダンスチーム凛_スケジュール_スマホ用.pdf'));
    fs.copyFileSync(mobilePdfPath, path.join(outDir, 'どまつり2026_ダンスチーム凛_スケジュール_スマダ用.pdf'));

    // iPhoneの「写真」アプリ保存用 高画質縦長PNG画像出力
    const imgDir = path.resolve('./public/images');
    if (!fs.existsSync(imgDir)) {
      fs.mkdirSync(imgDir, { recursive: true });
    }
    const mobileImgPath = path.join(imgDir, 'domatsuri2026_rin_schedule_mobile.png');
    const mobileJaImgPath = path.join(imgDir, 'スマホ保存用_演舞スケジュール.png');

    await pageMobile.screenshot({
      path: mobileImgPath,
      fullPage: true,
      omitBackground: false
    });
    fs.copyFileSync(mobileImgPath, mobileJaImgPath);

    console.log(`Generated Mobile PDF & High-Res PNG Image for iPhone Photos: ${mobileImgPath}`);
    await pageMobile.close();

    await browser.close();
    console.log("SUCCESS: Both PDFs successfully generated from local HTML templates!");
  } catch (err) {
    console.warn("PDF generation warning (Using existing pre-generated files):", err.message);
  }
})();
