'use strict';
/* Watch browser quick bookmarks. HTTPS only; local device storage. */
(function(root){
 const KEY='newview.watch.bookmarks.v1';
 const defaults=[
  {name:'YouTube',url:'https://www.youtube.com/',category:'Video'},
  {name:'Vimeo',url:'https://vimeo.com/',category:'Video'},
  {name:'Dailymotion',url:'https://www.dailymotion.com/',category:'Video'},
  {name:'Plex',url:'https://watch.plex.tv/',category:'Movies'},
  {name:'Tubi',url:'https://tubitv.com/',category:'Movies'},
  {name:'Pluto TV',url:'https://pluto.tv/',category:'Movies'},
  {name:'Internet Archive',url:'https://archive.org/details/movies',category:'Public domain'}
 ];
 const safe=raw=>root.NewViewBrowserSafeUrl?.(raw)||null;
 function saved(){try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(v)?v.filter(x=>x&&typeof x.name==='string'&&x.name.trim().length>0&&x.name.length<=60&&safe(x.url)===x.url).slice(0,50):[];}catch{return [];}}
 function install(){
  const host=document.getElementById('nv-watch-hub')||document.querySelector('[data-workspace="media"]');
  if(!host||document.getElementById('nv-watch-bookmark-panel'))return;
  const section=document.createElement('section');section.id='nv-watch-bookmark-panel';section.className='shell-card nv-watch-bookmarks';
  section.setAttribute('aria-label','Entertainment website bookmarks');
  const title=document.createElement('h3');title.textContent='Browse websites';
  const description=document.createElement('p');description.textContent='Open bookmarked websites in NewView where supported. Some sites block embedded browsers; use the publisher fallback. Only access content you are authorized to watch.';
  const category=document.createElement('select');category.setAttribute('aria-label','Bookmark category');
  const categories=['All','Video','Movies','Public domain','Custom'];
  categories.forEach(x=>{const option=document.createElement('option');option.value=x;option.textContent=x;category.append(option);});
  const grid=document.createElement('div');grid.className='nv-watch-bookmark-grid';
  const form=document.createElement('form');form.className='nv-watch-bookmark-form';
  const name=document.createElement('input');name.placeholder='Bookmark name';name.maxLength=60;name.required=true;name.setAttribute('aria-label','Bookmark name');
  const url=document.createElement('input');url.type='url';url.placeholder='https://example.com';url.maxLength=2048;url.required=true;url.setAttribute('aria-label','Bookmark HTTPS URL');
  const add=document.createElement('button');add.type='submit';add.textContent='Add bookmark';
  const status=document.createElement('p');status.setAttribute('role','status');status.className='nv-watch-bookmark-status';
  form.append(name,url,add);section.append(title,description,category,grid,form,status);
  const hubGrid=host.querySelector('.nv-hub-grid');
  if(hubGrid)hubGrid.after(section);else host.prepend(section);
  function open(link){
   if(root.NewViewInternalBrowser?.open?.(link,{area:'watch'})){status.textContent='Opening website in NewView browser.';return;}
   status.textContent='Internal browser unavailable. Open the publisher in a separate browser.';
  }
  function render(){
   grid.replaceChildren();
   const filter=category.value;
   const items=[...defaults,...saved().map(x=>({...x,category:'Custom',custom:true}))].filter(x=>filter==='All'||x.category===filter);
   for(const item of items){
    const wrap=document.createElement('div');wrap.className='nv-watch-bookmark';
    const button=document.createElement('button');button.type='button';button.textContent=item.name;button.title=item.url;
    button.addEventListener('click',()=>open(item.url));wrap.append(button);
    if(item.custom){
     const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','Remove '+item.name);
     remove.addEventListener('click',()=>{try{localStorage.setItem(KEY,JSON.stringify(saved().filter(x=>x.url!==item.url)));render();}catch{status.textContent='Unable to update bookmarks.';}});wrap.append(remove);
    }
    grid.append(wrap);
   }
  }
  category.addEventListener('change',render);
  form.addEventListener('submit',event=>{
   event.preventDefault();const target=safe(url.value);if(!target){status.textContent='Use a valid public HTTPS website.';return;}
   const list=saved();if(list.length>=50){status.textContent='Maximum 50 custom bookmarks.';return;}
   if(list.some(x=>x.url===target)||defaults.some(x=>x.url===target)){status.textContent='Bookmark already saved.';return;}
   list.push({name:name.value.trim().slice(0,60)||new URL(target).hostname,url:target});
   try{localStorage.setItem(KEY,JSON.stringify(list));name.value='';url.value='';category.value='Custom';status.textContent='Bookmark saved on this device.';render();}catch{status.textContent='Unable to save bookmarks.';}
  });
  render();
 }
 if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();}
})(typeof window!=='undefined'?window:globalThis);
