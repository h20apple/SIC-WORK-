import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {supabaseUrl,supabasePublishableKey} from './supabase-config.js';
const sb=createClient(supabaseUrl,supabasePublishableKey);
let products=[],identity=null;
const normalize=v=>/^R?\d+$/i.test(String(v||'').trim())?'R'+String(v).trim().toUpperCase().replace(/^R/,''):'';
async function load(){
 const {data:{user}}=await sb.auth.getUser();
 if(!user){products=[];identity=null;return;}
 if(identity!==user.id){products=[];identity=user.id;}
 const {data,error}=await sb.from('products').select('deli,r_code,name,upc,au_code,packs_per_tray,sample_amount').eq('verified',true).eq('active',true).limit(1000);
 if(!error)products=data||[];
}
function match(deli,code){return products.find(p=>p.deli===deli&&p.r_code===normalize(code));}
function setIfSafe(el,v,force=false){
 if(!el||v===null||v===undefined)return;
 if(force||!el.value.trim()||el.value===el.dataset.catalogueValue){
  el.value=String(v);el.dataset.catalogueValue=String(v);
  el.dispatchEvent(new Event('input',{bubbles:false}));
 }
}
function updateSic(input){
 const tr=input.closest('tr');if(!tr||tr.parentElement?.id!=='rows')return;
 const deli=document.getElementById('sb-area')?.value||'';
 const p=match(deli,input.value);if(!p)return;
 setIfSafe(tr.children[3]?.querySelector('input,textarea'),p.name,true);
 setIfSafe(tr.children[14]?.querySelector('input'),p.packs_per_tray,true);
 // Sample amount is a product requirement, not the recorded sample count; never auto-post consumption.
}
function updateFinal(input){
 const tr=input.closest('tr');if(!tr||tr.parentElement?.id!=='rows')return;
 const deli=document.getElementById('deli')?.value||'';
 const p=match(deli,input.value);if(!p)return;
 input.title='Approved product: '+p.name+' · Reference UPC: '+(p.upc||'not recorded')+' · Packs/tray: '+(p.packs_per_tray??'unknown');
 // UPC-on-label and UPC-on-tray are observed verification checks; do not pre-fill them.
 const status=document.getElementById('status');
 if(status)status.textContent='Product reference: '+p.name+' · UPC '+(p.upc||'not recorded')+' · '+(p.packs_per_tray??'?')+' packs/tray. Verify physical labels independently.';
}
document.addEventListener('change',event=>{
 const el=event.target;
 if(el.closest?.('#rows')&&el.dataset?.col==='rCode')updateFinal(el);
 if(el.closest?.('#rows')&&el.closest('tr')?.children[2]?.querySelector('input')===el)updateSic(el);
 if(el.id==='sb-area'||el.id==='deli'){
  const rows=document.querySelectorAll('#rows tr');
  for(const row of rows){
   const code=el.id==='deli'?row.querySelector('[data-col="rCode"]'):row.children[2]?.querySelector('input');
   if(code){if(el.id==='deli')updateFinal(code);else updateSic(code);}
  }
 }
});
sb.auth.onAuthStateChange((event)=>{if(['SIGNED_IN','SIGNED_OUT','INITIAL_SESSION'].includes(event))setTimeout(load,0);});
load();
