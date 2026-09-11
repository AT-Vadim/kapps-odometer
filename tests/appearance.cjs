const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const tabs=await(await fetch('http://127.0.0.1:9228/json')).json(),tab=tabs.find(t=>t.url.includes(':8192/Odometer/'));
 const socket=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});
 let id=0;const pending=new Map(),errors=[];
 socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params);if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.j(m.error):p.r(m.result);}};
 function send(method,params={}){return new Promise((r,j)=>{const key=++id;pending.set(key,{r,j});socket.send(JSON.stringify({id:key,method,params}));});}
 async function run(expression){const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));return result.result.value;}
 await send('Runtime.enable');
 await send('Network.enable');await send('Network.setBlockedURLs',{urls:['ws://127.0.0.1:8182/*']});
 await send('Emulation.setDeviceMetricsOverride',{width:1000,height:850,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:'http://127.0.0.1:8192/Odometer/?manage=1'});await new Promise(r=>setTimeout(r,500));
 assert.equal(await run('document.querySelectorAll("#appearance-style option").length'),4);
 await run(`document.getElementById('appearance-style').value='electronic';document.getElementById('appearance-style').dispatchEvent(new Event('change'));`);
 await new Promise(r=>setTimeout(r,250));
 assert.equal(await run('document.querySelector(".appearance-preview .meter").dataset.style'),'electronic');
 const totalsBefore=await run('KappsOdometer.openDatabase({version:1,cars:{}}).then(KappsOdometer.readTotals)');
 await send('Page.reload');await new Promise(r=>setTimeout(r,500));
 assert.equal(await run('document.getElementById("appearance-style").value'),'electronic');
 // A second browsing context in the same profile picks up subsequent changes.
 await run(`window.appearanceFrame=document.createElement('iframe');appearanceFrame.src='/Odometer/';document.body.appendChild(appearanceFrame);`);
 await new Promise(r=>setTimeout(r,600));
 assert.equal(await run('appearanceFrame.contentDocument.querySelector(".meter").dataset.style'),'electronic');
 await run(`document.getElementById('appearance-style').value='mechanical';document.getElementById('appearance-style').dispatchEvent(new Event('change'));`);
 await new Promise(r=>setTimeout(r,1200));
 assert.equal(await run('appearanceFrame.contentDocument.querySelector(".meter").dataset.style'),'mechanical');
 await run('appearanceFrame.remove()');
 const result=await run(`(async()=>{
   var sleep=ms=>new Promise(r=>setTimeout(r,ms)),a=KappsAppearance,db=await KappsOdometer.openDatabase({version:1,cars:{}});
   var fixture=document.createElement('section');fixture.className='meter';fixture.innerHTML='<div class="reading"><div class="digits"></div><span class="unit">km</span></div>';document.body.appendChild(fixture);
   var r=createOdometerRenderer(fixture);r.setStyle('mechanical');r({meters:990,car_key:'test'});
   var hundred=()=>Number(fixture.querySelector('.wheel-column:last-child .strip').dataset.position);
   var integer=()=>fixture.querySelectorAll('.wheel-column')[5].querySelector('.strip');
   var initial=hundred();r({meters:995,car_key:'test'});await sleep(40);var midway=hundred();await sleep(170);var end=hundred();var kmBefore=integer().firstChild.textContent;
   r({meters:1005,car_key:'test'});await sleep(350);var wrapped=hundred(),carry=integer().lastChild.textContent;
   await sleep(350);var kmAfter=integer().firstChild.textContent;var held=hundred();await sleep(180);var heldAgain=hundred();
   r({meters:999990,car_key:'carry'});r({meters:1000005,car_key:'carry'});await sleep(650);var cascade=Array.from(fixture.querySelectorAll('.wheel-column')).slice(0,-1).map(c=>c.querySelector('.strip').firstChild.textContent).join('');
   r({meters:2500,car_key:'different'});var switched=hundred();r.setStyle('electronic');r({meters:2600,car_key:'different'});var flashing=fixture.querySelectorAll('.pixel-change').length;
   r({meters:2600,car_key:'different'});var pixels=fixture.querySelectorAll('.pixel-digit').length;
   var tx=db.transaction('state','readwrite');tx.objectStore('state').delete('pixelFlickerAt');await new Promise(resolve=>tx.oncomplete=resolve);
   var first=await a.claimFlicker(db,1000000),blocked=await a.claimFlicker(db,1299999),allowed=await a.claimFlicker(db,1300000);
   var recorded=[],native=setTimeout;window.setTimeout=function(fn,delay){if(delay>=300000)recorded.push(delay);return native(fn,delay);};var extra=createOdometerRenderer(fixture);window.setTimeout=native;extra.destroy();r.destroy();fixture.remove();
   return {initial,midway,end,kmBefore,wrapped,carry,kmAfter,held,heldAgain,cascade,switched,flashing,pixels,first,blocked,allowed,recorded};
 })()`);
 assert.equal(result.initial,9.9);assert.ok(result.midway>9.9&&result.midway<9.95);assert.ok(Math.abs(result.end-9.95)<1e-6);
 assert.equal(result.kmBefore,'0');assert.ok(Math.abs(result.wrapped-.05)<1e-6);assert.equal(result.carry,'1');assert.equal(result.kmAfter,'1');assert.equal(result.held,result.heldAgain);
 assert.equal(result.cascade,'001000');assert.equal(result.switched,5);assert.equal(result.flashing,1);assert.equal(result.pixels,7);
 assert.equal(result.first,true);assert.equal(result.blocked,false);assert.equal(result.allowed,true);assert.ok(result.recorded[0]>=300000&&result.recorded[0]<600000);
 const totalsAfter=await run('KappsOdometer.openDatabase({version:1,cars:{}}).then(KappsOdometer.readTotals)');assert.deepEqual(totalsAfter,totalsBefore);
 // Selecting the new style applies its palette while keeping the user's opacity.
 await run(`document.getElementById('background-opacity').value='35';document.getElementById('background-opacity').dispatchEvent(new Event('input'));document.getElementById('appearance-style').value='iracing';document.getElementById('appearance-style').dispatchEvent(new Event('change'));`);
 await new Promise(r=>setTimeout(r,300));await send('Page.reload');await new Promise(r=>setTimeout(r,500));
 assert.equal(await run('document.getElementById("appearance-style").value'),'iracing');
 assert.equal(await run('document.getElementById("background-hex").value'),'#232633');
 assert.equal(await run('document.getElementById("background-opacity").value'),'35');
 assert.equal(await run('getComputedStyle(document.querySelector(".appearance-preview .meter")).backgroundColor'),'rgba(35, 38, 51, 0.35)');
 assert.equal(await run('getComputedStyle(document.querySelector(".appearance-preview .digit:last-child")).backgroundColor'),'rgb(255, 203, 0)');
 assert.equal(await run('document.querySelector(".appearance-preview .point").textContent'),'.');
 assert.ok(await run('document.querySelector(".setup-help").textContent.includes("Apply")'));
 await run(`document.getElementById('reset-background').click()`);await new Promise(r=>setTimeout(r,200));
 assert.equal(await run('document.getElementById("background-hex").value'),'#232633');
 assert.equal(await run('document.getElementById("background-opacity").value'),'70');
 assert.deepEqual(await run('KappsOdometer.openDatabase({version:1,cars:{}}).then(KappsOdometer.readTotals)'),totalsBefore);
 const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('docs/settings.png',Buffer.from(shot.data,'base64'));
 await send('Emulation.setDeviceMetricsOverride',{width:370,height:100,deviceScaleFactor:1,mobile:false});
 for(const style of ['electronic','mechanical','iracing']){
   await send('Page.navigate',{url:'http://127.0.0.1:8192/Odometer/?demo=1&style='+style});await new Promise(r=>setTimeout(r,350));
   await send('Emulation.setDefaultBackgroundColorOverride',{color:{r:0,g:0,b:0,a:0}});
   const shot=await send('Page.captureScreenshot',{format:'png',clip:{x:0,y:0,width:370,height:100,scale:2}});fs.writeFileSync('docs/'+style+'.png',Buffer.from(shot.data,'base64'));
 }
 assert.deepEqual(errors,[]);socket.close();console.log('Appearance checks passed: settings/reload/live sync; continuous 100 m wheel, carry, stop, car switch; pixel change flash; 5-minute cooldown; mileage unchanged.');
})().catch(e=>{console.error(e);process.exit(1);});
