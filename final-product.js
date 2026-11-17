import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {supabaseUrl,supabasePublishableKey} from './supabase-config.js';
const sb=createClient(supabaseUrl,supabasePublishableKey);
const $=id=>document.getElementById(id);
let user=null,role=null,current=null,timer=null,loading=false;
const status=message=>{$('status').textContent=message;$('public-status').textContent=message;};
const dateFmt=value=>{const digits=String(value).replace(/\D/g,'').slice(0,8);return [digits.slice(0,2),digits.slice(2,4),digits.slice(4,8)].filter(Boolean).join('/');};
function validDate(v){if(!/^\d{2}\/\d{2}\/\d{4}$/.test(v))return false;const [d,m,y]=v.split('/').map(Number);const dt=new Date(y,m-1,d);return dt.getFullYear()===y&&dt.getMonth()===m-1&&dt.getDate()===d;}
function fields(){const result={};document.querySelectorAll('[data-field],[data-extra]').forEach(el=>result[el.dataset.field||el.dataset.extra]=el.value);return result;}
function collect(){
 const payload={...fields(),shift:$('shift').value,sheet:$('sheet-no').value,sheetOf:$('sheet-of').value};
 return {production_date:$('pack-date').value,deli:$('deli').value,line:$('line').value.trim(),r_code:$('r-code').value.trim().toUpperCase().replace(/\s/g,''),total_trays:$('total-trays').value===''?null:Number($('total-trays').value),burst_packs:$('burst-packs').value===''?null:Number($('burst-packs').value),payload};
}
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
 document.querySelectorAll('[data-field],[data-extra]').forEach(el=>{el.value=p[el.dataset.field||el.dataset.extra]??'';});
 $('r-code').value=row.r_code;$('total-trays').value=row.total_trays??'';$('burst-packs').value=row.burst_packs??'';
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
  status('Saved to cloud · '+row.r_code+' is available for the matching SIC Sheet.');
 }finally{$('save').disabled=false;}
}
function reset(){loading=true;current=null;$('delete').disabled=true;document.querySelectorAll('#work input,#work textarea').forEach(el=>el.value='');document.querySelectorAll('#work select').forEach(el=>el.value='');$('saved').value='';loading=false;status('New product entry ready.');}
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
 $('sic-link').hidden=true;
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
$('logout').addEventListener('click',async()=>{await sb.auth.signOut();user=null;role=null;current=null;await account();});
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
document.querySelectorAll('[data-field="useBy"]').forEach(el=>el.addEventListener('input',()=>{el.value=dateFmt(el.value);}));
document.querySelectorAll('#work input,#work select,#work textarea').forEach(el=>el.addEventListener('change',()=>{
 if(!current||loading||!role)return;
 clearTimeout(timer);timer=setTimeout(save,1400);
}));
sb.auth.onAuthStateChange((event)=>{if(event==='SIGNED_IN'||event==='SIGNED_OUT'||event==='INITIAL_SESSION')setTimeout(account,0);});
account();