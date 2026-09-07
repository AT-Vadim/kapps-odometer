const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const tabs=await(await fetch('http://127.0.0.1:9228/json')).json(),tab=tabs.find(t=>t.url.includes(':8192/Odometer/'));
 const socket=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});
 let id=0;const pending=new Map(),errors=[];
 socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params);if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.j(m.error):p.r(m.result);}};
 function send(method,params={}){return new Promise((r,j)=>{const key=++id;pending.set(key,{r,j});socket.send(JSON.stringify({id:key,method,params}));});}
 async function run(expression){const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));return result.result.value;}
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 await send('Runtime.enable');await send('Network.enable');await send('Network.setBlockedURLs',{urls:['ws://127.0.0.1:8182/*']});
 await send('Emulation.setDeviceMetricsOverride',{width:1000,height:1000,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:'http://127.0.0.1:8192/Odometer/?manage=1'});await wait(600);
 const migration=await run(`(async()=>{var db=await KappsOdometer.openDatabase({version:1,cars:{}});await new Promise(r=>{var tx=db.transaction('state','readwrite');tx.objectStore('state').put({style:'mechanical'},'appearance');tx.oncomplete=r;});return KappsAppearance.read(db);})()`);
 assert.deepEqual(migration,{style:'mechanical',backgroundColor:'#0e1317',backgroundOpacity:70});
 await send('Page.reload');await wait(500);
 const before=await run('KappsOdometer.openDatabase({version:1,cars:{}}).then(KappsOdometer.readTotals)');
 await run(`document.getElementById('background-hex').value='#1268ab';document.getElementById('background-hex').dispatchEvent(new Event('input'));document.getElementById('background-opacity').value='35';document.getElementById('background-opacity').dispatchEvent(new Event('input'));`);
 assert.equal(await run('getComputedStyle(document.querySelector(".appearance-preview .meter")).backgroundColor'),'rgba(18, 104, 171, 0.35)');
 assert.equal(await run('getComputedStyle(document.querySelector(".appearance-preview .digits")).opacity'),'1');
 await wait(300);await send('Page.reload');await wait(500);
 assert.equal(await run('document.getElementById("background-hex").value'),'#1268ab');assert.equal(await run('document.getElementById("background-opacity").value'),'35');
 assert.equal(await run('document.body.classList.contains("overlay-page")'),false);
 assert.equal(await run('getComputedStyle(document.querySelector(".appearance-preview .meter")).transform'),'none');
 await run(`window.widget=document.createElement('iframe');widget.style.width='500px';widget.style.height='120px';widget.src='/Odometer/';document.body.appendChild(widget);`);await wait(700);
 assert.equal(await run('getComputedStyle(widget.contentDocument.querySelector(".meter")).backgroundColor'),'rgba(18, 104, 171, 0.35)');
 await run(`document.getElementById('background-opacity').value='0';document.getElementById('background-opacity').dispatchEvent(new Event('input'));`);await wait(1400);
 assert.equal(await run('getComputedStyle(widget.contentDocument.querySelector(".meter")).backgroundColor'),'rgba(18, 104, 171, 0)');
 assert.equal(await run('getComputedStyle(widget.contentDocument.querySelector(".digits")).opacity'),'1');
 await run(`document.getElementById('background-opacity').value='100';document.getElementById('background-opacity').dispatchEvent(new Event('input'));`);await wait(300);
 assert.equal(await run('getComputedStyle(document.querySelector(".appearance-preview .meter")).backgroundColor'),'rgb(18, 104, 171)');
 const merge=await run(`(async()=>{var db=await KappsOdometer.openDatabase({version:1,cars:{}});await KappsAppearance.save(db,'electronic');return KappsAppearance.read(db);})()`);
 assert.deepEqual(merge,{style:'electronic',backgroundColor:'#1268ab',backgroundOpacity:100});
 await run(`widget.remove();document.getElementById('reset-background').click();`);await wait(300);
 assert.equal(await run('document.getElementById("background-hex").value'),'#0e1317');assert.equal(await run('document.getElementById("background-opacity").value'),'70');
 const after=await run('KappsOdometer.openDatabase({version:1,cars:{}}).then(KappsOdometer.readTotals)');assert.deepEqual(after,before);
 const managementShot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('docs/settings.png',Buffer.from(managementShot.data,'base64'));
 for(const style of ['minimal','electronic','mechanical']){
   await send('Page.navigate',{url:'http://127.0.0.1:8192/Odometer/?demo=1&style='+style});await wait(200);
   for(const [width,height] of [[370,100],[740,200],[125,30],[160,300],[1200,45]]){
     await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await wait(120);
     const box=await run(`(()=>{var m=document.querySelector('.meter'),b=m.getBoundingClientRect();return {left:b.left,top:b.top,right:b.right,bottom:b.bottom,width:b.width,height:b.height,ratio:m.offsetWidth/m.offsetHeight,scroll:document.documentElement.scrollWidth};})()`);
     assert.ok(box.left>=-.1&&box.top>=-.1&&box.right<=width+.1&&box.bottom<=height+.1,JSON.stringify({style,width,height,box}));
     assert.ok(Math.abs(box.width/box.height-box.ratio)<.001,'proportions preserved');
     assert.ok(Math.abs(box.width-width)<.1||Math.abs(box.height-height)<.1,'one dimension uses the available pixels');
     assert.ok(box.scroll<=width,'no horizontal scrollbar');
   }
 }
 assert.deepEqual(errors,[]);socket.close();console.log('Background/layout checks passed: legacy settings migration, colour/alpha persistence, live sync, 0/100% opacity, opaque digits, reset, 15 style/size combinations, statistics not scaled, mileage unchanged.');
})().catch(e=>{console.error(e);process.exit(1);});
