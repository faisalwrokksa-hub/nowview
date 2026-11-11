'use strict';
/* NewViewBusiness: safe Power BI links only. No Microsoft tokens, embedding or reports API. */
(function(){
 const STORAGE='newview.business.powerbi-shortcut.v1';
 const HOSTS=new Set(['app.powerbi.com']);
 function validatePowerBiUrl(value){
  try{
   if(typeof value!=='string'||value.length>2048)return null;
   const url=new URL(value.trim());
   if(url.protocol!=='https:'||url.username||url.password||url.port||!HOSTS.has(url.hostname.toLowerCase()))return null;
   if(!/^\/(?:groups|apps|reportEmbed|view|home|me|links)(?:\/|$)/i.test(url.pathname)&&url.pathname!=='/')return null;
   if(url.hash)url.hash='';
   return url.href;
  }catch{return null;}
 }
 function load(){try{return validatePowerBiUrl(localStorage.getItem(STORAGE));}catch{return null;}}
 function save(value){const valid=validatePowerBiUrl(value);if(!valid)return null;try{localStorage.setItem(STORAGE,valid);}catch{}return valid;}
 function clear(){try{localStorage.removeItem(STORAGE);}catch{}}
 function install(){
  const input=document.getElementById('powerbi-report-url');
  const open=document.getElementById('powerbi-report-open');
  const saveButton=document.getElementById('powerbi-report-save');
  const clearButton=document.getElementById('powerbi-report-clear');
  const status=document.getElementById('powerbi-report-status');
  if(!input||!open||!saveButton||!clearButton||!status)return;
  function render(message){
   const saved=load();
   input.value=saved||'';
   open.href=saved||'https://app.powerbi.com/';
   open.textContent=saved?'Open my saved report ↗':'Open Power BI Home ↗';
   status.textContent=message||(saved?'Saved report shortcut on this device':'No custom report saved');
  }
  saveButton.addEventListener('click',()=>{
   const value=save(input.value);
   if(!value){status.textContent='Enter a valid https://app.powerbi.com/ report link';return;}
   render('Power BI shortcut saved on this device');
  });
  clearButton.addEventListener('click',()=>{clear();render();});
  render();
 }
 window.NewViewPowerBI=Object.freeze({validatePowerBiUrl,load,save,clear});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
