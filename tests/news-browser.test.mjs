import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const js=read('web/news-browser.js'),index=read('web/index.html'),css=read('web/command-center.css');
const native=read('android/src/dev/fintech/marketcharts/NewsBrowserActivity.java');
const bridge=read('android/src/dev/fintech/marketcharts/ChartsView.java');
const manifest=read('android/AndroidManifest.xml');
function getValidator(){
 const win={};
 const context={document:{readyState:'loading',addEventListener(){}},window:win,URL};
 vm.runInNewContext(js,context);
 // use a tiny fixture for parsing through a VM that skips UI installation
 return context;
}
test('browser module loads only once and exposes remote-friendly navigation',()=>{
 assert.equal((index.match(/src="news-browser\.js"/g)||[]).length,1);
 assert.match(js,/newview-news-address/);
 assert.match(js,/ArrowDown/);
 assert.match(js,/ArrowUp/);
 assert.match(js,/Focus headlines/);
 assert.match(js,/window\.NewViewNative\?\.openNewsBrowser/);
 assert.match(css,/news-browser-sites/);
 assert.match(css,/news-link:focus-visible/);
 assert.doesNotThrow(()=>new Function(js));
});
test('news browsing uses HTTPS only, no local resources or arbitrary HTML insertion',()=>{
 assert.match(js,/url\.protocol!=='https:'/);
 assert.match(js,/url\.username\|\|url\.password\|\|url\.port/);
 assert.match(js,/host\.endsWith\('\.local'\)/);
 assert.match(js,/window\.open\(url,'_blank','noopener,noreferrer'\)/);
 assert.doesNotMatch(js,/\.innerHTML\s*=/);
});
test('Android news browser has isolated WebView with explicit HTTPS and Safe Browsing',()=>{
 assert.match(manifest,/\.NewsBrowserActivity/);
 assert.match(manifest,/NewsBrowserActivity" android:exported="false"/);
 assert.match(native,/extends Activity/);
 assert.match(native,/setJavaScriptEnabled\(true\)/);
 assert.match(native,/setAllowFileAccess\(false\)/);
 assert.match(native,/setMixedContentMode\(WebSettings\.MIXED_CONTENT_NEVER_ALLOW\)/);
 assert.match(native,/setSafeBrowsingEnabled\(true\)/);
 assert.match(native,/shouldOverrideUrlLoading/);
 assert.match(native,/canGoBack\(\)/);
 assert.match(native,/canGoForward\(\)/);
 assert.match(native,/EditorInfo\.IME_ACTION_GO/);
 assert.doesNotMatch(native,/addJavascriptInterface/);
 assert.match(bridge,/openNewsBrowser\(String url\)/);
 assert.match(bridge,/NewsBrowserActivity\.safePage\(target\)/);
});
test('Cloudflare DNS control is documented as external and not falsely claimed as ad blocking',()=>{
 assert.match(js,/Public 1\.1\.1\.1 does not block advertising/);
 assert.match(js,/cloudflare-one\/traffic-controls\/dns-policies/);
 assert.doesNotMatch(js,/setDns|setPrivateDns|setSystemDns/);
});
