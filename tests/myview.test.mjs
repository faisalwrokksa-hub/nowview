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
