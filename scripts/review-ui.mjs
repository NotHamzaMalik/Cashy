import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
// Visual review of the built public demo. This does not exercise Clerk authentication.
const root = process.cwd();
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.route('http://cashy-preview.test/**', async route => {
  const pathname = new URL(route.request().url()).pathname;
  const relative = pathname === '/' ? '.next/server/app/index.html' : pathname.startsWith('/_next/static/') ? '.next/static/' + pathname.slice('/_next/static/'.length) : 'public/' + pathname.slice(1);
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep)) return route.abort();
  const types = { '.html':'text/html', '.js':'application/javascript', '.mjs':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.woff2':'font/woff2', '.webmanifest':'application/manifest+json' };
  try { await route.fulfill({body:await readFile(file),contentType:types[path.extname(file)] || 'application/octet-stream'}); }
  catch { await route.fulfill({status:404,body:''}); }
 });
 await page.addInitScript(() => localStorage.setItem('cashy-theme','light'));
 await page.goto('http://cashy-preview.test/',{waitUntil:'domcontentloaded',timeout:45000});
 await page.getByRole('heading',{name:'Overview',exact:true}).waitFor({timeout:30000});
 await page.getByRole('button',{name:'Switch to dark theme'}).waitFor();
 await page.evaluate(() => document.fonts.ready);
 await page.screenshot({path:'test-results/redesign-desktop.png',fullPage:true,animations:'disabled'});
 for(const width of [360,390,768,1440]) {
  await page.setViewportSize({width,height:900});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)) throw Error('Overflow at '+width);
 }
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'test-results/redesign-mobile.png',fullPage:true,animations:'disabled'});
 await page.getByRole('button',{name:'Add transaction',exact:true}).click();
 await page.getByRole('dialog').waitFor();
 console.log('Built-demo desktop/mobile screenshots captured; transaction dialog opens; no horizontal overflow at 360, 390, 768, 1440. Authentication is not exercised by this isolated visual review.');
}finally{await browser.close()}
