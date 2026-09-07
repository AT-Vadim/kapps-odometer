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
 assert.equal(await run('typeof KappsOdometer.start'),'function');
 const tested=await run(`(async()=>{
   var a=KappsOdometer,db=await a.openDatabase({version:1,cars:{}});
   await new Promise((r,j)=>{var tx=db.transaction('state','readwrite');tx.objectStore('state').delete('lease');tx.oncomplete=r;tx.onerror=j;});
   var left=new a.Collector(db,'qa-left'),right=new a.Collector(db,'qa-right');
   var key='car:999998',s={key:key,name:'QA synthetic car',time:0,speed:20,session:'qa',driving:true};
   var start=(await a.readTotals(db)).cars[key]?.meters||0;
   await left.record(s,1e15);await left.record({...s,time:.1},1e15+100);
   await right.record({...s,time:.1},1e15+100);
   await right.record({...s,time:.2},1e15+200);
   await left.record({...s,time:.2},1e15+200);
   var distance=(await a.readTotals(db)).cars[key].meters-start;
   await right.record({...s,time:3},1e15+3000);
   await right.record({...s,time:3.1},1e15+3100);
   var takeover=(await a.readTotals(db)).cars[key].meters-start;
   var restored=await a.readTotals(await a.openDatabase({version:1,cars:{}}));
   await a.importTotals(db,{version:1,cars:{[key]:{name:'QA',meters:0}}});
   var afterImport=(await a.readTotals(db)).cars[key].meters-start;
   return {distance,takeover,restored:restored.cars[key].meters-start,afterImport};
 })()`);
 assert.ok(Math.abs(tested.distance-4)<1e-6);assert.ok(Math.abs(tested.takeover-6)<1e-6);assert.ok(Math.abs(tested.restored-6)<1e-6);assert.ok(Math.abs(tested.afterImport-6)<1e-6);
 await send('Emulation.setDeviceMetricsOverride',{width:370,height:100,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:'http://127.0.0.1:8192/Odometer/?demo=1'});await new Promise(r=>setTimeout(r,800));
 assert.equal(await run('document.querySelectorAll("#car,#state,#status").length'),0);
 assert.equal(await run('getComputedStyle(document.querySelector(".meter")).backgroundColor'),'rgba(14, 19, 23, 0.7)');
 assert.deepEqual(errors,[]);
 await send('Emulation.setDefaultBackgroundColorOverride',{color:{r:0,g:0,b:0,a:0}});
 const shot=await send('Page.captureScreenshot',{format:'png',clip:{x:0,y:0,width:370,height:95,scale:2}});
 fs.writeFileSync('docs/preview.png',Buffer.from(shot.data,'base64'));
 socket.close();
 console.log('Browser storage checks passed: one writer, failover, reopen, import merge, labels removed, background alpha 0.7.');

})().catch(e=>{console.error(e);process.exit(1);});
