/* Fit only the driving widget to the pixel rectangle assigned by Kapps. */
window.fitOdometerToWindow = function(meter){
 'use strict';
 var pending=null,disposed=false;
 document.body.classList.add('overlay-page');
 function fit(){
   pending=null;if(disposed)return;
   var width=document.documentElement.clientWidth,height=document.documentElement.clientHeight;
   var naturalWidth=meter.offsetWidth,naturalHeight=meter.offsetHeight;
   if(!width||!height||!naturalWidth||!naturalHeight)return;
   var scale=Math.min(width/naturalWidth,height/naturalHeight);
   meter.style.transform='scale('+scale+')';
   meter.style.left=((width-naturalWidth*scale)/2)+'px';
   meter.style.top=((height-naturalHeight*scale)/2)+'px';
 }
 function schedule(){if(!disposed&&pending===null)pending=requestAnimationFrame(fit);}
 window.addEventListener('resize',schedule);
 var observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(schedule):null;
 if(observer){observer.observe(meter);observer.observe(document.documentElement);}
 // Older embedded browsers still get style/size changes through this fallback.
 var fallback=observer?null:setInterval(schedule,500);
 schedule();
 return function(){disposed=true;window.removeEventListener('resize',schedule);if(observer)observer.disconnect();if(fallback)clearInterval(fallback);if(pending!==null)cancelAnimationFrame(pending);};
};
