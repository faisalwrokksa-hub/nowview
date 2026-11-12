#!/usr/bin/env node
// Chromium desktop and responsive smoke against the isolated Cloudflare preview.
// Not a substitute for Android TV hardware tests, Firefox, media rights or release signing.
import {chromium} from 'playwright';
import {mkdirSync} from 'node:fs';
import {PREVIEW_URL,validateTarget} from './verify-integration-preview.mjs';

const sha=process.env.NEWVIEW_EXPECTED_SHA||'';
const target=process.env.NEWVIEW_URL||PREVIEW_URL;
validateTarget(target,sha);
const sizes=[{name:'phone390',width:390,height:844},
 {name:'tablet768',width:768,height:1024},
 {name:'desktop1440',width:1440,height:900},
 {name:'tv1920',width:1920,height:1080}];
mkdirSync('preview-screenshots',{recursive:true});
const browser=await chromium.launch({headless:true});
let failures=0;
try{
 for(const size of sizes){
  const context=await browser.newContext({viewport:{width:size.width,height:size.height},deviceScaleFactor:1,ignoreHTTPSErrors:false});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try{
   const response=await page.goto(target,{waitUntil:'domcontentloaded',timeout:25000});
   if(response?.status()!==200)throw Error('Homepage HTTP '+response?.status());
   const tabs=page.locator('#nv-simple-nav .nv-simple-tab');
   await tabs.first().waitFor({state:'visible',timeout:16000});
   const count=await tabs.count();
   if(count!==4)throw Error('Expected four main tabs, received '+count);
   for(let i=0;i<count;i++){
    await tabs.nth(i).click({timeout:5000});
    const active=await tabs.nth(i).evaluate(el=>el.classList.contains('active')||el.getAttribute('aria-current')==='page'||el.getAttribute('aria-pressed')==='true');
    if(!active)throw Error('Tab '+i+' did not become active after click');
   }
   await tabs.first().focus();
   await page.keyboard.press('ArrowRight');
   if(!(await tabs.nth(1).evaluate(el=>el===document.activeElement)))throw Error('ArrowRight failed to move nav keyboard focus');
   const metrics=await page.evaluate(()=>({
    scrollWidth:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth),
    innerWidth:window.innerWidth,
    visibleMain:!!document.querySelector('#nv-simple-nav'),
    title:document.title
   }));
   if(metrics.scrollWidth>metrics.innerWidth+12)throw Error('Horizontal page overflow '+metrics.scrollWidth+'px > '+metrics.innerWidth+'px');
   if(!metrics.visibleMain||!metrics.title)throw Error('Page shell or document title missing');
   if(errors.length)throw Error('Uncaught JS errors: '+errors.slice(0,3).join(' | '));
   console.log('PASS',size.name,'navigation, focus, no overflow, no page exceptions');
  }catch(error){failures++;console.error('FAIL',size.name,error?.stack||error);}
  finally{
   try{await page.screenshot({path:'preview-screenshots/'+size.name+'.png',fullPage:true,timeout:10000});}
   catch(error){console.warn('Screenshot unavailable for',size.name,error.message);}
   await context.close();
  }
 }
}finally{await browser.close();}
if(failures)process.exitCode=1;
else console.log('PASS all four Chromium desktop/responsive preview smoke viewports; hardware and Firefox remain separate gates.');
