import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const js=readFileSync(new URL('../web/powerbi.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
const ctx={window:{},document:{readyState:'loading',addEventListener(){},getElementById(){return null;}},localStorage:{getItem(){return null;},setItem(){},removeItem(){}},URL};
vm.runInNewContext(js,ctx);
const {validatePowerBiUrl}=ctx.window.NewViewPowerBI;
test('official Power BI URL allowlist accepts valid reports',()=>{
 assert.equal(validatePowerBiUrl('https://app.powerbi.com/'),'https://app.powerbi.com/');
 assert.equal(validatePowerBiUrl('https://app.powerbi.com/groups/me/reports/123'),'https://app.powerbi.com/groups/me/reports/123');
});
test('Power BI shortcuts reject other hosts and unsupported schemes',()=>{
 for(const value of ['javascript:alert(1)','http://app.powerbi.com/','https://app.powerbi.com.evil.test/','https://evil.test/@app.powerbi.com/','https://app.powerbi.com:444/groups/me','https://app.powerbi.com/redirect']){
  assert.equal(validatePowerBiUrl(value),null,value);
 }
});
test('business workspace launches official Power BI, never collects credentials',()=>{
 assert.match(html,/data-workspace="business"/);
 assert.match(html,/id="powerbi-report-save"/);
 assert.match(html,/id="business-file"/);
 assert.doesNotMatch(js,/fetch\(|XMLHttpRequest|client_secret|access_token/);
});
