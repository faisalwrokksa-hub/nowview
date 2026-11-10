import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
test('Native app bridge has a unified NewView name on both sides',()=>{
 const files=['../web/app.js','../web/media.js','../web/external-links.js','../android/src/dev/fintech/marketcharts/ChartsView.java'];
 for(const file of files){
  const source=read(file);
  assert.doesNotMatch(source,/\bFintech\b|__fintechResult/);
  assert.match(source,/NewViewNative/);
 }
 assert.match(read('../web/app.js'),/window\.__newviewResult=/);
 assert.match(read('../android/src/dev/fintech/marketcharts/ChartsView.java'),/window\.__newviewResult/);
});
test('MyView avoids recreating tiles on identical source updates',()=>{
 const source=read('../web/myview.js');
 assert.match(source,/preview\[id\]\(next\)===preview\[id\]\(snapshots\[id\]\)/);
 assert.match(source,/if\(live\)live\.textContent=preview\[id\]\(next\)/);
});