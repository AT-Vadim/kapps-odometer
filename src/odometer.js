/* MIT licensed. Built into Odometer/index.html; no runtime dependencies. */
(function (root) {
 'use strict';
 function normalize(data) {
   var info=data.DriverInfo||{}, weekend=data.WeekendInfo||{};
   var idx=data.PlayerCarIdx==null?info.DriverCarIdx:data.PlayerCarIdx;
   var driver=(info.Drivers||[]).find(function(d){return d.CarIdx===idx;});
   if(!driver||!Number.isInteger(driver.CarID)||driver.CarID<=0)return null;
   var valid=Number.isFinite(data.SessionTime)&&Number.isFinite(data.Speed)&&Math.abs(data.Speed)<=200;
   return {key:'car:'+driver.CarID,name:driver.CarScreenName||driver.CarPath||('Car '+driver.CarID),
     time:data.SessionTime,speed:Math.abs(data.Speed),
     session:JSON.stringify([weekend.SessionID,weekend.SubSessionID,weekend.TrackID,data.SessionNum]),
     driving:valid&&data.IsOnTrack===true&&data.IsOnTrackCar===true&&data.IsReplayPlaying===false&&
       data.IsInGarage===false&&data.PlayerCarTowTime===0&&!driver.IsSpectator&&String(weekend.SimMode).toLowerCase()!=='replay'};
 }
 function integrate(previous,sample,wall) {
   if(!sample||!sample.driving)return {meters:0,previous:null};
   var next={sample:sample,wall:wall}, meters=0;
   if(previous){
     var prior=previous.sample,dt=sample.time-prior.time,gap=wall-previous.wall;
     if(prior.key===sample.key&&prior.session===sample.session){
       if(dt===0&&gap>=0&&gap<=1000)return {meters:0,previous:previous};
       if(dt>0&&dt<=0.5&&gap>=0&&gap<=1000)meters=(prior.speed+sample.speed)*0.5*dt;
     }
   }
   return {meters:meters,previous:next};
 }
 function validate(data){
   if(!data||data.version!==1||!data.cars||typeof data.cars!=='object'||Array.isArray(data.cars))throw Error('Invalid odometer file');
   Object.keys(data.cars).forEach(function(key){var car=data.cars[key];
     if(!/^car:[1-9][0-9]*$/.test(key)||!car||typeof car.name!=='string'||!Number.isFinite(car.meters)||car.meters<0)throw Error('Invalid car record');
   });return data;
 }
 function openDatabase(seed){
   return new Promise(function(resolve,reject){
     var request=indexedDB.open('personal-iracing-odometer-v1',1);
     request.onupgradeneeded=function(){var store=request.result.createObjectStore('state');store.put(validate(seed),'totals');};
     request.onsuccess=function(){resolve(request.result);};request.onerror=function(){reject(request.error);};
   });
 }
 function readTotals(db){
   return new Promise(function(resolve,reject){var tx=db.transaction('state','readonly'),req=tx.objectStore('state').get('totals');
     req.onsuccess=function(){resolve(validate(req.result));};req.onerror=function(){reject(req.error);};
   });
 }
 function Collector(db,owner){this.db=db;this.owner=owner;this.previous=null;this.busy=false;}
 Collector.prototype.record=function(sample,wall){
   var self=this;if(self.busy)return Promise.resolve(null);self.busy=true;
   return new Promise(function(resolve,reject){
     var tx=self.db.transaction('state','readwrite'),store=tx.objectStore('state'),result=null,nextPrevious=null;
     tx.oncomplete=function(){self.previous=nextPrevious;self.busy=false;resolve(result);};
     tx.onabort=tx.onerror=function(){self.previous=null;self.busy=false;reject(tx.error||Error('Storage transaction failed'));};
     var leaseRequest=store.get('lease');leaseRequest.onsuccess=function(){
       var lease=leaseRequest.result,leader=!lease||lease.owner===self.owner||lease.until<=wall;
       var totalsRequest=store.get('totals');totalsRequest.onsuccess=function(){
         var totals;
         try{totals=validate(totalsRequest.result);}catch(e){tx.abort();return;}
         if(leader&&sample){
           var car=totals.cars[sample.key];
           if(!car)car=totals.cars[sample.key]={name:sample.name,meters:0};
           car.name=sample.name;
           var addition=integrate(lease&&lease.owner===self.owner?self.previous:null,sample,wall);
           car.meters+=addition.meters;nextPrevious=addition.previous;
           store.put(totals,'totals');store.put({owner:self.owner,until:wall+2000},'lease');
         }
         var active=sample&&totals.cars[sample.key];
         if(active)result={car_key:sample.key,car_name:active.name,meters:active.meters};
       };
     };
   });
 };
 function importTotals(db,incoming){
   validate(incoming);
   return new Promise(function(resolve,reject){var tx=db.transaction('state','readwrite'),store=tx.objectStore('state'),req=store.get('totals');
     req.onsuccess=function(){var totals=validate(req.result);Object.keys(incoming.cars).forEach(function(key){
       if(!totals.cars[key]||totals.cars[key].meters<incoming.cars[key].meters)totals.cars[key]=incoming.cars[key];
     });store.put(totals,'totals');};tx.oncomplete=resolve;tx.onabort=tx.onerror=function(){reject(tx.error);};
   });
 }
 function manage(db){
   document.body.className='preview-page';document.getElementById('wrap').innerHTML='';
   var panel=document.createElement('main');panel.className='preview-wrap';panel.innerHTML='<h1>Per-car mileage</h1><p>Back up and restore mileage. This page does not record distance.</p><div class="demo-controls"><button id="export">Download backup</button><button id="import">Import JSON</button><input id="file" type="file" accept=".json,application/json" hidden></div><p id="message"></p><div id="cars"></div><p class="note">Storage belongs to the Kapps browser profile at 127.0.0.1:8182. Open this page in the same Kapps profile as your overlay. Import merges records and keeps the larger total for each car.</p>';
   document.body.appendChild(panel);
   function list(){readTotals(db).then(function(totals){var box=document.getElementById('cars');box.innerHTML='';Object.keys(totals.cars).sort().forEach(function(key){var car=totals.cars[key],row=document.createElement('p');row.textContent=car.name+' — '+(car.meters/1000).toFixed(3)+' km';box.appendChild(row);});}).catch(error);}
   function error(e){document.getElementById('message').textContent='Error: '+e.message;}
   document.getElementById('export').onclick=function(){readTotals(db).then(function(totals){var url=URL.createObjectURL(new Blob([JSON.stringify(totals,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='odometer-backup.json';a.click();setTimeout(function(){URL.revokeObjectURL(url);},10000);}).catch(error);};
   document.getElementById('import').onclick=function(){document.getElementById('file').click();};
   document.getElementById('file').onchange=function(){var file=this.files[0];if(!file)return;var reader=new FileReader();reader.onload=function(){try{importTotals(db,JSON.parse(reader.result)).then(function(){document.getElementById('message').textContent='Mileage imported.';list();}).catch(error);}catch(e){error(e);}};reader.readAsText(file);};list();
 }
 function start(render,seed){
   // One canonical origin prevents accidental separate counters for localhost and 127.0.0.1.
   if(location.hostname==='localhost'){location.replace(location.href.replace('localhost','127.0.0.1'));return;}
   openDatabase(seed).then(function(db){
     if(new URLSearchParams(location.search).get('manage')==='1'){manage(db);return;}
     var collector=new Collector(db,Date.now()+'-'+Math.random()),data={},latest=null,freshAt=0,lastTime=null,ws;
     function clear(){data={};latest=null;lastTime=null;collector.previous=null;}
     function connect(){
       ws=new WebSocket('ws://127.0.0.1:8182/ws');
       ws.onopen=function(){clear();ws.send(JSON.stringify({fps:20,readIbt:false,
         requestParams:['SessionTime','SessionNum','Speed','PlayerCarIdx','IsOnTrack','IsOnTrackCar','IsReplayPlaying','IsInGarage','PlayerCarTowTime','DriverInfo','WeekendInfo'],requestParamsOnce:[]}));};
       ws.onmessage=function(event){try{var msg=JSON.parse(event.data);if(msg.disconnected){clear();return;}if(msg.connected)clear();
         if(msg.data){Object.keys(msg.data).forEach(function(k){data[k]=msg.data[k];});latest=normalize(data);
           if(data.SessionTime!==lastTime){lastTime=data.SessionTime;freshAt=Date.now();}}
       }catch(e){clear();console.error('Odometer telemetry:',e);}};
       ws.onclose=function(){clear();setTimeout(connect,2000);};ws.onerror=function(){ws.close();};
     }
     connect();
     setInterval(function(){var sample=latest;if(!sample||Date.now()-freshAt>1000){collector.previous=null;return;}
       collector.record(sample,Date.now()).then(function(value){if(value)render(value);}).catch(function(e){console.error('Odometer storage:',e);});
     },100);
   }).catch(function(e){console.error('Odometer storage unavailable; recording stopped:',e);});
 }
 var api={normalize:normalize,integrate:integrate,validate:validate,Collector:Collector,openDatabase:openDatabase,readTotals:readTotals,importTotals:importTotals,start:start};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.KappsOdometer=api;
})(typeof window!=='undefined'?window:globalThis);
