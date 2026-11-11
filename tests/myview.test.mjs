import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const src=fs.readFileSync(new URL('../web/myview.js',import.meta.url),'utf8');
function setup(value=null){
 const window={};const document={getElementById:()=>null};let saved=value;
 const localStorage={getItem:()=>saved,setItem:(k,v)=>{saved=v;}};
 vm.runInNewContext(src,{window,document,localStorage});
 return {api:window.NewViewPersonal,saved:()=>saved};
}
test('MyView Daily Brief defaults include Markets, News and Business',()=>{const {api}=setup();assert.deepEqual([...api.load()],['market','news','business']);});
test('MyView excludes unrecognized widget IDs and duplicate entries',()=>{
 const {api}=setup();assert.deepEqual([...api.sanitize(['market','bad','news','market','business'])],['market','news','business']);
});
test('MyView preserves an intentionally empty layout and safe order',()=>{
 const s=setup('[]');assert.deepEqual([...s.api.load()],[]);
 assert.deepEqual([...s.api.save(['social','market'])],['social','market']);
 assert.deepEqual(JSON.parse(s.saved()),['social','market']);
});
test('MyView falls back to defaults if storage is corrupt',()=>{const s=setup('{');assert.deepEqual([...s.api.load()],['market','news','business']);});
test('Five-workspace navigation and MyView editable controls are in bundled UI',()=>{
 const html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
 const cloud=fs.readFileSync(new URL('../cloud/build.mjs',import.meta.url),'utf8');
 for(const id of ['myview-editor','myview-grid','myview-reset','myview-count'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(cloud,/myview\.js/);
 assert.doesNotMatch(src,/Math\.random|fakePrice|sampleRevenue/);
});

test('MyView preset layouts are allowlisted, immutable defaults and locally selectable',()=>{
 const {api}=setup();
 assert.deepEqual([...api.preset('balanced')],['market','news','business']);
 assert.deepEqual([...api.preset('markets')],['market','business','news']);
 assert.deepEqual([...api.preset('media')],['media','news','social']);
 assert.equal(api.preset('unknown'),null);
 const first=api.preset('balanced');first.pop();
 assert.deepEqual([...api.preset('balanced')],['market','news','business']);
});
test('News and video widgets open their sections inside five-workspace Watch & News',()=>{
 const {api}=setup();
 const news=api.catalog.find(w=>w.id==='news'),media=api.catalog.find(w=>w.id==='media');
 assert.equal(news.view,'media');
 assert.equal(news.section,'headlines');
 assert.equal(media.section,'videos');
 const html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
 assert.match(html,/id="myview-presets"/);
 assert.match(src,/\[data-reorder=/);
 assert.match(src,/target\.focus\(\)/);
});

test('Daily Brief omits empty sanitized official headlines without inventing text',()=>{
 const {api}=setup();
 assert.equal(api.preview.news({source:'fed',count:2,headline:String.fromCharCode(0,31)}),'2 Federal Reserve announcements');
 assert.equal(api.preview.news({source:'sec',count:1,headline:'  SEC   update  '}),'1 SEC announcements · SEC update');
 assert.equal(api.preview.news({source:'unknown',count:1,headline:'Unverified'}),'Load verified official announcements in Watch & News');
});

test('Market Watch rejects malformed symbols without claiming quote verification',()=>{
 const {api}=setup();
 assert.equal(api.preview.market({symbol:'BTCUSDT',price:120,currency:'USDT'}),'BTCUSDT · 120 USDT · quote time unavailable');
 for(const symbol of ['BTC'+String.fromCharCode(10)+'USDT','BTC'+String.fromCharCode(0x202e)+'USDT','<script>','A'.repeat(25)]){
  assert.equal(api.preview.market({symbol,price:120,currency:'USDT'}),'No valid quote received');
 }
});

test('Market Watch general reference does not claim to verify a specific quote',()=>{
 assert.match(src,/Binance markets \(general reference, not quote verification\)/);
 assert.match(src,/does not verify displayed quote/);
});

test('Market Watch does not display future-dated quote timestamps as current',()=>{
 const {api}=setup();
 const future=Math.floor(Date.now()/1000)+3600;
 assert.equal(api.preview.market({symbol:'BTCUSDT',price:120,currency:'USDT',quoteTime:future}),'BTCUSDT · 120 USDT · quote time unavailable');
 const recent=Math.floor(Date.now()/1000)-60;
 assert.match(api.preview.market({symbol:'BTCUSDT',price:120,currency:'USDT',quoteTime:recent}),/ · quote (?!time unavailable)/);
});


test('Market Watch hides stale quote times without treating old timestamps as current',()=>{
 const {api}=setup();
 const stale=Math.floor(Date.now()/1000)-25*60*60;
 assert.equal(api.preview.market({symbol:'BTCUSDT',price:120,currency:'USDT',quoteTime:stale}),'BTCUSDT · 120 USDT · quote time unavailable');
 const recent=Math.floor(Date.now()/1000)-60;
 assert.match(api.preview.market({symbol:'BTCUSDT',price:120,currency:'USDT',quoteTime:recent}),/ · quote (?!time unavailable)/);
});


test('Business Pulse labels imported KPIs as local and unverified',()=>{
 const {api}=setup();
 const preview=api.preview.business({revenue:100,cost:40,orders:2,asOf:'2026-11-10'});
 assert.match(preview,/local CSV \(not independently verified\)/);
 assert.match(preview,/2026-11-10/);
 assert.equal(api.preview.business(null),'Upload a CSV in Business to view session KPIs');
});


test('Business Pulse strips bidirectional formatting controls from imported reporting periods',()=>{
 const {api}=setup();
 const preview=api.preview.business({revenue:100,cost:40,orders:2,asOf:'2026-'+String.fromCharCode(0x202e)+'11-10'});
 assert.equal(preview.includes(String.fromCharCode(0x202e)),false);
 assert.match(preview,/2026-11-10/);
});

test('Official headline previews strip bidirectional control characters',()=>{
 const {api}=setup();
 const preview=api.preview.news({source:'sec',count:1,headline:'SEC '+String.fromCharCode(0x202e)+'update'});
 assert.equal(preview.includes(String.fromCharCode(0x202e)),false);
 assert.match(preview,/SEC update/);
});


test('Market source reference requires a valid timestamp and cannot accompany stale or future quotes',()=>{
 assert.match(src,/const valid=quote&&[^;]*Number\.isSafeInteger\(quote\.quoteTime\)/);
 assert.match(src,/quote\.quoteTime\*1000>=Date\.now\(\)-86400000/);
 assert.match(src,/quote\.quoteTime\*1000<=Date\.now\(\)\+300000/);
});


test('Market source link requires an explicitly valid quote currency',()=>{
 assert.match(src,/typeof quote\.currency==='string'&&\/\^\[A-Z0-9\]\{2,12\}\$\/\.test\(quote\.currency\)/);
 const {api}=setup();
 assert.match(api.preview.market({symbol:'BTCUSDT',price:120,currency:'$',quoteTime:Math.floor(Date.now()/1000)}),/currency unavailable/);
});


test('MyView Alt+Arrow reorders cards without intercepting ordinary TV D-pad keys',()=>{
 assert.match(src,/item\.addEventListener\('keydown',event=>/);
 assert.match(src,/!event\.altKey\|\|event\.ctrlKey\|\|event\.metaKey\|\|event\.shiftKey/);
 assert.match(src,/event\.key!=='ArrowUp'&&event\.key!=='ArrowDown'/);
 assert.match(src,/event\.preventDefault\(\);move\(delta\)/);
});


test('MyView preserves focused card action after keyboard or button reordering',()=>{
 assert.match(src,/const focused=document\.activeElement/);
 assert.match(src,/focused===up\?'up':focused===down\?'down'/);
 assert.match(src,/focused===button\?'open'/);
 assert.match(src,/\[data-source-link=/);
 assert.match(src,/target&&!target\.disabled&&!target\.hidden/);
});
