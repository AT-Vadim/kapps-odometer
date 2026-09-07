/* Three renderers share the same measured distance; visuals never change totals. */
window.createOdometerRenderer = function(meter){
 'use strict';
 meter=meter||document.querySelector('.meter');
 var digits=meter.querySelector('.digits'),cells=[],shown='',active=null,style='minimal';
 var latest={meters:0,car_key:null},displayed=0,from=0,target=0,startAt=0,duration=110,lastInput=0,frame=null,destroyed=false;
 var rareTimer=null,rareGate=function(){return Promise.resolve(true);};
 var reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 var glyphs=[
 ['01110','10001','10011','10101','11001','10001','01110'],
 ['00100','01100','00100','00100','00100','00100','01110'],
 ['01110','10001','00001','00010','00100','01000','11111'],
 ['11110','00001','00001','01110','00001','00001','11110'],
 ['00010','00110','01010','10010','11111','00010','00010'],
 ['11111','10000','10000','11110','00001','00001','11110'],
 ['01110','10000','10000','11110','10001','10001','01110'],
 ['11111','00001','00010','00100','01000','01000','01000'],
 ['01110','10001','10001','01110','10001','10001','01110'],
 ['01110','10001','10001','01111','00001','00001','01110']
 ];
 function textFor(meters){var value=Math.floor(meters/100);return String(Math.floor(value/10)).padStart(6,'0')+'.'+value%10;}
 function clearCells(){cells.forEach(function(c){if(c)clearTimeout(c.timer);});cells=[];digits.innerHTML='';shown='';}
 function makeStrip(el,text,height){
   var strip=document.createElement('span');strip.className='strip';
   var a=document.createElement('span'),b=document.createElement('span');a.textContent=text;b.textContent=text;
   strip.appendChild(a);strip.appendChild(b);el.appendChild(strip);
   return {strip:strip,a:a,b:b,timer:null,height:height};
 }
 function roll(cell,value,previous,instant){
   clearTimeout(cell.timer);cell.strip.classList.remove('animate');cell.strip.style.transform='translateY(0)';
   cell.a.textContent=instant?value:previous;cell.b.textContent=value;
   if(!instant&&!reduced.matches){
     void cell.strip.offsetHeight;cell.strip.classList.add('animate');cell.strip.style.transform='translateY(-'+cell.height+'px)';
     cell.timer=setTimeout(function(){cell.strip.classList.remove('animate');cell.a.textContent=value;cell.strip.style.transform='translateY(0)';},style==='mechanical'?340:280);
   }
 }
 function build(text){
   clearCells();
   for(var i=0;i<text.length;i++){
     var el=document.createElement('span');
     if(text[i]==='.'){
       el.className=style==='electronic'?'pixel-point':style==='mechanical'?'wheel-separator':'point';
       if(style==='minimal')el.textContent='.';
       cells.push(null);digits.appendChild(el);continue;
     }
     if(style==='electronic'){
       el.className='pixel-digit';var dots=[];
       for(var d=0;d<35;d++){var dot=document.createElement('i');dot.className='pixel';el.appendChild(dot);dots.push(dot);}
       cells.push({el:el,dots:dots,timer:null});
     }else if(style==='mechanical'){
       el.className='wheel-column';var wheel=document.createElement('span');wheel.className='wheel';el.appendChild(wheel);
       if(i===text.length-1){
         var strip=document.createElement('span');strip.className='strip';wheel.appendChild(strip);
         for(var row=-1;row<=10;row++){var num=document.createElement('span');num.textContent=(row+10)%10;strip.appendChild(num);}
         cells.push({strip:strip,continuous:true,timer:null});
       }else cells.push(makeStrip(wheel,text[i],42));
     }else{
       el.className='digit'+(i===text.length-5?' group':'');cells.push(makeStrip(el,text[i],44));
     }
     digits.appendChild(el);
   }
 }
 function paint(meters,instant){
   var text=textFor(meters);
   if(!cells.length||shown.length!==text.length){build(text);instant=true;}
   for(var i=0;i<text.length;i++){
     var c=cells[i];if(!c)continue;
     if(style==='electronic'){
       if(instant||text[i]!==shown[i]){
         var pattern=glyphs[Number(text[i])].join('');
         c.dots.forEach(function(dot,n){dot.className='pixel'+(pattern[n]==='1'?' lit':'');});
         c.el.classList.remove('pixel-change');
         if(!instant&&!reduced.matches){void c.el.offsetHeight;c.el.classList.add('pixel-change');}
       }
     }else if(c.continuous){
       var phase=(meters/100)%10;
       c.strip.style.transform='translateY(-'+((1+phase)*42)+'px)';
       c.strip.dataset.position=String(phase);
     }else if(instant||text[i]!==shown[i])roll(c,text[i],shown[i],instant);
   }
   shown=text;digits.setAttribute('aria-label',(Math.floor(meters/100)/10).toFixed(1)+' kilometres');
 }
 function animate(now){
   frame=null;if(destroyed)return;
   var progress=Math.min(1,Math.max(0,(now-startAt)/duration));
   displayed=from+(target-from)*progress;paint(displayed,false);
   if(progress<1)frame=requestAnimationFrame(animate);
 }
 function render(data){
   if(destroyed)return;
   var meters=Number(data.meters);if(!Number.isFinite(meters)||meters<0)return;
   var switched=active!==data.car_key;active=data.car_key;latest={meters:meters,car_key:data.car_key};
   if(style!=='mechanical'){paint(meters,switched);displayed=meters;target=meters;return;}
   var now=performance.now(),gap=lastInput?now-lastInput:100;lastInput=now;
   if(switched||meters<displayed||meters-displayed>200||gap>1000||reduced.matches){
     if(frame)cancelAnimationFrame(frame);frame=null;displayed=target=meters;paint(meters,true);return;
   }
   if(meters===target)return;
   if(frame){cancelAnimationFrame(frame);frame=null;}
   from=displayed;target=meters;startAt=now;duration=Math.max(80,Math.min(250,gap*1.15));
   frame=requestAnimationFrame(animate);
 }
 function scheduleRare(){
   clearTimeout(rareTimer);if(destroyed)return;
   rareTimer=setTimeout(function(){
     if(style==='electronic'&&!reduced.matches&&!document.hidden){
       rareGate().then(function(allowed){
         if(!allowed||style!=='electronic'||destroyed)return;
         var candidates=cells.filter(function(c){return c&&c.dots;});
         if(!candidates.length)return;
         var cell=candidates[Math.floor(Math.random()*candidates.length)];
         var litRows=[];
         for(var row=0;row<7;row++)if(cell.dots.slice(row*5,row*5+5).some(function(dot){return dot.classList.contains('lit');}))litRows.push(row);
         var chosen=litRows[Math.floor(Math.random()*litRows.length)];
         cell.dots.slice(chosen*5,chosen*5+5).forEach(function(dot){if(dot.classList.contains('lit'))dot.classList.add('pixel-rare');});
         setTimeout(function(){cell.dots.forEach(function(dot){dot.classList.remove('pixel-rare');});},350);
       }).catch(function(e){console.error('Odometer pixel effect:',e);});
     }
     scheduleRare();
   },300000+Math.floor(Math.random()*300000));
 }
 render.setStyle=function(value){
   if(['minimal','electronic','mechanical'].indexOf(value)<0)value='minimal';
   if(value===style&&cells.length)return;
   style=value;meter.dataset.style=style;
   if(frame)cancelAnimationFrame(frame);frame=null;clearCells();
   displayed=target=latest.meters;lastInput=0;paint(latest.meters,true);
 };
 render.setFlickerGate=function(gate){rareGate=gate;};
 render.destroy=function(){destroyed=true;if(frame)cancelAnimationFrame(frame);clearTimeout(rareTimer);clearCells();};
 render.getStyle=function(){return style;};
 meter.dataset.style=style;scheduleRare();
 return render;
};
