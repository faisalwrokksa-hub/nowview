'use strict';
(function(){
 function init(){
 const agent=window.NewViewOfflineAgents, status=document.getElementById('offline-agent-status'),list=document.getElementById('offline-alert-list');
 if(!agent||!status||!list)return;
 function show(message){status.textContent=message}
 function render(){list.replaceChildren();const result=agent.execute('local-alerts');const rules=result.ok?result.value:[];if(!rules.length){const p=document.createElement('p');p.textContent='No local alerts configured';list.append(p);return;}for(const rule of rules){const row=document.createElement('div');row.className='media-actions';const label=document.createElement('span');label.textContent=rule.symbol+' '+rule.direction+' '+rule.price;const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';remove.setAttribute('aria-label','Remove alert for '+rule.symbol);remove.addEventListener('click',()=>{if(agent.removeAlert(rule.id)){show('Alert removed');render()}else show('Could not save alert removal')});row.append(label,remove);list.append(row)}}
 document.getElementById('offline-alert-add')?.addEventListener('click',()=>{const symbol=document.getElementById('offline-alert-symbol').value.trim().toUpperCase();const direction=document.getElementById('offline-alert-direction').value;const price=Number(document.getElementById('offline-alert-price').value);const result=agent.setAlert({symbol,direction,price});show(result.ok?'Alert saved locally. It evaluates only when a verified quote is received.':result.error);render()});
 document.getElementById('offline-profile-export')?.addEventListener('click',()=>{const blob=new Blob([JSON.stringify(agent.exportProfile(),null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='newview-profile.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);show('Profile exported. Import it on another device to transfer settings manually.')});
 document.getElementById('offline-profile-import')?.addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>65536){show('Profile too large (64 KB maximum)');e.target.value='';return;}try{const data=JSON.parse(await file.text());const result=agent.importProfile(data);show(result.ok?'Profile imported. Reload NewView to apply widget changes.':result.error)}catch{show('Invalid JSON profile')}e.target.value=''});
 window.addEventListener('newview:offline-alerts',e=>{const entries=Array.isArray(e.detail)?e.detail:[];if(entries.length){const first=entries[0];show('Price alert: '+first.symbol+' '+first.direction+' '+first.threshold+' (observed '+first.price+'). Quote time: '+new Date(first.quoteTime*1000).toLocaleString());}});
 render();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
