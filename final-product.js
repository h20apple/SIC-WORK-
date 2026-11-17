import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {supabaseUrl,supabasePublishableKey} from './supabase-config.js';
const sb=createClient(supabaseUrl,supabasePublishableKey);
const $=id=>document.getElementById(id);
let user=null,role=null,current=null,timer=null,loading=false;
const status=message=>{$('status').textContent=message;$('public-status').textContent=message;};
const dateFmt=value=>{const digits=String(value).replace(/\D/g,'').slice(0,8);return [digits.slice(0,2),digits.slice(2,4),digits.slice(4,8)].filter(Boolean).join('/');};
function validDate(v){if(!/^\d{2}\/\d{2}\/\d{4}$/.test(v))return false;const [d,m,y]=v.split('/').map(Number);const dt=new Date(y,m-1,d);return dt.getFullYear()===y&&dt.getMonth()===m-1&&dt.getDate()===d;}
const columns=["lineCheck","rCode","depotStart","checkTime","useBy","printQuality","upcTray","upcLabel","upcMatch","sleeves","seal","labelDetail","operatorInitials","chargeInitials","totalWaste","totalTrays","unlabelled","overPacks","burstPacks","rejectPacks","floorWaste","operatorChecks","chargeChecks"];
const checks=new Set(['printQuality','upcMatch','seal','operatorChecks','chargeChecks']);
const numbers=new Set(['sleeves','totalWaste','totalTrays','unlabelled','overPacks','burstPacks','rejectPacks','floorWaste']);
const shaded=new Set(['lineCheck','checkTime','printQuality','seal','chargeInitials','operatorChecks','chargeChecks']);
let draftRows=[];
function rowData(){
 return [...$('rows').querySelectorAll('tr')].map(tr=>Object.fromEntries([...tr.querySelectorAll('[data-col]')].map(el=>[el.dataset.col,el.value])));
}
function addRow(data={}){
 const tr=document.createElement('tr');
 for(const key of columns){
  const td=document.createElement('td');
  if(shaded.has(key))td.classList.add('shaded');
  let el;
  if(checks.has(key)){
   el=document.createElement('select');
   for(const value of ['', '✓','X','N/A'])el.add(new Option(value||'—',value));
  }else{
   el=document.createElement('input');
   el.type=numbers.has(key)?'number':key==='checkTime'?'time':'text';
   if(numbers.has(key)){el.min='0';el.step='1';el.inputMode='numeric';}
   if(key==='useBy'){el.placeholder='DD/MM/YYYY';el.inputMode='numeric';el.maxLength=10;}
   if(key==='rCode')el.placeholder='R####';
  }
  el.dataset.col=key;el.value=data[key]??'';
  if(key==='useBy')el.addEventListener('input',()=>{el.value=dateFmt(el.value);});
  td.append(el);tr.append(td);
 }
 const td=document.createElement('td');td.className='remove-cell no-print';
 const remove=document.createElement('button');remove.type='button';remove.className='remove-row';remove.textContent='×';remove.setAttribute('aria-label','Remove this product row');
 remove.addEventListener('click',()=>{if($('rows').children.length<=1){status('Keep at least one row.');return;}tr.remove();scheduleSave();});
 td.append(remove);tr.append(td);$('rows').append(tr);
}
function fields(){const result={};document.querySelectorAll('[data-extra]').forEach(el=>result[el.dataset.extra]=el.value);return result;}
function collect(){
 const rows=rowData().filter(row=>Object.values(row).some(v=>String(v).trim()));
 const payload={...fields(),rows,shift:$('shift').value,sheet:$('sheet-no').value,sheetOf:$('sheet-of').value};
 const first=rows.find(row=>row.rCode)||{};
 const total=key=>rows.reduce((sum,row)=>sum+(Number(row[key])||0),0);
 return {production_date:$('pack-date').value,deli:$('deli').value,line:$('line').value.trim(),r_code:String(first.rCode||'').trim().toUpperCase().replace(/\s/g,''),total_trays:total('totalTrays'),burst_packs:total('burstPacks'),payload};
}
function scheduleSave(){if(!current||loading||!role)return;clearTimeout(timer);timer=setTimeout(save,1600);}
function valid(row){
 if(!validDate(row.production_date))return 'Enter a valid pack date (DD/MM/YYYY).';
 if(!row.deli||!row.line)return 'Choose a Deli and Line.';
 if(!/^R\d+$/.test(row.r_code))return 'Enter a valid R-code (e.g. R5538).';
 if(!Number.isInteger(row.total_trays)||row.total_trays<0)return 'Enter Total Trays as a whole number.';
 if(!Number.isInteger(row.burst_packs)||row.burst_packs<0)return 'Enter Burst Packs as a whole number.';
 return '';
}
async function list(){
 if(!user)return;
 const {data,error}=await sb.from('final_product_checks').select('*').order('updated_at',{ascending:false}).limit(150);
 if(error){status('Cannot load entries: '+error.message);return;}
 $('saved').replaceChildren(new Option('Choose saved product…',''));
 for(const row of data){$('saved').add(new Option([row.production_date,row.deli,row.line,row.r_code].join(' · '),row.id));}
 $('saved').value=current?.id||'';
 $('delete').disabled=!current || !(current.owner_id===user?.id||role==='manager');
 return data;
}
function show(row){
 loading=true;current=row;
 $('pack-date').value=row.production_date;$('deli').value=row.deli;$('line').value=row.line;
 const p=row.payload||{};
 document.querySelectorAll('[data-extra]').forEach(el=>{el.value=p[el.dataset.extra]??'';});
 $('rows').replaceChildren();
 if(Array.isArray(p.rows)&&p.rows.length){for(const item of p.rows)addRow(item);}
 else addRow({rCode:row.r_code,totalTrays:row.total_trays,burstPacks:row.burst_packs,...p});
 $('shift').value=p.shift||'';$('sheet-no').value=p.sheet||'';$('sheet-of').value=p.sheetOf||'';
 $('saved').value=row.id;loading=false;
 $('delete').disabled=!(row.owner_id===user?.id||role==='manager');
 status('Loaded '+row.r_code+' · '+row.deli+' · '+row.line);
}
async function save(){
 if(!user||!role)return;
 const row=collect();const issue=valid(row);if(issue){status(issue);return;}
 $('save').disabled=true;status('Saving Final Product Sheet…');
 try{
  let result;
  if(current){
   result=await sb.from('final_product_checks').update(row).eq('id',current.id).select('*').single();
  }else{
   result=await sb.from('final_product_checks').insert({...row,owner_id:user.id}).select('*').single();
  }
  if(result.error){
   status(result.error.code==='23505'?'This R-code already has a saved entry for this Deli, Line and date. Open it from Saved entries.':'Save failed: '+result.error.message);
   return;
  }
  current=result.data;await list();
  status('Saved verification sheet to cloud · '+row.r_code+'.');
 }finally{$('save').disabled=false;}
}
function reset(){
 loading=true;current=null;$('delete').disabled=true;
 document.querySelectorAll('#work input,#work textarea').forEach(el=>el.value='');
 document.querySelectorAll('#work select').forEach(el=>el.value='');
 $('rows').replaceChildren();for(let i=0;i<8;i++)addRow();
 $('sheet-no').value='1';$('sheet-of').value='1';$('saved').value='';
 loading=false;status('New verification sheet ready.');
}
let accountGeneration=0;
async function account(){
 const generation=++accountGeneration;
 const {data:{user:account},error:authError}=await sb.auth.getUser();
 if(generation!==accountGeneration)return;
 if(authError&&!account){status('Unable to verify account. Please sign in again.');return;}
 const previousId=user?.id;
 if(previousId!==account?.id){
  clearTimeout(timer);timer=null;
  reset();
  $('saved').replaceChildren(new Option('Choose saved product…',''));
 }
 user=account;role=null;current=null;
 if(user){
  const {data,error}=await sb.from('profiles').select('role,active').eq('id',user.id).single();
  if(generation!==accountGeneration)return;
  if(!error&&data?.active&&['operator','charge_hand','manager'].includes(data.role))role=data.role;
 }
 // Every role has one default landing page, independent of the previous user.
 if((role==='charge_hand'||role==='manager')&&!new URLSearchParams(window.location.search).has('view')){
  window.location.replace('./index.html');
  return;
 }
 $('login-section').hidden=!!role;$('work').hidden=!role;$('logout').hidden=!role;
 $('identity').textContent=role?user.email.split('@')[0]+' · '+role:'';
 $('sic-link').hidden=role==='operator';
 if(role){await list();if(generation!==accountGeneration)return;status('Signed in · Final Product Sheet ready.');}
 else status('Sign in with an active staff account.');
}
$('login').addEventListener('submit',async e=>{
 e.preventDefault();
 const username=$('username').value.trim(),password=$('password').value;
 $('password').value='';status('Signing in…');
 try{
  const response=await fetch(supabaseUrl+'/functions/v1/username-login',{method:'POST',headers:{'Content-Type':'application/json',apikey:supabasePublishableKey},body:JSON.stringify({username,password})});
  const data=await response.json();if(!response.ok)throw Error(data.error||'Login failed');
  const {error}=await sb.auth.setSession({access_token:data.access_token,refresh_token:data.refresh_token});
  if(error)throw error;await account();
 }catch(error){status('Sign in failed: '+error.message);}
});
$('logout').addEventListener('click',async()=>{
 if(!user||!confirm('Sign out of your account on this device?'))return;
 const button=$('logout');button.disabled=true;
 clearTimeout(timer);timer=null;
 status('Signing out…');
 try{
  const {error}=await sb.auth.signOut();
  if(error)throw error;
  accountGeneration++;
  user=null;role=null;current=null;
  reset();
  $('saved').replaceChildren(new Option('Choose saved product…',''));
  window.location.replace('./final-product.html');
 }catch(error){
  status('Sign out failed: '+error.message);
  button.disabled=false;
 }
});
$('save').addEventListener('click',save);
$('delete').addEventListener('click',async()=>{
 if(!current||!user||!(current.owner_id===user.id||role==='manager'))return;
 const selected=current;
 if(!window.confirm('Permanently delete '+selected.r_code+' · '+selected.deli+' · '+selected.line+' · '+selected.production_date+'? This cannot be undone. Any figures already copied into the SIC Sheet will remain there.'))return;
 $('delete').disabled=true;
 status('Deleting saved entry…');
 const {data,error}=await sb.from('final_product_checks').delete().eq('id',selected.id).select('id');
 if(error||!data?.length){status('Delete failed: '+(error?.message||'Entry not deleted. Check your permissions.'));$('delete').disabled=false;return;}
 reset();await list();status('Saved Final Product entry permanently deleted. Existing SIC figures were not changed.');
});
$('new').addEventListener('click',reset);
$('print').addEventListener('click',()=>window.print());
$('refresh').addEventListener('click',list);
$('saved').addEventListener('change',async()=>{
 const id=$('saved').value;if(!id)return;
 const {data,error}=await sb.from('final_product_checks').select('*').eq('id',id).single();
 if(error)status('Cannot load entry: '+error.message);else show(data);
});
$('pack-date').addEventListener('input',()=>{$('pack-date').value=dateFmt($('pack-date').value);});

$('work').addEventListener('change',scheduleSave);
$('add-row').addEventListener('click',()=>{addRow();scheduleSave();});
sb.auth.onAuthStateChange((event)=>{if(event==='SIGNED_IN'||event==='SIGNED_OUT'||event==='INITIAL_SESSION')setTimeout(account,0);});
reset();account();
