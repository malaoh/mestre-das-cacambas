import { chromium } from 'playwright-core';
import fs from 'node:fs/promises';
import path from 'node:path';

const browser = await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const cases = [
  {name:'desktop',viewport:{width:1440,height:900},progress:[0,.45,.9]},
  {name:'mobile',viewport:{width:390,height:844},progress:[0,.45,.9]}
];
const report=[];
await fs.mkdir('.impeccable/review',{recursive:true});

for(const test of cases){
  const page=await browser.newPage({viewport:test.viewport,deviceScaleFactor:1});
  const errors=[];
  page.on('console',message=>{if(['error','warning'].includes(message.type()))errors.push(`console ${message.type()}: ${message.text()}`)});
  page.on('pageerror',error=>errors.push(`page: ${error.message}`));
  page.on('requestfailed',request=>errors.push(`request: ${request.url()} — ${request.failure()?.errorText}`));
  await page.goto('http://localhost:4173',{waitUntil:'domcontentloaded',timeout:15000});
  await page.waitForTimeout(700);
  const max=await page.evaluate(()=>document.documentElement.scrollHeight-innerHeight);
  for(const progress of test.progress){
    await page.evaluate(y=>scrollTo(0,y),max*progress);
    await page.waitForTimeout(900);
    await page.screenshot({path:path.join('.impeccable/review',`${test.name}-${Math.round(progress*100)}.png`),fullPage:false});
  }
  if(test.name==='desktop'){
    await page.evaluate(y=>scrollTo(0,y),max*.47);
    await page.waitForTimeout(1200);
    await page.locator('[data-size="10"]').click();
    await page.waitForTimeout(350);
  }
  const facts=await page.evaluate(()=>({
    scrollHeight:document.documentElement.scrollHeight,
    viewport:[innerWidth,innerHeight],
    activeSegment:getComputedStyle(document.documentElement).getPropertyValue('--sc-seg').trim(),
    activeProduct:document.querySelector('[role="radio"][aria-checked="true"]')?.dataset.size,
    webgl:document.querySelector('#three-stage')?.classList.contains('is-ready'),
    overflowX:document.documentElement.scrollWidth>innerWidth+1,
    h1:document.querySelector('h1')?.innerText
  }));
  report.push({name:test.name,errors,facts});
  await page.close();
}
await browser.close();
console.log(JSON.stringify(report,null,2));
