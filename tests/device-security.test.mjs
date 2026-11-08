import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
test('NewView device security hardening and manual test matrix are tracked',()=>{
 const chart=read('../android/src/dev/fintech/marketcharts/ChartsView.java');
 const doc=read('../docs/DEVICE_ACCEPTANCE.md');
 const wf=read('../.github/workflows/dashboard.yml');
 for(const rule of ['setAllowFileAccessFromFileURLs(false)','setAllowUniversalAccessFromFileURLs(false)','setSupportMultipleWindows(false)','setSafeBrowsingEnabled(true)','setWebContentsDebuggingEnabled(false)','!r.hasGesture()']){
  assert.ok(chart.includes(rule),rule);
 }
 for(const id of ['TV-01','TV-02','TV-03','TV-04','TV-05','TV-06','TV-07','MOB-01','MOB-02','MOB-03','WEB-01','SEC-01','SEC-02'])assert.match(doc,new RegExp(id));
 assert.match(doc,/NOT RUN/);
 assert.match(wf,/tests\/device-security\.test\.mjs/);
});

test('Home overlay remains disabled until user explicitly opts in',()=>{
 const service=read('../android/src/dev/fintech/marketcharts/HomePanelService.java');
 const chart=read('../android/src/dev/fintech/marketcharts/ChartsView.java');
 const config=read('../android/res/xml/home_panel_service.xml');
 for(const source of [service,chart]){
  assert.match(source,/getBoolean\("homePanel",false\)/);
  assert.doesNotMatch(source,/getBoolean\("homePanel",true\)/);
 }
 assert.match(chart,/setPanelEnabled\(boolean enabled\)/);
 assert.match(service,/Settings\.canDrawOverlays\(this\)/);
 assert.match(config,/canRetrieveWindowContent="false"/);
});
