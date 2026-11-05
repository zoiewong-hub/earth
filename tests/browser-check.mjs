import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const [url, screenshot, mode = 'inspect'] = process.argv.slice(2);
const targets = await (await fetch('http://127.0.0.1:9224/json/list')).json();
const target = targets.find(t => t.type === 'page');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let id = 0;
const pending = new Map();
const events = [];
ws.onmessage = ({data}) => {
  const message = JSON.parse(data);
  if (message.id) {
    const p = pending.get(message.id);
    if (!p) return;
    pending.delete(message.id);
    message.error ? p.reject(message.error) : p.resolve(message.result);
  } else if (['Runtime.exceptionThrown', 'Log.entryAdded', 'Network.loadingFailed'].includes(message.method)) {
    events.push(message);
  }
};
function send(method, params = {}) {
  return new Promise((resolve,reject) => {
    const request = ++id;
    pending.set(request, {resolve,reject});
    ws.send(JSON.stringify({id:request,method,params}));
  });
}
await send('Page.enable');
await send('Runtime.enable');
await send('Log.enable');
await send('Network.enable');
await send('Network.setCacheDisabled', {cacheDisabled:true});
await send('Emulation.setDeviceMetricsOverride', {width:1280,height:800,deviceScaleFactor:1,mobile:false});
if (mode === 'offline-dependencies' || mode === 'stalled-textures') await send('Network.setBlockedURLs', {urls:['*cdn.jsdelivr.net*','*unpkg.com*','*raw.githubusercontent.com*']});
else if (mode === 'failed-boot') await send('Network.setBlockedURLs', {urls:['*/vendor/gsap.js']});
else await send('Network.setBlockedURLs', {urls:[]});
if (mode === 'stalled-textures') await send('Fetch.enable', {patterns:[{urlPattern:'*/assets/*',requestStage:'Request'}]});
await send('Page.navigate', {url});
await new Promise(resolve => setTimeout(resolve, 18000));
const state = await send('Runtime.evaluate', {expression:`JSON.stringify({title:document.title,canvas:!!document.querySelector('#app canvas'),status:document.getElementById('load-status')?.textContent,ready:document.documentElement.dataset.earthReady,resources:performance.getEntriesByType('resource').map(r=>({url:r.name,duration:Math.round(r.duration)}))})`,returnByValue:true});
console.log(JSON.stringify({state:JSON.parse(state.result.value),events},null,2));
if (mode !== 'inspect' && mode !== 'failed-boot') {
  const pixels = await send('Runtime.evaluate', {expression:`new Promise(resolve => requestAnimationFrame(() => { const source=document.querySelector('#app canvas'); if(!source) { resolve(0); return; } const c=document.createElement('canvas');c.width=320;c.height=200;const ctx=c.getContext('2d');ctx.drawImage(source,0,0,320,200);const data=ctx.getImageData(80,30,160,140).data;let count=0;for(let i=0;i<data.length;i+=4){if(Math.max(data[i],data[i+1],data[i+2])>25)count++;}resolve(count); }))`,awaitPromise:true,returnByValue:true});
  console.log('Visible Earth pixels:', pixels.result.value);
  assert.ok(pixels.result.value > 300, 'Earth must produce visible pixels, not only a blank canvas');
  const actions=await send('Runtime.evaluate',{expression:`JSON.stringify([...document.querySelectorAll('.nav-btn')].map(btn=>{btn.click();return btn.dataset.action;}))`,returnByValue:true});
  console.log('Interactions exercised:',actions.result.value);
  await send('Emulation.setDeviceMetricsOverride', {width:390,height:844,deviceScaleFactor:1,mobile:true});
  await new Promise(resolve=>setTimeout(resolve,800));
  await send('Emulation.setDeviceMetricsOverride', {width:1280,height:800,deviceScaleFactor:1,mobile:false});
}
if (screenshot) {
  const shot = await send('Page.captureScreenshot', {format:'png'});
  await fs.writeFile(screenshot, Buffer.from(shot.data, 'base64'));
}
await send('Network.setBlockedURLs', {urls:[]});
await send('Fetch.disable');
ws.close();
if (mode === 'offline-dependencies' || mode === 'stalled-textures') {
  assert.equal(JSON.parse(state.result.value).ready, 'true', 'Earth must render even when external CDNs are blocked');
  assert.equal(events.filter(e => e.method === 'Runtime.exceptionThrown').length, 0, 'No browser exceptions');
}
if (mode === 'failed-boot') assert.match(JSON.parse(state.result.value).status, /加载失败/, 'Startup failures must show a visible message');
