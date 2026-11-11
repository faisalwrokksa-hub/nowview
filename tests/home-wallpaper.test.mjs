import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=n=>readFileSync(new URL('../web/'+n,import.meta.url),'utf8');
const home=read('myview.js'),ui=read('simplified-ui.js'),css=read('simplified-ui.css'),html=read('index.html');
test('the default home photograph is a licensed black tiger, not a gradient alone',()=>{
 assert.match(home,/Black_tiger_in_Similipal_Forest\.jpg/);
 assert.match(home,/Government of Odisha/);
 assert.match(home,/defaultWallpaper/);
 assert.match(home,/custom\?data:defaultWallpaper/);
 assert.match(css,/data-simple-section="home"\]>main/);
 assert.match(css,/var\(--newview-wallpaper\)/);
 assert.match(css,/nv-simple-tile-icon/);
});
test('photo controls are available from Customize and remember local changes',()=>{
 assert.match(html,/id="wallpaper-file"/);
 assert.match(html,/id="wallpaper-remove"/);
 assert.match(html,/id="wallpaper-shade"/);
 assert.match(ui,/customize\.insertBefore\(photo/);
 assert.match(ui,/nv-wallpaper-credit/);
 assert.match(home,/localStorage\.setItem\(wallpaperKey,data\)/);
 assert.match(home,/Default black tiger photo restored/);
 for(const shade of ['light','medium','dark'])assert.match(css,new RegExp('wallpaper-shade="'+shade+'"'));
});
