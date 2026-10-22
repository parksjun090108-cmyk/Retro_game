import { spawnSync } from 'node:child_process';
import { cpSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const base = '/Retro_game/play/';
const api = 'https://retro-games-rankings.wigglybirch512.chatgpt.site/api/game';
const output = resolve(root, 'docs/play');
if (output !== resolve(root, 'docs', 'play')) throw new Error('Unexpected output directory');
const result = spawnSync(process.execPath, [resolve(root, 'client/node_modules/vite/bin/vite.js'), 'build', '--base', base, '--outDir', output, '--emptyOutDir'], {
  cwd: resolve(root, 'client'), stdio: 'inherit', env: { ...process.env, VITE_API_URL: api, VITE_PUBLIC_BUILD: 'true' },
});
if (result.status !== 0) process.exit(result.status || 1);
cpSync(resolve(root, 'strike-wing-offline/strike-wing'), resolve(output, 'strike-wing'), { recursive: true });
cpSync(resolve(root, 'metro-pacman'), resolve(output, 'metro-pacman'), { recursive: true });

// iframe 게임도 같은 공개 API와 브라우저 참가 토큰을 사용한다.
const bridge = `<script>(function(){const api=${JSON.stringify(api)};const nativeFetch=window.fetch.bind(window);window.fetch=function(input,init){if(input==='/api/records'){const token=localStorage.getItem('retro-api-token:'+api);const headers=new Headers(init&&init.headers);if(token)headers.set('Authorization','Bearer '+token);return nativeFetch(api+'/records',Object.assign({},init,{headers}));}return nativeFetch(input,init);};})();</script>`;
for (const game of ['strike-wing', 'metro-pacman']) {
  const path = resolve(output, game, 'index.html');
  let html = readFileSync(path, 'utf8').replace('<head>', '<head>' + bridge);
  html = html.replaceAll('"/usefulpix-synthwave-beats-perfect-background-music-341849.mp3"', JSON.stringify(base + 'usefulpix-synthwave-beats-perfect-background-music-341849.mp3'));
  writeFileSync(path, html);
}
console.log('Public game: https://parksjun090108-cmyk.github.io/Retro_game/play/');
