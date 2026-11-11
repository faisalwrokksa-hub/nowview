import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
for (const folder of ['web','cloud','tools','tests']) {
 for (const name of fs.readdirSync(folder).filter(name=>/\.(js|mjs)$/.test(name))) {
  execFileSync(process.execPath,['--check',`${folder}/${name}`],{stdio:'inherit'});
 }
}
console.log('All frontend, build, tool and test JavaScript syntax checks passed');
