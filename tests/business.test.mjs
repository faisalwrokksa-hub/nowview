import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const src=fs.readFileSync(new URL('../web/business.js',import.meta.url),'utf8');
const ctx={window:{},document:{getElementById:()=>null},TextEncoder,Date};
vm.runInNewContext(src,ctx);
const {parseBusinessCsv,summarize,parseCsv}=ctx.window.NewViewBusiness;
const header='date,revenue,cost,orders,customers\n';
test('parses, sorts, aggregates only supplied records',()=>{
 const rows=parseBusinessCsv(header+'2026-11-08,120,50,5,20\n2026-11-07,100,60,4,18\n');
 assert.equal(rows[0].date,'2026-11-07');
 const k=summarize(rows);
 assert.equal(k.revenue,220);assert.equal(k.cost,110);assert.equal(k.difference,110);assert.equal(k.orders,9);assert.equal(k.customers,20);
});
test('CSV quoted values parsed correctly and comments not executed',()=>{
 const rows=parseCsv('a,b\n"hi,there","quote ""test"""\n');
 assert.equal(rows[1][0],'hi,there');
 assert.equal(rows[1][1],'quote "test"');
 assert.doesNotMatch(src,/fetch\(|XMLHttpRequest|sendBeacon|Math\.random/);
});
test('rejects invalid header, non-numeric inputs, duplicate date and invalid date',()=>{
 for(const csv of [
 'date,revenue,cost,orders\n2026-11-08,10,5,1\n',
 header+'2026-11-08,-10,5,1,2',
 header+'2026-11-08,10,5,1.5,2',
 header+'2026-02-30,10,5,1,2',
 header+'2026-11-08,10,5,1,2\n2026-11-08,9,4,1,2'
 ])assert.throws(()=>parseBusinessCsv(csv));
});
test('zero revenue shows undefined difference percentage',()=>{
 const rows=parseBusinessCsv(header+'2026-11-08,0,10,0,0');
 assert.equal(summarize(rows).margin,null);
});
test('Power BI launch workspace replaces the CSV uploader while legacy CSV parsing stays testable',()=>{
 const html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
 const build=fs.readFileSync(new URL('../cloud/build.mjs',import.meta.url),'utf8');
 assert.match(html,/id="powerbi-report-url"/);assert.match(html,/https:\/\/app\.powerbi\.com\//);assert.doesNotMatch(html,/id="business-file"/);assert.match(build,/business\.js/);assert.match(build,/powerbi\.js/);
});

test('stale asynchronous CSV reads cannot restore cleared or replaced data',()=>{
 assert.match(src,/let selectionVersion=0/);
 assert.match(src,/selectionVersion\+\+/);
 assert.match(src,/const version=\+\+selectionVersion/);
 assert.match(src,/if\(version!==selectionVersion\)return/);
 assert.match(src,/if\(version===selectionVersion\)(?:\{|status\.textContent)/);
});

test('invalid replacement CSV cannot leave prior dataset selectable',()=>{
 assert.match(src,/loadedRows=null;period\.value='all';periodLabel\.hidden=true;/);
 assert.match(src,/if\(file\.size>limitBytes\)/);
 assert.match(src,/catch\(error\)\{if\(version===selectionVersion\)\{loadedRows=null/);
});

test('rejects unexpected characters after a closed quoted CSV field',()=>{
 for(const csv of [
  'a,b\n"value"garbage,2\n',
  'a,b\n"value" "other",2\n',
  'a,b\n"value"\\t,2\n'
 ])assert.throws(()=>parseCsv(csv),/Unexpected character after closing CSV quote/);
});
test('preserves valid quoted CSV fields at end of line and end of file',()=>{
 const rows=parseCsv('a,b\n"first","second"\n"third","fourth"');
 assert.equal(rows.length,3);
 assert.equal(rows[1][1],'second');
 assert.equal(rows[2][1],'fourth');
});

test('rejected CSV resets picker so the same corrected file can be selected again',()=>{
 assert.match(src,/catch\(error\)\{if\(version===selectionVersion\)\{[^\n]*picker\.value='';/);
});

test('reset clears pending CSV busy indicators after an in-flight read',()=>{
 assert.match(src,/function reset\(\)\{[^\n]*picker\.removeAttribute\('aria-busy'\);cards\.removeAttribute\('aria-busy'\)/);
});
