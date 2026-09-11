/* Shared appearance preferences live beside mileage, without altering totals. */
(function(root){
 'use strict';
 var styles=['minimal','electronic','mechanical','iracing'];
 var defaults={style:'minimal',backgroundColor:'#0e1317',backgroundOpacity:70};
 function normalize(value){value=value||{};return {
   style:styles.indexOf(value.style)>=0?value.style:defaults.style,
   backgroundColor:/^#[0-9a-f]{6}$/i.test(value.backgroundColor||'')?value.backgroundColor.toLowerCase():defaults.backgroundColor,
   backgroundOpacity:typeof value.backgroundOpacity==='number'&&Number.isFinite(value.backgroundOpacity)?Math.max(0,Math.min(100,value.backgroundOpacity)):defaults.backgroundOpacity
 };}
 function apply(render,value){render.setStyle(value.style);render.setBackground(value.backgroundColor,value.backgroundOpacity);}
 function read(db){return new Promise(function(resolve,reject){
   var req=db.transaction('state','readonly').objectStore('state').get('appearance');
   req.onsuccess=function(){resolve(normalize(req.result));};req.onerror=function(){reject(req.error);};
 });}
 function save(db,patch){return new Promise(function(resolve,reject){
   if(typeof patch==='string')patch={style:patch};
   if(!patch||typeof patch!=='object'){reject(Error('Invalid appearance settings'));return;}
   if(patch.style!==undefined&&styles.indexOf(patch.style)<0){reject(Error('Unknown appearance style'));return;}
   if(patch.backgroundColor!==undefined&&!/^#[0-9a-f]{6}$/i.test(patch.backgroundColor)){reject(Error('Use a six-digit hex colour'));return;}
   if(patch.backgroundOpacity!==undefined&&(typeof patch.backgroundOpacity!=='number'||!Number.isFinite(patch.backgroundOpacity)||patch.backgroundOpacity<0||patch.backgroundOpacity>100)){reject(Error('Opacity must be between 0 and 100'));return;}
   var result,tx=db.transaction('state','readwrite'),store=tx.objectStore('state'),req=store.get('appearance');
   req.onsuccess=function(){result=normalize(Object.assign({},normalize(req.result),patch));store.put(result,'appearance');};
   tx.oncomplete=function(){resolve(result);};tx.onabort=tx.onerror=function(){reject(tx.error);};
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
   function refresh(){if(busy||disposed)return;busy=true;read(db).then(function(value){if(!disposed)apply(render,value);}).catch(function(e){console.error('Odometer appearance:',e);}).finally(function(){busy=false;});}
   refresh();var timer=setInterval(refresh,1000);
   return function(){disposed=true;clearInterval(timer);};
 }
 function mount(db,panel){
   var ru=(navigator.language||'').toLowerCase().indexOf('ru')===0;
   var section=document.createElement('section');section.className='appearance-settings';
   section.innerHTML='<h2>'+(ru?'Оформление одометра':'Odometer appearance')+'</h2><label for="appearance-style">'+(ru?'Стиль':'Style')+'</label><select id="appearance-style"><option value="minimal">'+(ru?'Минималистичный':'Minimal')+'</option><option value="electronic">'+(ru?'Электронный · пиксели':'Electronic · pixels')+'</option><option value="mechanical">'+(ru?'Механический · колёсики':'Mechanical · wheels')+'</option><option value="iracing">'+(ru?'iRacing · классический':'iRacing · classic')+'</option></select><p class="appearance-help"></p><div class="appearance-preview"><section class="meter" aria-label="Appearance preview"><div class="reading"><div class="digits"></div><span class="unit">km</span></div></section></div><p class="note">'+(ru?'Предпросмотр на вымышленных данных. Выбор сохраняется автоматически для всех машин и открытых виджетов в этом профиле Kapps.':'Preview uses synthetic mileage. Selection is saved automatically for all cars and open widgets in this Kapps profile.')+'</p><p class="appearance-message" role="status"></p>';
   panel.insertBefore(section,panel.querySelector('.demo-controls'));
   var select=section.querySelector('select'),message=section.querySelector('.appearance-message'),render=root.createOdometerRenderer(section.querySelector('.meter'));
   var controls=document.createElement('div');controls.className='background-controls';
   controls.innerHTML='<div class="background-field"><label for="background-color">'+(ru?'Цвет фона':'Background colour')+'</label><div class="colour-inputs"><input id="background-color" type="color" value="#0e1317"><input id="background-hex" type="text" value="#0e1317" maxlength="7" pattern="#[0-9a-fA-F]{6}" aria-label="Hex colour" spellcheck="false"></div></div><div class="background-field"><label for="background-opacity">'+(ru?'Непрозрачность фона':'Background opacity')+' <output id="opacity-value">70%</output></label><input id="background-opacity" type="range" min="0" max="100" step="1" value="70"></div><button id="reset-background" type="button">'+(ru?'Сбросить фон':'Reset background')+'</button><p class="note">'+(ru?'Меняется только фон панели: цифры остаются непрозрачными. Размер одометра меняйте в Kapps — он автоматически впишется в выделенную ширину и высоту с сохранением пропорций. Страница статистики не масштабируется.':'Only the panel background changes; digits remain opaque. Resize the odometer window in Kapps: it fits the assigned width and height while preserving proportions. This statistics page is not scaled.')+'</p>';
   section.insertBefore(controls,section.querySelector('.appearance-preview'));
   var color=controls.querySelector('#background-color'),hex=controls.querySelector('#background-hex'),opacity=controls.querySelector('#background-opacity'),output=controls.querySelector('#opacity-value'),reset=controls.querySelector('#reset-background');
   var current=normalize(),ready=false,revision=0,meters=1299700,last=performance.now();
   render.setFlickerGate(function(){return claimFlicker(db,Date.now());});
   var inputs=[select,color,hex,opacity,reset];inputs.forEach(function(input){input.disabled=true;});
   function sync(){select.value=current.style;color.value=hex.value=current.backgroundColor;opacity.value=current.backgroundOpacity;output.textContent=current.backgroundOpacity+'%';apply(render,current);help(current.style);}
   function update(patch){if(!ready)return;current=normalize(Object.assign({},current,patch));sync();revision++;message.textContent=ru?'Сохранение…':'Saving…';
     var ticket=revision,value=Object.assign({},current);
     save(db,value).then(function(){if(ticket===revision)message.textContent=ru?'Сохранено':'Saved';}).catch(function(e){if(ticket===revision)message.textContent=e.message;});
   }
   function help(style){section.querySelector('.appearance-help').textContent=({
     minimal:ru?'Плавная прокрутка цифр каждые 100 метров.':'Digits roll every 100 metres.',
     electronic:ru?'Изменившаяся цифра кратко мигает. Редкое подмигивание части цифры — раз в 5–10 минут, не чаще одного раза за 5 минут.':'Changed digits blink briefly. A small part of one digit flickers every 5–10 minutes, never more than once per 5 minutes.',
     iracing:ru?'Палитра из референса iRacing: тёмный фон, белые цифры и жёлтые акценты. Выбор стиля устанавливает фон #232633, сохраняя opacity.':'Palette matched to the iRacing reference: charcoal, white digits and yellow accents. Selecting this style sets background #232633 and preserves opacity.',
     mechanical:ru?'Колёсико 100 м вращается непрерывно по пройденному расстоянию. Километры переключаются после накопления целого километра.':'The 100 m wheel rolls continuously with measured distance. Kilometre wheels advance when a whole kilometre is reached.'
   })[style];}
   read(db).then(function(value){current=value;ready=true;sync();inputs.forEach(function(input){input.disabled=false;});}).catch(function(e){message.textContent=e.message;});
   select.onchange=function(){var patch={style:select.value};if(select.value==='iracing')patch.backgroundColor='#232633';update(patch);};
   color.oninput=color.onchange=function(){hex.setCustomValidity('');update({backgroundColor:color.value});};
   hex.oninput=function(){if(/^#[0-9a-f]{6}$/i.test(hex.value)){hex.setCustomValidity('');update({backgroundColor:hex.value});}else hex.setCustomValidity(ru?'Введите цвет в формате #12ab34':'Use a colour such as #12ab34');};
   opacity.oninput=opacity.onchange=function(){update({backgroundOpacity:Number(opacity.value)});};
   reset.onclick=function(){hex.setCustomValidity('');update({backgroundColor:current.style==='iracing'?'#232633':defaults.backgroundColor,backgroundOpacity:defaults.backgroundOpacity});};
   render({meters:meters,car_key:'appearance-preview'});
   var timer=setInterval(function(){var now=performance.now();meters+=30*Math.min((now-last)/1000,.25);last=now;render({meters:meters,car_key:'appearance-preview'});},100);
   window.addEventListener('pagehide',function(){clearInterval(timer);render.destroy();},{once:true});
 }
 root.KappsAppearance={normalize:normalize,read:read,save:save,watch:watch,mount:mount,claimFlicker:claimFlicker};
})(window);
