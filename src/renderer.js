
window.createOdometerRenderer = function(){
 'use strict';
 var digits=document.getElementById('digits');
 var cells=[],shown='',active=null;
 function build(text){
   digits.innerHTML='';cells=[];
   for(var i=0;i<text.length;i++){
     var el=document.createElement('span');
     if(text[i]==='.') {el.className='point';el.textContent='.';cells.push(null);}
     else {el.className='digit'+(i===text.length-5?' group':'');var strip=document.createElement('span');strip.className='strip';var a=document.createElement('span'),b=document.createElement('span');a.textContent=text[i];b.textContent=text[i];strip.appendChild(a);strip.appendChild(b);el.appendChild(strip);cells.push({strip:strip,a:a,b:b,timer:null});}
     digits.appendChild(el);
   }
 }
 function render(data){
   var value=Math.floor(Math.max(0,Number(data.meters)||0)/100);
   var text=String(Math.floor(value/10)).padStart(6,'0')+'.'+value%10;
   var switched=active!==data.car_key;
   if(!cells.length||text.length!==shown.length){build(text);switched=true;}
   for(var i=0;i<text.length;i++){
     var cell=cells[i];if(!cell)continue;
     if(switched){clearTimeout(cell.timer);cell.strip.classList.remove('animate');cell.strip.style.transform='translateY(0)';cell.a.textContent=text[i];cell.b.textContent=text[i];}
     else if(text[i]!==shown[i]){
       clearTimeout(cell.timer);cell.strip.classList.remove('animate');cell.strip.style.transform='translateY(0)';cell.a.textContent=shown[i];cell.b.textContent=text[i];
       void cell.strip.offsetHeight;cell.strip.classList.add('animate');cell.strip.style.transform='translateY(-44px)';
       (function(c,d){c.timer=setTimeout(function(){c.strip.classList.remove('animate');c.a.textContent=d;c.strip.style.transform='translateY(0)';},280);})(cell,text[i]);
     }
   }
   active=data.car_key;shown=text;
   digits.setAttribute('aria-label',(value/10).toFixed(1)+' kilometres');
 }

 return render;
};
