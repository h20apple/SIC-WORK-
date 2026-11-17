import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { supabaseUrl, supabasePublishableKey } from './supabase-config.js';

const sb = createClient(supabaseUrl, supabasePublishableKey);
const $ = id => document.getElementById(id);
const say = msg => { $('sb-status').textContent = msg; };
const setAccess = allowed => {
  document.body.classList.toggle('auth-locked', !allowed);
  document.body.classList.toggle('operator-restricted', role === 'operator');
  document.querySelector('#sb-panel > details').open = true;
};
const isRossAdmin = () => !!user && (user.email||'').split('@')[0].toLowerCase()==='rossadmin';
const errText = e => (e?.message || String(e)).slice(0,180);
let autoCreateBusy=false, deliPromptShown=false;
let staffDisplayName = '', user = null, role = null, current = null, watching = null, saveTimer = null, applying = false, lastPayload = '', refreshing = false, refreshQueued = false, activeUserId = null, saving = Promise.resolve(), hadSession = false;
function canEdit() {
  return !!(user && role==='charge_hand' && current && current.status === 'draft');
}
function showPermissions() {
  setAccess(!!(user && role && role!=='operator'));
  document.body.classList.toggle('manager-review-only',role==='manager');
  $('sb-login').hidden = !!(user && role);
  $('sb-account').hidden = !user || !role;
  $('sb-identity').textContent = user?.email?.split('@')[0] || '';
  $('sb-staff-admin').hidden = !isRossAdmin();
  $('sb-panel').classList.toggle('staff-mode',!!(user&&role&&!isRossAdmin()));
  $('md-accounts-tab').hidden = !isRossAdmin();
  // Keep cloud syncing active, but reserve the Supabase control panel for rossadmin.
  $('sb-panel').hidden = managerView==='dashboard';
  $('manager-dashboard-button').hidden = role !== 'manager';
  $('manager-dashboard-shortcut').hidden = role !== 'manager' || managerView==='dashboard';
  $('md-open-sheet').hidden = role==='manager' && !current;
  $('sb-role').textContent = role || '';
  $('sb-approve').hidden = role !== 'manager' || !current || current.status === 'approved';
  $('sb-reopen').hidden = role !== 'manager' || !current || current.status !== 'approved';
  $('sb-save').disabled = !canEdit();
  $('sb-new').disabled = role!=='charge_hand';
  window.sicManagerReviewMode=!!(role==='manager'&&current&&current.status==='draft');
  $('end-shift-button').disabled=!!current&&!canEdit();
  $('sb-mode').textContent = current ? (canEdit() ? 'Cloud draft · editable' : 'Cloud sheet · read-only') : 'Local sheet · not synced';
  document.querySelectorAll('.paper input,.paper textarea,.sheet .order-toggle,.sheet .circle-toggle').forEach(el => {
    el.disabled = role==='manager' || (!!current && !canEdit());
  });
  // Prevent creating rows or clearing a cloud sheet while it is read-only.
  const locked = role==='manager' || (!!current && !canEdit());
  // A new blank sheet or restore must not silently overwrite an attached cloud sheet.
  $('local-new').disabled = role==='manager' || !!current;
  $('local-add').disabled = locked || !role;
  $('local-restore').disabled = role==='manager' || !!current;
}
function fillSicIdentity(onlyEmpty=true){
  window.sicSignedInIdentity={name:staffDisplayName,area:$('sb-area').value,line:$('sb-line').value};
  const fields={leader:staffDisplayName,dell:$('sb-area').value,line:$('sb-line').value};
  for(const [key,value] of Object.entries(fields)){
    if(!value)continue;
    const input=document.querySelector('.paper [data-key="'+key+'"]');
    if(input && (!onlyEmpty||!input.value.trim())){
      input.value=value;
      input.dispatchEvent(new Event('input',{bubbles:true}));
    }
  }
}
function sheetPayload(){
  if(!current)fillSicIdentity(true);
  const payload=window.sicCloudRead();
  payload.cloud_username=current?.payload?.cloud_username||user?.email?.split('@')[0]||'';
  payload.cloud_area=$('sb-area').value;
  payload.cloud_line=$('sb-line').value;
  return payload;
}
function applyLocation(payload){
  $('sb-area').value=payload?.cloud_area||'';
  $('sb-line').value=payload?.cloud_line||'';
  // Do not replace the recorded leader with the viewer's identity.
  window.sicSignedInIdentity=null;
}
function hasLocalEntries(){
  const payload=window.sicCloudRead();
  return Object.entries(payload).some(([key,value])=>/^r\d+c\d+$/.test(key)&&String(value||'').trim()!=='') || Boolean(String(payload.date||'').trim());
}
async function listSheets() {
  const select = $('sb-sheets');
  select.innerHTML = '<option value="">Choose saved sheet…</option>';
  if (!user || !role || role==='operator') return;
  let query=sb.from('sheets').select('id,sheet_date,status,owner_id,payload').order('updated_at',{ascending:false}).limit(200);
  if(role==='operator')query=query.eq('owner_id',user.id);
  const {data,error} = await query;
  if (error) {say('Could not list sheets: '+errText(error));return null;}
  for (const item of data) {
    const option = document.createElement('option');
    option.value=item.id;option.textContent=[item.payload?.cloud_username||'Unknown user',item.sheet_date||'Undated',[item.payload?.cloud_area,item.payload?.cloud_line].filter(Boolean).join(' / ')||'Area not set',item.status].join(' · ');
    select.append(option);
  }
  select.value=current?.id || '';
  return data;
}
async function loadSheet(id, silent=false) {
  if(role!=='charge_hand'&&role!=='manager'){say('SIC access is restricted to Charge Hands and Managers.');return;}
  if (!silent && !confirm('Open cloud sheet? Current on-screen values will be replaced. Save a JSON backup first if needed.')) return;
  if (current && canEdit()) { const saved = await saveCloud(); if (!saved) return; }
  if (saveTimer) {clearTimeout(saveTimer);saveTimer=null;}
  if (watching) { await sb.removeChannel(watching); watching=null; }
  let query=sb.from('sheets').select('*').eq('id',id);
  if(role==='operator')query=query.eq('owner_id',user.id);
  const {data,error}=await query.single();
  if(error){say('Cannot load sheet: '+errText(error));return;}
  current=data;
  applying=true;
  window.sicCloudApply(data.payload || {});
  applyLocation(data.payload);
  applying=false;
  lastPayload=JSON.stringify(data.payload || {});
  showPermissions();
  $('sb-sheets').value=id;
  say('Loaded '+(data.sheet_date||'cloud sheet')+' · '+data.status);
  await importFinalChecks();
  // Subscribe to changes from other devices. Realtime requires publication enabled.
  watching=sb.channel('sic-sheet-'+id).on('postgres_changes',{
    event:'UPDATE',schema:'public',table:'sheets',filter:'id=eq.'+id
  },async()=>{await refreshOpenSheet();}).subscribe();

}
// Refresh a shared sheet without clobbering local unsaved entries.
let cloudRefreshBusy=false;
// Operator-to-SIC import. Operators only write final_product_checks; never read SIC.
async function importFinalChecks(){
 if(!canEdit()||!current)return;
 if(JSON.stringify(sheetPayload())!==lastPayload)return;
 const base=current.payload||{};
 const productionDate=String(base.date||'').trim();
 const deli=String(base.cloud_area||$('sb-area').value||'').trim();
 const line=String(base.cloud_line||$('sb-line').value||'').trim();
 if(!productionDate||!deli||!line)return;
 const {data:checks,error}=await sb.from('final_product_checks').select('*')
  .eq('production_date',productionDate).eq('deli',deli).eq('line',line).limit(150);
 if(error){say('Final Product link check failed: '+errText(error));return;}
 if(!checks?.length)return;
 const payload=JSON.parse(JSON.stringify(base));
 const links={...(payload.finalImports||{})};
 let count=Math.max(9,Math.min(100,Number(payload.rowCount)||9));
 const norm=v=>String(v||'').trim().toUpperCase().replace(/\s/g,'');
 let changed=false,skipped=0;
 for(const check of checks){
  const code=norm(check.r_code);
  if(!/^R\d+$/.test(code))continue;
  const matches=[];
  for(let i=0;i<count;i++)if(norm(payload['r'+i+'c2'])===code)matches.push(i);
  if(matches.length>1){skipped++;continue;}
  const previous=links[check.id];
  let index=matches[0];
  if(index===undefined){
   index=Array.from({length:count},(_,i)=>i).find(i=>
    !String(payload['r'+i+'c2']||'').trim() &&
    ![0,1,3,4,6,14,15].some(j=>String(payload['r'+i+'c'+j]||'').trim()));
   if(index===undefined&&count<100){index=count;count++;payload.rowCount=count;}
   if(index===undefined){skipped++;continue;}
   payload['r'+index+'c2']=code;changed=true;
  }
  if(previous&&previous.row!==index){skipped++;continue;}
  const mapping=[['trays',15,check.total_trays],['burst',12,check.burst_packs]];
  let record={row:index,trays:previous?.trays??null,burst:previous?.burst??null};
  for(const [key,col,value] of mapping){
   if(value===null||value===undefined)continue;
   const dest='r'+index+'c'+col;
   const existing=String(payload[dest]??'').trim();
   const prior=previous?.[key];
   // Never overwrite values entered independently by a Charge Hand.
   if(existing!==''&&!(previous&&String(prior)===existing)&&existing!==String(value)){skipped++;continue;}
   if(existing!==String(value)){payload[dest]=String(value);changed=true;}
   record[key]=value;
  }
  links[check.id]=record;
 }
 if(!changed)return;
 payload.finalImports=links;
 if(JSON.stringify(sheetPayload())!==lastPayload)return;
 applying=true;
 try{window.sicCloudApply(payload);applyLocation(payload);}finally{applying=false;}
 const saved=await saveCloud();
 if(saved)say('Final Product figures linked to SIC · '+checks.length+' checked'+(skipped?' · '+skipped+' require review':''));
}
async function refreshOpenSheet(){
 if(cloudRefreshBusy||applying||!current||!user)return;
 cloudRefreshBusy=true;
 try{
  const id=current.id;
  if(saveTimer){clearTimeout(saveTimer);saveTimer=null;if(!await saveCloud())return;}
  await saving;
  if(current?.id!==id)return;
  const local=sheetPayload();
  if(JSON.stringify(local)!==lastPayload){
   say('Unsaved changes detected. Save sheet before refreshing.');
   return;
  }
  const {data:remote,error}=await sb.from('sheets').select('*').eq('id',id).single();
  if(error||!remote||current?.id!==id)return;
  if(JSON.stringify(sheetPayload())!==lastPayload)return;
  const incoming=JSON.stringify(remote.payload||{});
  if(incoming!==lastPayload){
   applying=true;
   try{
    window.sicCloudApply(remote.payload||{});
    applyLocation(remote.payload||{});
   }finally{applying=false;}
  }
  current=remote;lastPayload=incoming;showPermissions();
  await importFinalChecks();
  if(incoming!==JSON.stringify(local))say('Cloud highlights and sheet updates received');
 }catch(error){say('Refresh failed: '+errText(error));}
 finally{cloudRefreshBusy=false;}
}
async function saveCloud() {
 if(!canEdit()||applying)return true;
 const sheetId=current.id;
 const task=async()=>{
  if(current?.id!==sheetId)return false;
  let local=sheetPayload();
  let base=current.payload||{};
  if(JSON.stringify(local)===JSON.stringify(base))return true;
  say('Saving to cloud…');
  for(let attempt=0;attempt<4;attempt++){
   if(current?.id!==sheetId)return false;
   const {data:updated,error}=await sb.from('sheets')
    .update({payload:local,sheet_date:String(local.date||'')})
    .eq('id',sheetId).eq('status','draft').eq('updated_at',current.updated_at)
    .select('id,updated_at');
   if(error){say('Save failed: '+errText(error));return false;}
   if(updated?.length){
    current.updated_at=updated[0].updated_at;
    current.payload=local;
    lastPayload=JSON.stringify(local);
    say('Saved to Supabase');
    return true;
   }
   const {data:remote,error:readError}=await sb.from('sheets').select('*').eq('id',sheetId).single();
   if(readError||!remote||remote.status!=='draft'){
    say('Sheet could not be updated. Save a JSON backup.');
    return false;
   }
   const theirs=remote.payload||{};
   const merged={...theirs};
   const conflicts=[];
   for(const key of new Set([...Object.keys(base),...Object.keys(local)])){
    const before=JSON.stringify(base[key]??null);
    const mine=JSON.stringify(local[key]??null);
    const other=JSON.stringify(theirs[key]??null);
    if(mine===before)continue;
    if(other!==before&&other!==mine){conflicts.push(key);continue;}
    if(Object.prototype.hasOwnProperty.call(local,key))merged[key]=local[key];
    else delete merged[key];
   }
   if(conflicts.length){
    say('Both devices edited '+conflicts.slice(0,3).join(', ')+'. Save a JSON backup and resolve the conflict.');
    return false;
   }
   current.updated_at=remote.updated_at;
   current.payload=theirs;
   base=theirs;
   local=merged;
  }
  say('Save is busy on another device. Try again shortly.');
  return false;
 };
 const result=saving.then(task,task);
 saving=result.then(()=>{},()=>{});
 return result;
}

window.addEventListener('sic-manager-highlight',async()=>{if(!current||!canEdit())return;clearTimeout(saveTimer);if(await saveCloud())say('Manager highlight saved to cloud');});
window.addEventListener('sic-end-shift',async()=>{if(!current){say('End of shift marked locally. Create a cloud sheet to submit it for manager review.');return;}clearTimeout(saveTimer);if(await saveCloud())say('End of shift saved. Managers can now review this sheet in their dashboard.');});
async function createAutoSheet(){
 if(autoCreateBusy||current||!user||role!=='charge_hand'||!hasLocalEntries())return;
 if(!$('sb-area').value){
  if(!deliPromptShown){
   deliPromptShown=true;
   say('Choose Deli 1, 2 or 3 above to automatically save this sheet.');
   $('sb-area').focus();
  }
  return;
 }
 if(!$('sb-line').value){say('Choose the production Line above to start autosaving.');$('sb-line').focus();return;}
 autoCreateBusy=true;
 try{
  fillSicIdentity(true);
  const payload=sheetPayload();
  const {data,error}=await sb.from('sheets').insert({owner_id:user.id,sheet_date:String(payload.date||''),payload,status:'draft'}).select('*').single();
  if(error){say('Auto-create failed: '+errText(error));return;}
  current=data;lastPayload=JSON.stringify(payload);
  showPermissions();
  await listSheets();
  await loadSheet(data.id,true);
  say('Cloud sheet created · autosave enabled');
 }finally{autoCreateBusy=false;}
}
window.addEventListener('sic-local-saved',()=>{
  if(applying||!user||!role)return;
  clearTimeout(saveTimer);
  if(!current){saveTimer=setTimeout(createAutoSheet,650);return;}
  if(!canEdit())return;
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
    say('Login accepted. Opening SIC Sheet…');
    await refreshAccount();
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
$('sb-logout').addEventListener('click',async()=>{clearTimeout(saveTimer);if(current && canEdit() && !await saveCloud()){say('Save failed. Please save a backup before signing out.');return;}if(!current && !confirm('Any local-only sheet on this device will be cleared when you sign out. Export a backup first. Continue?'))return;const {error}=await sb.auth.signOut();if(error)say('Sign-out failed: '+errText(error));});
$('sb-new').addEventListener('click',async()=>{
  if(!user||role!=='charge_hand'){say('Only Charge Hands can create SIC sheets. Managers review existing sheets.');return;}
  if(!confirm('Create a cloud sheet from the CURRENT on-screen form?'))return;
  if(!$('sb-area').value||!$('sb-line').value){say('Select a deli area and line before creating a cloud sheet.');return;}
  fillSicIdentity(true);
  const payload=sheetPayload();
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
$('sb-save').addEventListener('click',async()=>{clearTimeout(saveTimer);await saveCloud();await listSheets();});
for(const id of ['sb-area','sb-line'])$(id).addEventListener('change',()=>{if(!current){deliPromptShown=false;createAutoSheet();}if(!current||canEdit())fillSicIdentity(false);if(current&&canEdit()){clearTimeout(saveTimer);saveTimer=setTimeout(async()=>{if(await saveCloud())await listSheets();},500);}});
$('sb-approve').addEventListener('click',async()=>{
  if(role!=='manager'||!current||!confirm('Approve and lock this sheet?'))return;
  clearTimeout(saveTimer);if(!await saveCloud())return;
  const {data,error}=await sb.rpc('manager_set_sheet_approval',{p_sheet_id:current.id,p_approve:true});
  if(error||!data){say('Approval failed: '+(error?errText(error):'Sheet was already changed'));return;}
  await loadSheet(current.id,true);
});
$('sb-reopen').addEventListener('click',async()=>{
  if(role!=='manager'||!current||!confirm('Reopen this approved sheet?'))return;
  const {data,error}=await sb.rpc('manager_set_sheet_approval',{p_sheet_id:current.id,p_approve:false});
  if(error||!data){say('Reopen failed: '+(error?errText(error):'Sheet was already changed'));return;}
  await loadSheet(current.id,true);
});

let managerView='sheet',managerTab='overview',managerSheets=[],managerProfiles=[],managerArea=null,managerLine=null,managerSearch='',managerFilter='all';
const mdEl=(tag,content,cls)=>{const el=document.createElement(tag);if(content!==undefined)el.textContent=String(content);if(cls)el.className=cls;return el;};
$('manager-dashboard-button').addEventListener('click',()=>managerSwitch('dashboard'));
$('manager-cloud-dashboard-button').addEventListener('click',()=>managerSwitch('dashboard'));
function managerSwitch(view){
 if(role!=='manager')return;
 if(view==='sheet'&&!current){$('md-status').textContent='Choose a saved staff SIC sheet to review first.';return;}
 managerView=view;
 document.body.classList.toggle('manager-home',view==='dashboard');
 $('manager-dashboard').hidden=view!=='dashboard';
 $('manager-choice').hidden=true;
 $('sb-panel').hidden=view==='dashboard';
 $('manager-dashboard-shortcut').hidden=view==='dashboard';
 if(view==='dashboard'){managerArea=null;managerLine=null;setManagerSubpage(false);refreshManager();}
}
function setManagerSubpage(open){
 $('md-back').hidden=!open;
 $('md-summary').hidden=open;
 $('md-areas').hidden=open;
 $('md-tabs').hidden=open;
}
$('md-back').addEventListener('click',()=>{managerArea=null;managerLine=null;managerTab='overview';for(const name of ['overview','insights','staff','audit','accounts'])$('md-'+name).hidden=name!=='overview';document.querySelectorAll('[data-md-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mdTab==='overview')));setManagerSubpage(false);drawManagerOverview();});
function managerWelcome(){
 $('manager-choice').hidden=true;
 managerSwitch('dashboard');
}
$('md-choose-dashboard').addEventListener('click',()=>managerSwitch('dashboard'));
$('md-choose-sheet').addEventListener('click',()=>managerSwitch('sheet'));
$('md-open-sheet').addEventListener('click',()=>managerSwitch('sheet'));
$('md-refresh').addEventListener('click',()=>refreshManager());
document.querySelectorAll('[data-md-tab]').forEach(btn=>btn.addEventListener('click',()=>{
 if(btn.dataset.mdTab==='accounts'&&!isRossAdmin())return;
 managerTab=btn.dataset.mdTab;
 setManagerSubpage(true);
 for(const name of ['overview','insights','staff','audit','accounts'])$('md-'+name).hidden=name!==managerTab;
 document.querySelectorAll('[data-md-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mdTab===managerTab)));
 refreshManager();
}));
function managerButton(label,handler){const b=mdEl('button',label);b.type='button';b.addEventListener('click',handler);return b;}
function managerTable(headers,rows){
 const table=mdEl('table',undefined,'md-table'),head=mdEl('tr');
 for(const h of headers)head.append(mdEl('th',h));
 table.append(head);
 for(const row of rows){const tr=mdEl('tr');row.forEach((val,i)=>{const td=mdEl('td');td.dataset.label=String(headers[i]||'');if(val instanceof Node)td.append(val);else td.textContent=String(val??'');tr.append(td);});table.append(tr);}
 return table;
}
$('md-search').addEventListener('input',e=>{managerSearch=e.target.value.trim().toLowerCase();if(managerTab==='overview')drawManagerOverview(managerArea,managerLine);});
$('md-filter').addEventListener('change',e=>{managerFilter=e.target.value;if(managerTab==='overview')drawManagerOverview(managerArea,managerLine);});
function managerName(id){const p=managerProfiles.find(x=>x.id===id);return p?.display_name||id?.slice(0,8)||'Unknown';}
function sheetArea(s){return s.payload?.cloud_area||'Unassigned';}
function sheetLine(s){return s.payload?.cloud_line||'Unassigned';}
async function deleteManagerSheet(item){
 if(role!=='manager'||!item?.id)return;
 const label=[item.sheet_date||'Undated',sheetArea(item),sheetLine(item),item.payload?.cloud_username||managerName(item.owner_id)].join(' · ');
 if(!confirm('Permanently delete this SIC sheet?\\n\\n'+label+'\\n\\nThis cannot be undone. Export a backup first if needed.'))return;
 const typed=prompt('To confirm permanent deletion, type DELETE');
 if(typed!=='DELETE'){$('md-status').textContent='Deletion cancelled.';return;}
 $('md-status').textContent='Deleting SIC sheet…';
 const {data,error}=await sb.from('sheets').delete().eq('id',item.id).select('id');
 if(error){$('md-status').textContent='Delete failed: '+errText(error);return;}
 if(!data?.length){$('md-status').textContent='Delete not permitted or sheet already removed.';return;}
 if(current?.id===item.id){
  if(watching){await sb.removeChannel(watching);watching=null;}
  current=null;lastPayload='';window.sicClearPrivate?.();showPermissions();
 }
 await listSheets();
 await refreshManager();
 $('md-status').textContent='SIC sheet permanently deleted.';
}
function drawManagerOverview(area=null,line=null){
 managerArea=area;managerLine=line;
 setManagerSubpage(!!(area&&line));
 const summary=$('md-summary'),areas=$('md-areas'),recent=$('md-recent');
 summary.replaceChildren();areas.replaceChildren();recent.replaceChildren();
 const review=managerSheets.filter(s=>s.payload?.endShift&&s.status==='draft');
 const approved=managerSheets.filter(s=>s.status==='approved');
 const today=new Date().toLocaleDateString('en-GB');
 const todaySheets=managerSheets.filter(s=>s.sheet_date===today||s.payload?.date===today);
 const metrics=[['Saved SIC sheets',managerSheets.length,'All loaded records'],['Needs review',review.length,'End of shift, awaiting approval'],['Approved',approved.length,'Locked and signed off'],['Today',todaySheets.length,today]];
 for(const [name,value,note] of metrics){
  const c=mdEl('div',undefined,'md-card md-metric');
  c.append(mdEl('div',name,'md-metric-label'),mdEl('strong',value,'md-metric-number'),mdEl('small',note));
  summary.append(c);
 }
 for(let d=1;d<=3;d++){
  const areaName='Deli '+d,c=mdEl('div',undefined,'md-card md-area');c.append(mdEl('h3',areaName));
  const grid=mdEl('div',undefined,'md-lines');
  for(let l=1;l<=4;l++){
   const lineName='Line '+l,matching=managerSheets.filter(s=>sheetArea(s)===areaName&&sheetLine(s)===lineName);
   const pending=matching.filter(s=>s.payload?.endShift&&s.status==='draft').length;
   const button=managerButton(lineName+' · '+matching.length+(pending?' · '+pending+' review':''),()=>{managerTab='overview';drawManagerOverview(areaName,lineName);});
   if(pending)button.classList.add('md-needs-review');
   grid.append(button);
  }
  c.append(grid);areas.append(c);
 }
 $('md-selected-title').textContent=area&&line?area+' / '+line+' · Sheets':'Recent SIC sheets';
 $('md-search-tools').hidden=!!(area&&line);
 const filtered=managerSheets.filter(s=>{
  if(area&&sheetArea(s)!==area)return false;
  if(line&&sheetLine(s)!==line)return false;
  if(managerFilter==='review'&&!(s.payload?.endShift&&s.status==='draft'))return false;
  if(managerFilter==='approved'&&s.status!=='approved')return false;
  if(managerFilter==='draft'&&s.status!=='draft')return false;
  if(managerFilter==='today'&&s.sheet_date!==today&&s.payload?.date!==today)return false;
  const search=[s.sheet_date,s.payload?.date,sheetArea(s),sheetLine(s),s.payload?.cloud_username,managerName(s.owner_id),s.status].join(' ').toLowerCase();
  return !managerSearch||search.includes(managerSearch);
 });
 $('md-results-count').textContent=filtered.length+' matching sheet'+(filtered.length===1?'':'s')+(managerSheets.length>=500?' · showing latest 500 loaded':'');
 if(!filtered.length){recent.append(mdEl('p','No matching sheets. Try clearing the search or changing the filter.'));return;}
 const wrapper=mdEl('div',undefined,'md-table-wrap');
 wrapper.append(managerTable(['Date','Deli / line','Owner','Status','Updated','Action'],filtered.slice(0,100).map(item=>[
  item.sheet_date||'Undated',
  sheetArea(item)+' / '+sheetLine(item),
  item.payload?.cloud_username||managerName(item.owner_id),
  item.payload?.endShift&&item.status==='draft'?'Needs review':item.status,
  item.updated_at?new Date(item.updated_at).toLocaleString('en-GB'):'—',
  (()=>{const actions=mdEl('div',undefined,'md-row-actions');actions.append(managerButton('Review',async()=>{await loadSheet(item.id,true);if(current?.id===item.id)managerSwitch('sheet');}));const del=managerButton('Delete',()=>deleteManagerSheet(item));del.classList.add('md-delete');actions.append(del);return actions;})()
 ])));
 recent.append(wrapper);
}
function drawManagerInsights(){
 const root=$('md-insights-list');root.replaceChildren();
 const number=v=>{const n=Number(String(v??'').trim());return Number.isFinite(n)&&n>=0?n:0;};
 let produced=0,waste=0,bursts=0,rows=0,withData=0;
 const deliTotals=new Map();
 for(const sheet of managerSheets){
  const p=sheet.payload||{};let sheetProduced=0;
  const count=Math.min(100,Math.max(0,Number(p.rowCount)||9));
  for(let i=0;i<count;i++){
   const hasProduct=String(p['r'+i+'c2']||'').trim();
   if(!hasProduct)continue;
   const packs=number(p['r'+i+'c7']);
   const loss=number(p['r'+i+'c10'])+number(p['r'+i+'c11']);
   const burst=number(p['r'+i+'c12']);
   if(packs||loss||burst){rows++;sheetProduced+=packs;produced+=packs;waste+=loss;bursts+=burst;}
  }
  if(sheetProduced){withData++;const area=sheetArea(sheet);deliTotals.set(area,(deliTotals.get(area)||0)+sheetProduced);}
 }
 const stats=mdEl('div',undefined,'md-grid');
 for(const [label,value,detail] of [['Packs produced',produced.toLocaleString('en-GB'),'Recorded SIC packs'],['Waste + rejects',waste.toLocaleString('en-GB'),'Despatch waste and Dell rejects'],['Burst packs',bursts.toLocaleString('en-GB'),'Recorded Dell burst packs'],['Rows with figures',rows.toLocaleString('en-GB'),withData+' sheets with output']]){
  const c=mdEl('div',undefined,'md-card md-metric');
  c.append(mdEl('div',label,'md-metric-label'),mdEl('strong',value,'md-metric-number'),mdEl('small',detail));stats.append(c);
 }
 root.append(stats);
 const section=mdEl('div',undefined,'md-card');section.append(mdEl('h3','Packs produced by deli'));
 if(!deliTotals.size)section.append(mdEl('p','No recorded pack figures yet.'));
 else{
  const max=Math.max(...deliTotals.values(),1);
  for(const [area,value] of [...deliTotals].sort((a,b)=>b[1]-a[1])){
   const line=mdEl('div',undefined,'md-bar-row'),label=mdEl('div',area+' · '+value.toLocaleString('en-GB'));
   const track=mdEl('div',undefined,'md-bar-track'),bar=mdEl('div',undefined,'md-bar-fill');
   bar.style.width=Math.max(0,Math.min(100,value/max*100))+'%';track.append(bar);line.append(label,track);section.append(line);
  }
 }
 section.append(mdEl('p','Figures are summed from the latest '+managerSheets.length+' loaded SIC sheets (up to 500). They are not live production readings. Review continuation rows and data quality before using totals for official reporting.','md-insight-note'));
 root.append(section);
 const csv=managerButton('Download sheet summary (CSV)',()=>{
  const quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const header=['Date','Deli','Line','Owner','Status','Updated'];
  const lines=[header,...managerSheets.map(sh=>[sh.sheet_date,sheetArea(sh),sheetLine(sh),sh.payload?.cloud_username||managerName(sh.owner_id),sh.status,sh.updated_at])];
  const blob=new Blob(['\uFEFF'+lines.map(row=>row.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='SIC-manager-sheet-summary.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 root.append(csv);
}
function drawManagerStaff(){
 const root=$('md-staff-list');root.replaceChildren();
 const profiles=[...managerProfiles].sort((a,b)=>String(a.display_name||'').localeCompare(String(b.display_name||'')));
 const counts={operator:0,charge_hand:0,manager:0};
 for(const p of profiles)if(p.active&&counts[p.role]!==undefined)counts[p.role]++;
 const overview=mdEl('div',undefined,'md-grid');
 for(const [label,n] of [['Active staff',profiles.filter(p=>p.active).length],['Operators',counts.operator],['Charge hands',counts.charge_hand],['Managers',counts.manager]]){
  const card=mdEl('div',undefined,'md-card md-metric');
  card.append(mdEl('div',label,'md-metric-label'),mdEl('strong',n,'md-metric-number'));
  overview.append(card);
 }
 root.append(overview);
 const wrapper=mdEl('div',undefined,'md-table-wrap');
 wrapper.append(managerTable(['Name','Role','Access','SIC sheets'],profiles.map(p=>[
  p.display_name||p.id.slice(0,8),
  p.role==='charge_hand'?'Charge hand':p.role==='manager'?'Manager':'Operator',
  p.active?'Active':'Inactive',
  managerSheets.filter(s=>s.owner_id===p.id).length
 ])));
 root.append(wrapper);
 if(managerProfiles.length>=300)root.append(mdEl('p','Staff list may be incomplete: showing the first 300 profiles.'));
}
async function managerRequest(body){
 const {data:{session}}=await sb.auth.getSession();
 if(!session)throw Error('Session expired');
 const response=await fetch(supabaseUrl+'/functions/v1/manage-staff',{method:'POST',headers:{'Content-Type':'application/json','apikey':supabasePublishableKey,'Authorization':'Bearer '+session.access_token},body:JSON.stringify(body)});
 const result=await response.json();
 if(!response.ok)throw Error(result.error||'Account update failed');
 return result;
}
async function drawManagerAccounts(){
 const root=$('md-account-list');root.replaceChildren();
 if(!isRossAdmin()){root.append(mdEl('p','Account administration is reserved for rossadmin.'));return;}
 let data;
 try{data=(await managerRequest({action:'list_accounts'})).accounts||[];}
 catch(error){root.append(mdEl('p','Unable to load accounts: '+errText(error)));return;}
 managerProfiles=data;
 for(const profile of managerProfiles){
  const c=mdEl('div',undefined,'md-card');c.style.marginBottom='10px';
  c.append(mdEl('strong',profile.username||profile.id.slice(0,8)),mdEl('p',(profile.display_name?profile.display_name+' · ':'')+profile.role+' · '+(profile.active?'Active':'Inactive')));
  const actions=mdEl('div',undefined,'md-action');
  const roleSelect=mdEl('select');for(const roleName of ['operator','charge_hand','manager']){const opt=mdEl('option',roleName.replace('_',' '));opt.value=roleName;opt.selected=roleName===profile.role;roleSelect.append(opt);}
  actions.append(roleSelect,managerButton('Save role',async()=>{
   if(!confirm('Change this account role?'))return;
   try{await managerRequest({action:'update_account',user_id:profile.id,role:roleSelect.value});await refreshManager();}catch(e){$('md-status').textContent=errText(e);}
  }),managerButton(profile.active?'Deactivate':'Activate',async()=>{
   if(!confirm((profile.active?'Deactivate':'Activate')+' this account?'))return;
   try{await managerRequest({action:'update_account',user_id:profile.id,active:!profile.active});await refreshManager();}catch(e){$('md-status').textContent=errText(e);}
  }),managerButton('Reset password',async()=>{
   const password=prompt('Enter a NEW temporary password (at least 12 characters). It will not be displayed later.');
   if(password===null)return;
   if(password.length<12){$('md-status').textContent='Password must have at least 12 characters.';return;}
   if(!confirm('Reset password for this account?'))return;
   try{await managerRequest({action:'reset_password',user_id:profile.id,password});$('md-status').textContent='Password reset completed.';}catch(e){$('md-status').textContent=errText(e);}
  }));
  c.append(actions);root.append(c);
 }
}
async function drawManagerAudit(){
 const root=$('md-audit-list');root.replaceChildren();
 const {data,error}=await sb.from('sic_audit_logs').select('created_at,actor_id,action,sheet_id,details').order('created_at',{ascending:false}).limit(150);
 if(error){root.append(mdEl('p','Unable to load audit logs: '+errText(error)));return;}
 if(!data?.length){root.append(mdEl('p','No audit events recorded yet.'));return;}
 root.append(managerTable(['When','Account','Action','Details'],data.map(item=>[
  new Date(item.created_at).toLocaleString('en-GB'),managerName(item.actor_id),item.action,
  [item.details?.area,item.details?.line,item.details?.date,item.details?.username,item.sheet_id?.slice(0,8)].filter(Boolean).join(' · ')
 ])));
}
async function refreshManager(){
 if(role!=='manager')return;
 $('md-status').textContent='Loading manager information…';
 try{
  const {data:profiles,error:profileError}=await sb.from('profiles').select('id,display_name,role,active').limit(300);
  if(profileError)throw profileError;managerProfiles=profiles||[];
  const {data,error}=await sb.from('sheets').select('id,owner_id,sheet_date,status,payload,updated_at').order('updated_at',{ascending:false}).limit(500);
  if(error)throw error;managerSheets=(data||[]).sort((a,b)=>Number(!!b.payload?.endShift&&b.status==='draft')-Number(!!a.payload?.endShift&&a.status==='draft'));
  drawManagerOverview(managerTab==='overview'?managerArea:null,managerTab==='overview'?managerLine:null);
  if(managerTab!=='overview')setManagerSubpage(true);
  if(managerTab==='insights')drawManagerInsights();
  if(managerTab==='staff')drawManagerStaff();
  if(managerTab==='audit')await drawManagerAudit();
  if(managerTab==='accounts')await drawManagerAccounts();
  $('md-status').textContent='Last refreshed '+new Date().toLocaleTimeString('en-GB');
 }catch(e){$('md-status').textContent='Dashboard error: '+errText(e);}
}

async function refreshAccount(){
  if(refreshing){refreshQueued=true;return;}
  refreshing=true;
  try {
  const {data:{user:authUser},error:authError}=await sb.auth.getUser();
  if(authError && !authUser && !/session missing|auth session missing/i.test(authError.message||''))throw authError;
  if(authUser?.id && authUser.id===activeUserId && role){user=authUser;if(role==='operator'){window.location.replace('./final-product.html');return;}showPermissions();return;}
  if(!authUser && hadSession){window.sicClearPrivate?.();hadSession=false;}
  if(!authUser){$('manager-dashboard-button').hidden=true;$('manager-dashboard-shortcut').hidden=true;managerView='sheet';window.sicSignedInIdentity=null;staffDisplayName='';$('manager-dashboard').hidden=true;$('manager-choice').hidden=true;$('sb-panel').hidden=false;document.body.classList.remove('manager-home');}
  if(watching){await sb.removeChannel(watching);watching=null;}
  clearTimeout(saveTimer);current=null;role=null;lastPayload='';activeUserId=null;
  setAccess(false);
  user=authUser;
  if(user){
    const {data,error}=await sb.from('profiles').select('role,active,display_name').eq('id',user.id).single();
    if(error||!data?.active||!['operator','charge_hand','manager'].includes(data.role)){
      user=null;
      await sb.auth.signOut();
      say('Account is inactive or has no assigned role. Ask your Manager.');
    }else{
      role=data.role;staffDisplayName=(data.display_name||user.email?.split('@')[0]||'').trim();hadSession=true;activeUserId=user.id;
      // A new login must never inherit a different account's cached sheet.
      applying=true;deliPromptShown=false;
      window.sicClearPrivate?.();
      $('sb-area').value='';$('sb-line').value='';
      applying=false;
      window.sicCloudApply?.({});
      if(role==='operator'){
        window.location.replace('./final-product.html');
        say('Opening your Final Product Sheet…');
        showPermissions();
        return;
      }
      fillSicIdentity(true);
      say('Signed in as '+role+' · checking your saved sheets…');
      const sheets=await listSheets();
      if(sheets){
        if(role==='manager'){
          managerWelcome();
          say('Manager review mode · select a staff SIC sheet to inspect or approve.');
        }else{
          const ownSheets=sheets.filter(item=>item.owner_id===user.id);
          if(ownSheets.length){
            await loadSheet(ownSheets[0].id,true);
            say('Your latest saved SIC Sheet has loaded.');
          }else{
            say('Blank SIC Sheet ready. Choose your Deli and Line, then Create cloud sheet to save.');
          }
        }
      }
    }
  }else say('Sign in to open your SIC Sheet.');
  showPermissions();
  } finally {
    refreshing=false;
    if(refreshQueued){refreshQueued=false;queueMicrotask(()=>refreshAccount().catch(error=>{setAccess(false);say('Could not verify login: '+errText(error));}));}
  }
}
// Two-minute cloud refresh: never replace unsaved edits or change the selected sheet.
setInterval(()=>{if(document.visibilityState!=='hidden')refreshOpenSheet();},120000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshOpenSheet();});
sb.auth.onAuthStateChange((event,_session)=>{if(event==='SIGNED_IN'||event==='SIGNED_OUT'||event==='INITIAL_SESSION')setTimeout(()=>refreshAccount().catch(error=>{setAccess(false);say('Could not verify login: '+errText(error));}),0);});
refreshAccount().catch(error=>{setAccess(false);say('Could not verify login: '+errText(error));});
