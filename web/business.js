'use strict';
/* Local-only business CSV analysis: no uploads, fake data, network calls or tracking. */
(function(){
 const columns=['date','revenue','cost','orders','customers'];
 const limitBytes=1048576,limitRows=5000;
 function parseCsv(raw){
  if(typeof raw!=='string'||new TextEncoder().encode(raw).length>limitBytes)throw new Error('CSV must be under 1 MB');
  const output=[];let row=[],cell='',quote=false;
  const pushRow=()=>{row.push(cell);cell='';if(row.some(x=>x.trim()!==''))output.push(row);row=[];if(output.length>limitRows+1)throw new Error('Too many CSV rows (maximum 5,000)');};
  for(let i=0;i<raw.length;i++){
   const c=raw[i];if(quote){
    if(c==='"'&&raw[i+1]==='"'){cell+='"';i++;}
    else if(c==='"')quote=false;
    else cell+=c;
   }else if(c==='"'&&cell==='')quote=true;
   else if(c===','){row.push(cell);cell='';}
   else if(c==='\n'||c==='\r'){if(c==='\r'&&raw[i+1]==='\n')i++;pushRow();}
   else if(c==='"')throw new Error('Invalid CSV quoting');
   else cell+=c;
  }
  if(quote)throw new Error('Unclosed CSV quoted field');
  if(row.length||cell)pushRow();
  return output;
 }
 function dateValid(x){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(x))return false;
  const d=new Date(x+'T00:00:00Z');
  return !Number.isNaN(+d)&&d.toISOString().slice(0,10)===x;
 }
 function measure(x,name,index){
  if(!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(x.trim()))throw new Error('Invalid '+name+' on row '+index);
  const n=Number(x);if(!Number.isFinite(n)||n>1000000000000)throw new Error('Out-of-range '+name+' on row '+index);
  return n;
 }
 function parseBusinessCsv(raw){
  const rows=parseCsv(raw.replace(/^\uFEFF/,''));
  if(rows.length<2)throw new Error('CSV requires a header and at least one data row');
  const headers=rows[0].map(s=>s.trim().toLowerCase());
  if(headers.length!==columns.length||!columns.every((c,i)=>c===headers[i]))throw new Error('Expected columns: '+columns.join(','));
  const dates=new Set();
  return rows.slice(1).map((r,i)=>{
   const n=i+2;if(r.length!==columns.length)throw new Error('Wrong number of columns on row '+n);
   const date=r[0].trim();if(!dateValid(date))throw new Error('Invalid date on row '+n);
   if(dates.has(date))throw new Error('Duplicate date on row '+n);dates.add(date);
   const revenue=measure(r[1],'revenue',n),cost=measure(r[2],'cost',n),
         orders=measure(r[3],'orders',n),customers=measure(r[4],'customers',n);
   if(!Number.isInteger(orders)||!Number.isInteger(customers))throw new Error('Orders and customers must be whole numbers on row '+n);
   return {date,revenue,cost,orders,customers};
  }).sort((a,b)=>a.date.localeCompare(b.date));
 }
 function summarize(rows){
  const revenue=rows.reduce((a,x)=>a+x.revenue,0),cost=rows.reduce((a,x)=>a+x.cost,0),
        orders=rows.reduce((a,x)=>a+x.orders,0),latest=rows[rows.length-1];
  return {revenue,cost,difference:revenue-cost,margin:revenue>0?(revenue-cost)/revenue*100:null,orders,
    customers:latest?latest.customers:null,asOf:latest?latest.date:null,count:rows.length};
 }
 const status=document.getElementById('business-status'),picker=document.getElementById('business-file'),cards=document.getElementById('business-kpis'),bars=document.getElementById('business-trend'),clear=document.getElementById('business-clear');
 if(!status||!picker||!cards||!bars){window.NewViewBusiness={parseCsv,parseBusinessCsv,summarize};return;}
 const el=(tag,klass,value)=>{const x=document.createElement(tag);if(klass)x.className=klass;x.textContent=value;return x;};
 const fmt=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(n);
 let selectionVersion=0;
 function reset(){selectionVersion++;if(typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('newview:business',{detail:null}));cards.replaceChildren();bars.replaceChildren();status.textContent='No company data loaded. CSV is processed locally and is not uploaded.';picker.value='';}
 function render(rows){
  const result=summarize(rows);
  if(typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('newview:business',{detail:{revenue:result.revenue,cost:result.cost,orders:result.orders,asOf:result.asOf,count:result.count}}));
  cards.replaceChildren();
  const metrics=[
   ['Revenue',fmt(result.revenue)],['Costs',fmt(result.cost)],['Revenue − Costs',fmt(result.difference)],
   ['Difference / revenue',result.margin===null?'—':result.margin.toFixed(1)+'%'],
   ['Orders (sum)',fmt(result.orders)],['Customers (latest snapshot)',fmt(result.customers)]
  ];
  for(const [title,value] of metrics){
   const item=el('article','business-kpi',''),heading=el('div','shell-eyebrow',title),number=el('strong','business-value',value);
   item.append(heading,number);cards.append(item);
  }
  bars.replaceChildren();
  const recent=rows.slice(-12),high=Math.max(1,...recent.map(x=>x.revenue));
  for(const entry of recent){
   const item=el('div','business-trend-row','');
   const label=el('time','',entry.date),track=el('div','business-bar-track',''),fill=el('div','business-bar-fill','');
   fill.style.width=(entry.revenue/high*100).toFixed(2)+'%';
   fill.setAttribute('aria-label','Revenue '+fmt(entry.revenue));
   track.append(fill);item.append(label,track,el('span','business-row-value',fmt(entry.revenue)));bars.append(item);
  }
  status.textContent=rows.length+' dated records loaded locally · most recent '+result.asOf+' · amounts in CSV units (currency not specified).';
 }
 picker.addEventListener('change',async()=>{
  const version=++selectionVersion;
  const file=picker.files?.[0];if(!file)return;
  cards.replaceChildren();bars.replaceChildren();
  if(typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('newview:business',{detail:null}));
  if(file.size>limitBytes){status.textContent='File too large: maximum 1 MB';picker.value='';return;}
  try{const text=await file.text();if(version!==selectionVersion)return;const rows=parseBusinessCsv(text);render(rows);}
  catch(error){if(version===selectionVersion)status.textContent='CSV rejected: '+error.message;}
 });
 clear?.addEventListener('click',reset);
 window.NewViewBusiness={parseCsv,parseBusinessCsv,summarize,reset};
})();
