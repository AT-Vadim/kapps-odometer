/* Shared appearance preferences live beside mileage, without altering totals. */
(function(root){
 'use strict';
 var styles=['minimal','electronic','mechanical'];
 function read(db){return new Promise(function(resolve,reject){
   var req=db.transaction('state','readonly').objectStore('state').get('appearance');
   req.onsuccess=function(){var value=req.result||{};resolve({style:styles.indexOf(value.style)>=0?value.style:'minimal'});};req.onerror=function(){reject(req.error);};
 });}
 function save(db,style){return new Promise(function(resolve,reject){
   if(styles.indexOf(style)<0){reject(Error('Unknown appearance style'));return;}
   var tx=db.transaction('state','readwrite');tx.objectStore('state').put({style:style},'appearance');
   tx.oncomplete=resolve;tx.onabort=tx.onerror=function(){reject(tx.error);};
 });}
 // The transaction enforces one rare effect per storage profile in any 5-minute window.
 function claimFlicker(db,now){return new Promise(function(resolve,reject){
   var allowed=false,tx=db.transaction('state','readwrite'),store=tx.objectStore('state'),req=store.get('pixelFlickerAt');
   req.onsuccess=function(){var last=req.result;if(last==null||now-last>=300000){store.put(now,'pixelFlickerAt');allowed=true;}};
   tx.oncomplete=function(){resolve(allowed);};tx.onabort=tx.onerror=function(){reject(tx.error);};
 });}
 function watch(db,render){
   var disposed=false,busy=false;
   render.setFlickerGate(function(){return claimFlicker(db,Date.now());});
   function refresh(){if(busy||disposed)return;busy=true;read(db).then(function(value){if(!disposed)render.setStyle(value.style);}).catch(function(e){console.error('Odometer appearance:',e);}).finally(function(){busy=false;});}
   refresh();var timer=setInterval(refresh,1000);
   return function(){disposed=true;clearInterval(timer);};
 }
 function mount(db,panel){
   var ru=(navigator.language||'').toLowerCase().indexOf('ru')===0;
   var section=document.createElement('section');section.className='appearance-settings';
   section.innerHTML='<h2>'+(ru?'Оформление одометра':'Odometer appearance')+'</h2><label for="appearance-style">'+(ru?'Стиль':'Style')+'</label><select id="appearance-style"><option value="minimal">'+(ru?'Минималистичный':'Minimal')+'</option><option value="electronic">'+(ru?'Электронный · пиксели':'Electronic · pixels')+'</option><option value="mechanical">'+(ru?'Механический · колёсики':'Mechanical · wheels')+'</option></select><p class="appearance-help"></p><div class="appearance-preview"><section class="meter" aria-label="Appearance preview"><div class="reading"><div class="digits"></div><span class="unit">km</span></div></section></div><p class="note">'+(ru?'Предпросмотр на вымышленных данных. Выбор сохраняется автоматически для всех машин и открытых виджетов в этом профиле Kapps.':'Preview uses synthetic mileage. Selection is saved automatically for all cars and open widgets in this Kapps profile.')+'</p><p class="appearance-message" role="status"></p>';
   panel.insertBefore(section,panel.querySelector('.demo-controls'));
   var select=section.querySelector('select'),message=section.querySelector('.appearance-message'),render=root.createOdometerRenderer(section.querySelector('.meter'));
   var unwatch=watch(db,render),saving=false,meters=1299700,last=performance.now();
   function help(style){section.querySelector('.appearance-help').textContent=({
     minimal:ru?'Плавная прокрутка цифр каждые 100 метров.':'Digits roll every 100 metres.',
     electronic:ru?'Изменившаяся цифра кратко мигает. Редкое подмигивание части цифры — раз в 5–10 минут, не чаще одного раза за 5 минут.':'Changed digits blink briefly. A small part of one digit flickers every 5–10 minutes, never more than once per 5 minutes.',
     mechanical:ru?'Колёсико 100 м вращается непрерывно по пройденному расстоянию. Километры переключаются после накопления целого километра.':'The 100 m wheel rolls continuously with measured distance. Kilometre wheels advance when a whole kilometre is reached.'
   })[style];}
   read(db).then(function(value){select.value=value.style;render.setStyle(value.style);help(value.style);}).catch(function(e){message.textContent=e.message;});
   select.onchange=function(){var style=select.value;if(saving)return;saving=true;select.disabled=true;
     save(db,style).then(function(){render.setStyle(style);help(style);message.textContent=ru?'Сохранено':'Saved';}).catch(function(e){message.textContent=e.message;}).finally(function(){saving=false;select.disabled=false;});
   };
   render({meters:meters,car_key:'appearance-preview'});
   var timer=setInterval(function(){var now=performance.now();meters+=30*Math.min((now-last)/1000,.25);last=now;render({meters:meters,car_key:'appearance-preview'});},100);
   window.addEventListener('pagehide',function(){clearInterval(timer);unwatch();render.destroy();},{once:true});
 }
 root.KappsAppearance={read:read,save:save,watch:watch,mount:mount,claimFlicker:claimFlicker};
})(window);
