'use strict';
/* Shared TV and web navigation enhancements. No network requests or new dependencies. */
(function(root){
 const KEY='newview.ux.preferences.v1';
 const FOCUSABLE='button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
 function visible(node){return !!(node?.getClientRects().length)&&!node.closest('[hidden],[inert],[aria-hidden="true"]');}
 function focusFirst(section){const target=[...section.querySelectorAll(FOCUSABLE)].find(visible);target?.focus({preventScroll:true});return !!target;}
 function install(){
  if(document.getElementById('nv-ux-navigation-help'))return;
  const home=document.getElementById('nv-customize-hub')||document.getElementById('newview-settings');
  if(home){
   const help=document.createElement('p');help.id='nv-ux-navigation-help';help.className='nv-ux-help';
   help.textContent='TV remote: use arrows to move between controls, Select to activate, and Back to return. Your Home shortcuts and display settings are saved on this device.';
   home.append(help);
  }
  // Spatial navigation fallback only when a native TV shell has not already handled the event.
  document.addEventListener('keydown',event=>{
   if(event.defaultPrevented||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
   const current=document.activeElement;
   if(!current||current===document.body||current.matches('input,textarea,select,[contenteditable="true"]'))return;
   if(!visible(current))return;
   const nodes=[...document.querySelectorAll(FOCUSABLE)].filter(visible);
   if(nodes.length<2||!nodes.includes(current))return;
   const rect=current.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
   const horizontal=event.key==='ArrowLeft'||event.key==='ArrowRight';
   const sign=event.key==='ArrowLeft'||event.key==='ArrowUp'?-1:1;
   let best=null,score=Infinity;
   for(const node of nodes){
    if(node===current)continue;
    const r=node.getBoundingClientRect(),x=r.left+r.width/2-cx,y=r.top+r.height/2-cy;
    const primary=(horizontal?x:y)*sign,cross=Math.abs(horizontal?y:x);
    if(primary<=3)continue;
    const distance=primary+cross*2;
    if(distance<score){score=distance;best=node;}
   }
   if(best){event.preventDefault();best.focus({preventScroll:true});best.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});}
  });
  // Never steal focus on page load. Recover only if a navigation action hides the active control.
  const observer=new MutationObserver(()=>{
   const current=document.activeElement;
   if(current&&current!==document.body&&!visible(current)){
    const section=[...document.querySelectorAll('#nv-simple-nav,[data-workspace],#nv-simple-home')].find(visible);
    if(section)focusFirst(section);
   }
  });
  observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['hidden','inert','aria-hidden']});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})(typeof window!=='undefined'?window:globalThis);
