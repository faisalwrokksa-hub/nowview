'use strict';
/* NewView dashboard-aware IPTV classification. No remote inference or private tracking. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.NewViewChannels=api;
})(typeof window!=='undefined'?window:globalThis,function(){
 const dashboardTypes=Object.freeze({
  myview:['favorites','news','business','sports','education','entertainment','music','kids','documentary','general'],
  markets:['business','news','documentary'],
  business:['business','news','education','documentary'],
  news:['news','weather','business'],
  media:['entertainment','movies','music','sports','kids','documentary','general'],
  social:['news','entertainment','music','sports','general']
 });
 const known=new Set(['news','business','sports','documentary','education','kids','music','movies','entertainment','weather','general','favorites']);
 function categoriesFor(dashboard,interests){
  const defaults=dashboardTypes[dashboard]||dashboardTypes.myview;
  const extra=Array.isArray(interests)?interests.filter(x=>typeof x==='string'&&known.has(x)):[];
  return [...new Set([...extra,...defaults])];
 }
 function playlistUrl(category){
  if(!known.has(category)||category==='favorites')return null;
  return 'https://iptv-org.github.io/iptv/categories/'+category+'.m3u';
 }
 return Object.freeze({dashboardTypes,categoriesFor,playlistUrl});
});
