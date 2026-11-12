import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
const script=readFileSync(new URL('../web/ux-preferences.js',import.meta.url),'utf8');
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.attributes={};this.textContent='';this.value='';this.href='';this.rel='';this.target='';this.events={};}
 append(...nodes){this.children.push(...nodes);}
 setAttribute(key,value){this.attributes[key]=value;}
 addEventListener(name,fn){this.events[name]=fn;}
}
const collect=(e,p)=>[e,...e.children.flatMap(n=>collect(n,p))].filter(p);
function mount(config={}){
 const host=new Element('details');
 const metas={'newview-privacy-policy-url':config.privacy,'newview-support-url':config.support};
 const document={body:{dataset:{}},readyState:'complete',getElementById:id=>id==='newview-settings'?host:null,
  createElement:tag=>new Element(tag),
  querySelector:selector=>{
   const match=/meta\[name="([^"]+)"\]/.exec(selector);
   return match&&metas[match[1]]!==undefined?{content:metas[match[1]]}:null;
  }};
 const root={addEventListener(){},dispatchEvent(){}};
 vm.runInNewContext(script,{document,window:root,localStorage:{getItem:()=>null,setItem(){}},
   navigator:{onLine:true},sessionStorage:{setItem(){}},
   CustomEvent:class{constructor(name,init){this.name=name;this.detail=init.detail;}},setTimeout,URL});
 return host;
}
test('app config has explicit unapproved policy URL slots; no fictional company website',()=>{
 assert.match(html,/<meta name="newview-privacy-policy-url" content="">/);
 assert.match(html,/<meta name="newview-support-url" content="">/);
 const host=mount();
 const anchors=collect(host,e=>e.tag==='a');
 assert.equal(anchors.length,0,'no link to an unapproved or invented URL');
 const legal=collect(host,e=>e.tag==='section'&&e.className==='nv-legal-links')[0];
 assert.ok(legal);
 assert.ok(collect(legal,e=>e.tag==='p'&&/pending owner approval/.test(e.textContent)).length===1);
});
test('approved HTTPS privacy/support URLs are exposed with safe tab isolation',()=>{
 const host=mount({privacy:'https://example.org/privacy',support:'https://example.org/support'});
 const a=collect(host,e=>e.tag==='a');
 assert.equal(a.length,2);
 assert.deepEqual(a.map(x=>x.href),['https://example.org/privacy','https://example.org/support']);
 assert.ok(a.every(x=>x.rel==='noopener noreferrer'&&x.target==='_blank'));
});
test('unsafe privacy/support URLs fail closed and cannot be shown to customers',()=>{
 for(const raw of ['http://example.org/privacy','https://user:pass@example.org/privacy',
  'https://example.org:444/privacy','https://example.org/privacy#spoof','javascript:alert(1)','not-a-url']){
  const host=mount({privacy:raw,support:''});
  assert.equal(collect(host,e=>e.tag==='a').length,0,'invalid destination: '+raw);
 }
});
