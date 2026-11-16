import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { supabaseUrl, supabasePublishableKey } from './supabase-config.js';

const sb = createClient(supabaseUrl, supabasePublishableKey);
const $ = id => document.getElementById(id);
const say = msg => { $('sb-status').textContent = msg; };
const errText = e => (e?.message || String(e)).slice(0,180);
let user = null, role = null, current = null, watching = null, saveTimer = null, applying = false, lastPayload = '';
function canEdit() {
  return !!(user && role && current && current.status === 'draft' &&
    (role === 'manager' || role === 'charge_hand' || current.owner_id === user.id));
}
function showPermissions() {
  $('sb-login').hidden = !!user;
  $('sb-account').hidden = !user || !role;
  $('sb-identity').textContent = user?.email || '';
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
  $('local-add').disabled = locked;
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
  if (saveTimer) {clearTimeout(saveTimer);saveTimer=null;await saveCloud();}
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
    if (saveTimer) {clearTimeout(saveTimer);saveTimer=null;await saveCloud();}
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
  if(!canEdit() || applying)return;
  const payload=window.sicCloudRead();
  const serialized=JSON.stringify(payload);
  if(serialized===lastPayload)return;
  const {error}=await sb.from('sheets').update({payload,sheet_date:String(payload.date||'')}).eq('id',current.id);
  if(error){say('Save failed: '+errText(error));return;}
  lastPayload=serialized;
  say('Saved to Supabase');
}
window.addEventListener('sic-local-saved',()=>{
  if(!canEdit()||applying)return;
  clearTimeout(saveTimer);
  saveTimer=setTimeout(saveCloud,1200);
});
$('sb-login').addEventListener('submit',async e=>{
  e.preventDefault();
  const {error}=await sb.auth.signInWithPassword({email:$('sb-email').value.trim(),password:$('sb-password').value});
  $('sb-password').value='';
  if(error)say('Sign-in failed: '+errText(error));
});
$('sb-logout').addEventListener('click',async()=>{clearTimeout(saveTimer);await sb.auth.signOut();});
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
  clearTimeout(saveTimer);await saveCloud();
  const {error}=await sb.from('sheets').update({status:'approved'}).eq('id',current.id);
  if(error){say('Approval failed: '+errText(error));return;}
  await loadSheet(current.id,true);
});
$('sb-reopen').addEventListener('click',async()=>{
  if(role!=='manager'||!current||!confirm('Reopen this approved sheet?'))return;
  const {error}=await sb.from('sheets').update({status:'draft'}).eq('id',current.id);
  if(error){say('Reopen failed: '+errText(error));return;}
  await loadSheet(current.id,true);
});
async function refreshAccount(){
  if(watching){await sb.removeChannel(watching);watching=null;}
  clearTimeout(saveTimer);current=null;role=null;lastPayload='';
  const {data:{user:authUser}}=await sb.auth.getUser();
  user=authUser;
  if(user){
    const {data,error}=await sb.from('profiles').select('role,active').eq('id',user.id).single();
    if(error||!data?.active||!['operator','charge_hand','manager'].includes(data.role)){
      say('Account needs an active profile and role. Ask your Supabase administrator.');
    }else{role=data.role;say('Signed in as '+role+' · choose or create a cloud sheet');await listSheets();}
  }else say('Sign in to use cloud sheets. Local editing is still available.');
  showPermissions();
}
sb.auth.onAuthStateChange((_event,_session)=>{setTimeout(refreshAccount,0);});
refreshAccount();
