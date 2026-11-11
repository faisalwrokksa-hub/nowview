import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const source=read('web/youtube-viewer.js');
const context={window:{},URL};
vm.runInNewContext(source,context,{timeout:2000});
const parse=context.window.NewViewYouTubeParse;
test('only supported HTTPS YouTube video URLs are accepted',()=>{
 for(const [input,id] of [
  ['https://www.youtube.com/watch?v=jfKfPfyJRdk','jfKfPfyJRdk'],
  ['https://youtu.be/jfKfPfyJRdk','jfKfPfyJRdk'],
  ['https://m.youtube.com/shorts/jfKfPfyJRdk','jfKfPfyJRdk'],
  ['https://www.youtube-nocookie.com/embed/jfKfPfyJRdk','jfKfPfyJRdk']
 ])assert.equal(parse(input),id);
 for(const input of ['https://www.youtube.com/','https://www.youtube.com/results?search_query=news','https://evil.example/watch?v=jfKfPfyJRdk','http://www.youtube.com/watch?v=jfKfPfyJRdk','https://user:pass@www.youtube.com/watch?v=jfKfPfyJRdk','https://www.youtube.com:8443/watch?v=jfKfPfyJRdk','javascript:alert(1)'])assert.equal(parse(input),null,input);
});
test('watch embeds individual videos only, with strict built-in URL validation and no bypass promises',()=>{
 assert.match(source,/https:\/\/www\.youtube-nocookie\.com\/embed/);
 assert.match(source,/allowFullscreen=true/);
 assert.match(source,/newview-youtube|nv-youtube/);
 assert.match(source,/DNS filtering cannot guarantee ad-free video/);
 assert.match(source,/panel\.hidden=true/);
 assert.doesNotMatch(source,/innerHTML|eval\(/);
 assert.doesNotMatch(source,/youtube\.com\/results\?search_query=/);
});
test('web and Android packaging include dark YouTube viewer',()=>{
 const html=read('web/index.html'),build=read('cloud/build.mjs'),apk=read('scripts/verify-preview-apk.sh'),ui=read('web/simplified-ui.js'),css=read('web/simplified-ui.css');
 assert.match(html,/src="youtube-viewer\.js" defer/);
 assert.match(build,/youtube-viewer\.js/);
 assert.match(apk,/youtube-viewer\.js/);
 assert.match(ui,/NewViewYouTube\?\.open/);
 assert.match(css,/\.nv-youtube-stage iframe/);
});

test('shared Android browser starts with YouTube and opens the requested news URL with dark chrome',()=>{
 const browser=read('android/src/dev/fintech/marketcharts/NewsBrowserActivity.java');
 const news=read('web/news-browser.js');
 assert.match(browser,/START="https:\/\/www\.youtube\.com\/"/);
 assert.match(browser,/navigate\(safePage\(requested\)\?requested\.toString\(\):START\)/);
 assert.match(browser,/setStatusBarColor/);
 assert.match(browser,/setNavigationBarColor/);
 assert.match(browser,/setAlgorithmicDarkeningAllowed\(true\)/);
 assert.match(browser,/setForceDark\(WebSettings\.FORCE_DARK_ON\)/);
 assert.match(news,/if\(!browse\(url\)\)window\.NewViewNewsReader/);
 assert.doesNotMatch(news,/if\(!link\|\|typeof window\.NewViewNative/);
 const links=read('web/external-links.js');
 assert.match(links,/NewViewNative\.openNewsBrowser\(href\)/);
 const tv=read('web/tv-guide.js');
 assert.match(tv,/floatingButton\.click\(\)/);
});

test('Cloudflare Worker permits default Wikimedia wallpaper image hosts',()=>{
 const build=read('cloud/build.mjs'),home=read('web/myview.js');
 assert.match(home,/commons\.wikimedia\.org\/wiki\/Special:FilePath\/Black_tiger_in_Similipal_Forest\.jpg/);
 assert.match(build,/img-src 'self' data: https:\/\/commons\.wikimedia\.org https:\/\/upload\.wikimedia\.org/);
});

test('news reader remains in Read, uses feed excerpts and provides publisher link',()=>{
 const news=read('web/news.js'),css=read('web/simplified-ui.css');
 assert.match(news,/reader\.hidden=false;container\.hidden=true/);
 assert.match(news,/NewViewNewsReader=Object\.freeze/);
 assert.match(news,/Read full article at publisher/);
 assert.match(css,/#nv-article-reader/);
 assert.match(css,/\.nv-article-content/);
});

test('unified browser supports safe URLs, bookmarks, history and Home/Read/Watch slots',()=>{
 const browser=read('web/internal-browser.js'),html=read('web/index.html'),css=read('web/simplified-ui.css'),home=read('web/simplified-ui.js');
 assert.match(html,/src="internal-browser\.js" defer/);
 assert.match(browser,/nv-browser-address-form/);
 assert.match(browser,/nv-browser-frame/);
 assert.match(browser,/nv-browser-excerpt/);
 assert.match(browser,/newview\.browser\.bookmarks\.web\.v1/);
 assert.match(browser,/history\.slice\(0,cursor\+1\)/);
 assert.match(browser,/destination==='home'/);
 assert.match(browser,/destination==='watch'/);
 assert.match(browser,/NewViewNative\?\.openNewsBrowser/);
 assert.match(home,/NewViewInternalBrowser/);
 assert.match(css,/\.nv-browser-toolbar/);
 assert.doesNotMatch(browser,/innerHTML\s*=/);
 const context={window:{},URL};
 vm.runInNewContext(browser,context,{timeout:2000});
 const valid=context.window.NewViewBrowserSafeUrl;
 assert.equal(valid('https://www.youtube.com/'),'https://www.youtube.com/');
 for(const url of ['javascript:alert(1)','http://example.com','https://127.0.0.1/','https://localhost/','https://user:pass@example.com/','https://example.com:8443/'])assert.equal(valid(url),null,url);
});
