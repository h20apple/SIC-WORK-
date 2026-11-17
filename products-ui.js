import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {supabaseUrl,supabasePublishableKey} from './supabase-config.js';
const sb=createClient(supabaseUrl,supabasePublishableKey);
const $=id=>document.getElementById(id);
let products=[],isManager=false;
const status=t=>$('prod-status').textContent=t;
const norm=v=>String(v||'').trim().toUpperCase().replace(/\s/g,'');
const value=id=>$(id).value.trim();
const numberOrNull=id=>value(id)===''?null:Number(value(id));
async function checkRole(){
 const {data:{user}}=await sb.auth.getUser();
 if(!user){isManager=false;return false;}
 const {data,error}=await sb.from('profiles').select('role,active').eq('id',user.id).single();
 isManager=!error&&data?.active&&data.role==='manager';
 return isManager;
}
function clear(){
 $('prod-form').reset();$('prod-id').value='';$('prod-active').checked=true;
 $('prod-editor').open=true;
}
function edit(p){
 $('prod-id').value=p.id;$('prod-deli').value=p.deli;$('prod-code').value=p.r_code;
 $('prod-name').value=p.name;$('prod-upc').value=p.upc||'';$('prod-au').value=p.au_code||'';
 $('prod-tray').value=p.packs_per_tray??'';$('prod-sample').value=p.sample_amount??'';
 $('prod-verified').checked=!!p.verified;$('prod-active').checked=!!p.active;
 $('prod-editor').open=true;$('prod-editor').scrollIntoView({block:'nearest',behavior:'smooth'});
}
function cell(tr,text){
 const td=document.createElement('td');td.textContent=String(text??'—');
 td.style.cssText='padding:7px;border-bottom:1px solid #d4dfd9;white-space:nowrap';
 tr.append(td);return td;
}
function draw(){
 const root=$('prod-list');root.replaceChildren();
 const rows=products.filter(p=>!$('prod-filter').value||p.deli===$('prod-filter').value);
 const table=document.createElement('table');table.style.cssText='width:100%;border-collapse:collapse;font-size:12px';
 const head=document.createElement('tr');
 for(const name of ['Deli','R-code','Product','UPC','AU code','Per tray','Samples','Status','Action']){
  const th=document.createElement('th');th.textContent=name;th.style.cssText='padding:8px;text-align:left;background:#e6efea';head.append(th);
 }
 table.append(head);
 for(const p of rows){
  const tr=document.createElement('tr');
  for(const text of [p.deli,p.r_code,p.name,p.upc,p.au_code,p.packs_per_tray,p.sample_amount,p.verified?'Verified':'Needs review'])cell(tr,text);
  const td=document.createElement('td');const btn=document.createElement('button');btn.type='button';btn.textContent='Edit';btn.addEventListener('click',()=>edit(p));td.append(btn);tr.append(td);table.append(tr);
 }
 root.append(table);
 status(rows.length+' products shown · '+products.filter(p=>!p.verified).length+' awaiting Manager verification');
}
async function load(){
 if(!await checkRole()){status('Only active Managers can manage products.');return;}
 const {data,error}=await sb.from('products').select('*').order('deli').order('r_code').limit(1000);
 if(error){status('Could not load products: '+error.message);return;}
 products=data||[];draw();
}
$('prod-filter').addEventListener('change',draw);
$('prod-reload').addEventListener('click',load);
$('prod-clear').addEventListener('click',clear);
$('prod-code').addEventListener('blur',()=>{$('prod-code').value=norm(value('prod-code'));});
$('prod-form').addEventListener('submit',async event=>{
 event.preventDefault();
 if(!await checkRole()){status('Only Managers can change products.');return;}
 const record={deli:value('prod-deli'),r_code:norm(value('prod-code')),name:value('prod-name'),upc:value('prod-upc')||null,au_code:value('prod-au')||null,packs_per_tray:numberOrNull('prod-tray'),sample_amount:numberOrNull('prod-sample'),verified:$('prod-verified').checked,active:$('prod-active').checked};
 if(!/^R\d{3,6}$/.test(record.r_code)||!record.deli||!record.name){status('Enter Deli, R-code and product name.');return;}
 if(record.packs_per_tray!==null&&(!Number.isInteger(record.packs_per_tray)||record.packs_per_tray<1)){status('Packs per tray must be a positive whole number.');return;}
 if(record.sample_amount!==null&&(!Number.isInteger(record.sample_amount)||record.sample_amount<0)){status('Sample amount must be a whole number of zero or more.');return;}
 const id=value('prod-id');const btn=$('prod-form').querySelector('[type=submit]');btn.disabled=true;
 try{
  const query=id?sb.from('products').update(record).eq('id',Number(id)):sb.from('products').insert(record);
  const {data,error}=await query.select('id');
  if(error)throw error;
  if(!data?.length)throw Error('No product was saved. Check your Manager permissions.');
  clear();await load();status('Product saved successfully.');
 }catch(e){status('Save failed: '+e.message);}
 finally{btn.disabled=false;}
});
window.addEventListener('sic-products-open',load);
document.querySelector('[data-md-tab="products"]').addEventListener('click',()=>setTimeout(load,0));
