/* NowView Markets stock board.
 * Independent implementation of a compact TV market card design.
 * U.S. securities are labels only until licensed quote providers are enabled.
 */
'use strict';
(function () {
  const groups = [
    {id:'us', title:'U.S. Stocks', subtitle:'U.S. exchanges · USD', lang:'en',
      items:[['AAPL','Apple'],['NVDA','NVIDIA'],['MSFT','Microsoft'],['AMD','AMD']]},
    {id:'token', title:'Binance Spot', subtitle:'Exchange-listed token / crypto pairs · USDT', lang:'en', items:[]}
  ];
  const text=(el, value)=>{el.textContent=value;return el;};
  const element=(tag,cls,content)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(content!==undefined)text(n,content);return n;};
  const stockNumber=x=>Number.isFinite(x)?new Intl.NumberFormat('en-US',{maximumFractionDigits:2,minimumFractionDigits:2}).format(x):'—';
  const points=(values)=>{
    const a=values.filter(Number.isFinite);
    if(a.length<2)return '';
    const low=Math.min(...a),high=Math.max(...a),span=high-low||1;
    return a.map((n,i)=>(i*100/(a.length-1)).toFixed(1)+','+(23-((n-low)/span)*20).toFixed(1)).join(' ');
  };
  let root, tokenRows, currentMarketData=null;
  function createRow(symbol,name,group){
    const row=element('div','board-row');
    row.dataset.symbol=symbol;
    row.dataset.group=group;
    row.setAttribute('role','row');
    const nameCell=element('div','board-name');
    nameCell.append(element('strong','',name),element('small','',symbol));
    const chart=element('svg','board-spark');
    chart.setAttribute('viewBox','0 0 100 26');
    chart.setAttribute('preserveAspectRatio','none');
    chart.setAttribute('aria-hidden','true');
    chart.appendChild(document.createElementNS('http://www.w3.org/2000/svg','polyline'));
    const price=element('span','board-price','—');
    const change=element('span','board-change','—');
    const status=element('span','board-row-status',group==='token'?'Awaiting quote':'Feed not connected');
    const value=element('div','board-numeric');
    value.append(price,change);
    row.append(nameCell,chart,value,status);
    return row;
  }
  function build(){
    root=document.getElementById('stock-board');
    if(!root)return;
    const grid=element('div','board-grid');
    for(const group of groups){
      const card=element('section','board-card');
      card.dataset.group=group.id;
      card.lang=group.lang;
      const heading=element('header','board-heading');
      const title=element('h3','',group.title);
      const sub=element('span','board-subtitle',group.subtitle);
      heading.append(title,sub);
      const list=element('div','board-list');
      list.setAttribute('role','table');
      list.setAttribute('aria-label',group.title);
      const items=group.id==='token'?[['SOXLB','SOXLB'],['BTC','Bitcoin'],['ETH','Ethereum']]:group.items;
      for(const [symbol,name] of items) list.appendChild(createRow(symbol,name,group.id));
      if(group.id==='token')tokenRows=list;
      card.append(heading,list);
      const note=element('p','board-note',group.id==='token'
        ?'Only the selected instrument shows its verified exchange quote. Other rows remain unavailable.'
        :'Live prices require a licensed market-data connector; no substitute prices are displayed.');
      card.appendChild(note);
      grid.append(card);
    }
    root.replaceChildren(grid);
    update(null);
  }
  function paint(row,quote){
    const price=row.querySelector('.board-price'),change=row.querySelector('.board-change');
    const spark=row.querySelector('.board-spark'),line=spark.querySelector('polyline');
    const status=row.querySelector('.board-row-status');
    row.classList.remove('board-up','board-down','board-old');
    line.removeAttribute('points');
    if(!quote||!Number.isFinite(quote.price)||!quote.quoteTime){
      price.textContent='—';change.textContent='—';status.textContent=row.dataset.group==='token'?'No verified quote':'Feed not connected';
      return;
    }
    const age=Math.max(0,Date.now()/1000-quote.quoteTime);
    const stale=age>120;
    const pct=quote.changePercent;
    price.textContent=stockNumber(quote.price)+' '+(quote.currency||'USDT');
    change.textContent=Number.isFinite(pct)?(pct>=0?'▲ ':'▼ ')+Math.abs(pct).toFixed(2)+'%':'24h change unavailable';
    if(Number.isFinite(pct))row.classList.add(pct>=0?'board-up':'board-down');
    if(stale)row.classList.add('board-old');
    const closes=(quote.bars||[]).map(b=>b[4]).filter(Number.isFinite);
    const sampled=closes.length>55?closes.filter((_,i)=>i%Math.ceil(closes.length/55)===0||i===closes.length-1):closes;
    const coords=points(sampled);
    if(coords)line.setAttribute('points',coords);
    status.textContent=stale?'Historical / stale':'Binance Spot · 24h change';
  }
  function update(quote){
    if(quote && quote.symbol)currentMarketData=quote;
    if(!tokenRows)return;
    for(const row of tokenRows.querySelectorAll('.board-row')){
      paint(row,currentMarketData&&row.dataset.symbol===currentMarketData.symbol?currentMarketData:null);
    }
  }
  function toggle(show){
    if(!root)return;
    root.hidden=!show;
    const workspace=document.querySelector('.workspace');
    if(workspace)workspace.hidden=show;
    document.body.classList.toggle('board-active',show);
  }
  window.NowViewBoard={build,update,toggle,points};
})();
