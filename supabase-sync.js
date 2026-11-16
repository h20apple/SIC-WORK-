import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { supabaseUrl, supabasePublishableKey } from './supabase-config.js';

const sb = createClient(supabaseUrl, supabasePublishableKey);
const $ = id => document.getElementById(id);
const say = msg => { $('sb-status').textContent = msg; };
const setAccess = allowed => {
  document.body.classList.toggle('auth-locked', !allowed);
  document.querySelector('#sb-panel > details').open = true;
};
const errText = e => (e?.message || String(e)).slice(0,180);
let user = null, role = null, current = null, watching = null, saveTimer = null, applying = false, lastPayload = '', refreshing = false, activeUserId = null, saving = Promise.resolve();
function canEdit() {
  return !!(user && role && current && current.status === 'draft' &&
    (role === 'manager' || role === 'charge_hand' || current.owner_id === user.id));
}
function showPermissions() {
  setAccess(!!(user && role));
  $('sb-login').hidden = !!(user && role);
  $('sb-account').hidden = !user || !role;
  $('sb-identity').textContent = user?.email?.split('@')[0] || '';
  $('sb-staff-admin').hidden = role !== 'manager';
  $('sb-role').textContent = role || '';
  $('sb-approve').hidden = role !== 'manager' || !current || current.status === 'approved';
  $('sb-reopen').hidden = role !== 'manager' || !current || current.status !== 'approved';
  $('sb-save').disabled = !canEdit();
  $('sb-mode').textContent = current ? (canEdit() ? 'Cloud draft · editable' : 'Cloud sheet · read-only') : 'Local sheet · not synced';
  document.querySelectorAll('.paper input,.paper textarea,.sheet .order-toggle,.sheet .circle-toggle').forEach(el => {
    el.disabled = !!current && !canEdit();
  });
  // Prevent creating rows or clearing a cloud sheet while it is read-only.
  const locked = !!current && !canEdit();
  // A new blank sheet or restore must not silently overwrite an attached cloud sheet.
  $('local-new').disabled = !!current;
  $('local-add').disabled = locked || !role;
  $('local-restore').disabled = !!current;
}
async function listSheets() {
  const select = $('sb-sheets');
  select.innerHTML = '<option value="">Choose saved sheet…</option>';
  if (!user || !role) return;
  const {data,error} = await sb.from('sheets').select('id,sheet_date,status,owner_id').order('updated_at',{ascending:false}).limit(200);
  if (error) {say('Could not list sheets: '+errText(error));return;}
  for (const item of data) {
    const option = document.createElement('option');
    option.value=item.id;option.textContent=(item.sheet_date||'Undated')+' · '+item.status+' · '+item.id.slice(0,8);
    select.append(option);
  }
  select.value=current?.id || '';
}
async function loadSheet(id, silent=false) {
  if (!silent && !confirm('Open cloud sheet? Current on-screen values will be replaced. Save a JSON backup first if needed.')) return;
  if (current && canEdit()) { const saved = await saveCloud(); if (!saved) return; }
  if (saveTimer) {clearTimeout(saveTimer);saveTimer=null;}
  if (watching) { await sb.removeChannel(watching); watching=null; }
  const {data,error}=await sb.from('sheets').select('*').eq('id',id).single();
  if(error){say('Cannot load sheet: '+errText(error));return;}
  current=data;
  applying=true;
  window.sicCloudApply(data.payload || {});
  applying=false;
  lastPayload=JSON.stringify(data.payload || {});
  showPermissions();
  $('sb-sheets').value=id;
  say('Loaded '+(data.sheet_date||'cloud sheet')+' · '+data.status);
  // Subscribe to changes from other devices. Realtime requires publication enabled.
  watching=sb.channel('sic-sheet-'+id).on('postgres_changes',{
    event:'UPDATE',schema:'public',table:'sheets',filter:'id=eq.'+id
  },async () => {
    if (applying) return;
    if (saveTimer) {clearTimeout(saveTimer);saveTimer=null;if(!await saveCloud())return;}
    const result=await sb.from('sheets').select('*').eq('id',id).single();
    if(result.error || !result.data || current?.id !== id)return;
    const incoming=JSON.stringify(result.data.payload || {});
    current=result.data;
    if(incoming!==lastPayload){applying=true;window.sicCloudApply(result.data.payload||{});applying=false;lastPayload=incoming;}
    showPermissions();
    say('Cloud sheet updated · '+current.status);
  }).subscribe();
}
async function saveCloud() {
  if(!canEdit() || applying)return true;
  const sheetId=current.id;
  const payload=window.sicCloudRead();
  const serialized=JSON.stringify(payload);
  if(serialized===lastPayload)return true;
  const task = async () => {
    const {data,error}=await sb.from('sheets').update({payload,sheet_date:String(payload.date||'')}).eq('id',sheetId).eq('status','draft').select('id');
    if(error || !data?.length){say('Save failed: '+(error?errText(error):'Sheet is locked or unavailable'));return false;}
    if(current?.id===sheetId)lastPayload=serialized;
    say('Saved to Supabase');return true;
  };
  const result=saving.then(task,task);
  saving=result.then(()=>{},()=>{});
  return result;
}
window.addEventListener('sic-local-saved',()=>{
  if(!canEdit()||applying)return;
  clearTimeout(saveTimer);
  saveTimer=setTimeout(saveCloud,1200);
});
$('sb-login').addEventListener('submit',async e=>{
  e.preventDefault();
  const username=$('sb-email').value.trim();const password=$('sb-password').value;
  $('sb-password').value='';
  try {
    const response=await fetch(supabaseUrl+'/functions/v1/username-login',{method:'POST',headers:{'Content-Type':'application/json','apikey':supabasePublishableKey},body:JSON.stringify({username,password})});
    const result=await response.json();
    if(!response.ok)throw Error(result.error||'Login failed');
    const {error}=await sb.auth.setSession({access_token:result.access_token,refresh_token:result.refresh_token});
    if(error)throw error;
  }catch(error){say('Sign-in failed: '+errText(error));}
});
$('sb-create-user').addEventListener('submit',async e=>{
  e.preventDefault();
  if(role!=='manager')return;
  const {data:{session}}=await sb.auth.getSession();
  if(!session)return;
  const payload={username:$('sb-new-username').value.trim(),password:$('sb-new-password').value,role:$('sb-new-role').value,display_name:$('sb-new-name').value.trim()};
  try{
    const response=await fetch(supabaseUrl+'/functions/v1/manage-staff',{method:'POST',headers:{'Content-Type':'application/json','apikey':supabasePublishableKey,'Authorization':'Bearer '+session.access_token},body:JSON.stringify(payload)});
    const result=await response.json();
    if(!response.ok)throw Error(result.error||'Failed to create user');
    $('sb-new-password').value='';say('Staff account created: '+result.username+' · '+result.role);
  }catch(error){say('Create user failed: '+errText(error));}
});
$('sb-logout').addEventListener('click',async()=>{clearTimeout(saveTimer);if(current && canEdit() && !await saveCloud()){say('Save failed. Please save a backup before signing out.');return;}await sb.auth.signOut();});
$('sb-new').addEventListener('click',async()=>{
  if(!user||!role)return;
  if(!confirm('Create a cloud sheet from the CURRENT on-screen form?'))return;
  const payload=window.sicCloudRead();
  const {data,error}=await sb.from('sheets').insert({
    owner_id:user.id,sheet_date:String(payload.date||''),payload,status:'draft'
  }).select('id').single();
  if(error){say('Create failed: '+errText(error));return;}
  await listSheets();await loadSheet(data.id,true);
});
$('sb-sheets').addEventListener('change',async e=>{
  const id=e.target.value;
  if(!id)return;
  clearTimeout(saveTimer);
  await loadSheet(id);
  e.target.value=current?.id || '';
});
$('sb-save').addEventListener('click',async()=>{clearTimeout(saveTimer);await saveCloud();});
$('sb-approve').addEventListener('click',async()=>{
  if(role!=='manager'||!current||!confirm('Approve and lock this sheet?'))return;
  clearTimeout(saveTimer);if(!await saveCloud())return;
  const {error}=await sb.from('sheets').update({status:'approved'}).eq('id',current.id).eq('status','draft');
  if(error){say('Approval failed: '+errText(error));return;}
  await loadSheet(current.id,true);
});
$('sb-reopen').addEventListener('click',async()=>{
  if(role!=='manager'||!current||!confirm('Reopen this approved sheet?'))return;
  const {error}=await sb.from('sheets').update({status:'draft'}).eq('id',current.id).eq('status','approved');
  if(error){say('Reopen failed: '+errText(error));return;}
  await loadSheet(current.id,true);
});
async function refreshAccount(){
  if(refreshing)return;
  refreshing=true;
  try {
  const {data:{user:authUser},error:authError}=await sb.auth.getUser();
  if(authError && !authUser)throw authError;
  if(authUser?.id && authUser.id===activeUserId && role){user=authUser;showPermissions();return;}
  if(watching){await sb.removeChannel(watching);watching=null;}
  clearTimeout(saveTimer);current=null;role=null;lastPayload='';activeUserId=null;
  setAccess(false);
  user=authUser;
  if(user){
    const {data,error}=await sb.from('profiles').select('role,active').eq('id',user.id).single();
    if(error||!data?.active||!['operator','charge_hand','manager'].includes(data.role)){
      user=null;
      await sb.auth.signOut();
      say('Account is inactive or has no assigned role. Ask your Manager.');
    }else{role=data.role;activeUserId=user.id;say('Signed in as '+role+' · choose or create a cloud sheet');await listSheets();}
  }else say('Sign in to open your SIC Sheet.');
  showPermissions();
  } finally {refreshing=false;}
}
sb.auth.onAuthStateChange((event,_session)=>{if(event==='SIGNED_IN'||event==='SIGNED_OUT'||event==='INITIAL_SESSION')setTimeout(()=>refreshAccount().catch(error=>{setAccess(false);say('Could not verify login: '+errText(error));}),0);});
refreshAccount().catch(error=>{setAccess(false);say('Could not verify login: '+errText(error));});
