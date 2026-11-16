import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { supabaseUrl, supabasePublishableKey } from './supabase-config.js';

const sb = createClient(supabaseUrl, supabasePublishableKey);
const $ = id => document.getElementById(id);
const say = msg => { $('sb-status').textContent = msg; };
const setAccess = allowed => {
  document.body.classList.toggle('auth-locked', !allowed);
  document.querySelector('#sb-panel > details').open = true;
};
const isRossAdmin = () => !!user && (user.email||'').split('@')[0].toLowerCase()==='rossadmin';
const errText = e => (e?.message || String(e)).slice(0,180);
let staffDisplayName = '', user = null, role = null, current = null, watching = null, saveTimer = null, applying = false, lastPayload = '', refreshing = false, refreshQueued = false, activeUserId = null, saving = Promise.resolve(), hadSession = false;
function canEdit() {
  return !!(user && role && current && current.status === 'draft' &&
    (role === 'manager' || role === 'charge_hand' || current.owner_id === user.id));
}
function showPermissions() {
  setAccess(!!(user && role));
  $('sb-login').hidden = !!(user && role);
  $('sb-account').hidden = !user || !role;
  $('sb-identity').textContent = user?.email?.split('@')[0] || '';
  $('sb-staff-admin').hidden = !isRossAdmin();
  $('md-accounts-tab').hidden = !isRossAdmin();
  // Keep cloud syncing active, but reserve the Supabase control panel for rossadmin.
  $('sb-panel').hidden = !!(user && role) && (!isRossAdmin() || managerView==='dashboard');
  $('manager-dashboard-button').hidden = role !== 'manager';
  $('manager-dashboard-shortcut').hidden = role !== 'manager' || managerView==='dashboard';
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
  fillSicIdentity(true);
  const payload=window.sicCloudRead();
  payload.cloud_username=user?.email?.split('@')[0]||'';
  payload.cloud_area=$('sb-area').value;
  payload.cloud_line=$('sb-line').value;
  return payload;
}
function applyLocation(payload){
  $('sb-area').value=payload?.cloud_area||'';
  $('sb-line').value=payload?.cloud_line||'';
  // Fill missing metadata on older sheets without overwriting recorded leaders.
  fillSicIdentity(true);
}
function hasLocalEntries(){
  const payload=window.sicCloudRead();
  return Object.entries(payload).some(([key,value])=>/^r\d+c\d+$/.test(key)&&String(value||'').trim()!=='') || Boolean(String(payload.date||'').trim());
}
async function listSheets() {
  const select = $('sb-sheets');
  select.innerHTML = '<option value="">Choose saved sheet…</option>';
  if (!user || !role) return;
  const {data,error} = await sb.from('sheets').select('id,sheet_date,status,owner_id,payload').order('updated_at',{ascending:false}).limit(200);
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
  if (!silent && !confirm('Open cloud sheet? Current on-screen values will be replaced. Save a JSON backup first if needed.')) return;
  if (current && canEdit()) { const saved = await saveCloud(); if (!saved) return; }
  if (saveTimer) {clearTimeout(saveTimer);saveTimer=null;}
  if (watching) { await sb.removeChannel(watching); watching=null; }
  const {data,error}=await sb.from('sheets').select('*').eq('id',id).single();
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
  // Subscribe to changes from other devices. Realtime requires publication enabled.
  watching=sb.channel('sic-sheet-'+id).on('postgres_changes',{
    event:'UPDATE',schema:'public',table:'sheets',filter:'id=eq.'+id
  },async () => {
    if (applying) return;
    if (saveTimer) {clearTimeout(saveTimer);saveTimer=null;if(!await saveCloud())return;}
    if (JSON.stringify(sheetPayload())!==lastPayload) {say('Remote change detected. Save a backup of your unsaved changes before reloading.');return;}
    const result=await sb.from('sheets').select('*').eq('id',id).single();
    if(result.error || !result.data || current?.id !== id)return;
    const incoming=JSON.stringify(result.data.payload || {});
    current=result.data;
    if(incoming!==lastPayload){applying=true;window.sicCloudApply(result.data.payload||{});applyLocation(result.data.payload);applying=false;lastPayload=incoming;}
    showPermissions();
    say('Cloud sheet updated · '+current.status);
  }).subscribe();
}
async function saveCloud() {
  if(!canEdit() || applying)return true;
  const sheetId=current.id;
  const payload=sheetPayload();
  const serialized=JSON.stringify(payload);
  if(serialized===lastPayload)return true;
  say('Saving to cloud…');
  const task = async () => {
    const expectedVersion=current?.id===sheetId?current.updated_at:null;
    if(!expectedVersion)return false;
    const {data,error}=await sb.from('sheets').update({payload,sheet_date:String(payload.date||'')}).eq('id',sheetId).eq('status','draft').eq('updated_at',expectedVersion).select('id,updated_at');
    if(error || !data?.length){say('Save blocked: '+(error?errText(error):'Another device changed this sheet. Save a JSON backup before reloading.'));return false;}
    if(current?.id===sheetId){lastPayload=serialized;current.updated_at=data[0].updated_at;}
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
  if(!user||!role)return;
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
for(const id of ['sb-area','sb-line'])$(id).addEventListener('change',()=>{if(!current||canEdit())fillSicIdentity(false);if(current&&canEdit()){clearTimeout(saveTimer);saveTimer=setTimeout(async()=>{if(await saveCloud())await listSheets();},500);}});
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

let managerView='sheet',managerTab='overview',managerSheets=[],managerProfiles=[],managerArea=null,managerLine=null;
const mdEl=(tag,content,cls)=>{const el=document.createElement(tag);if(content!==undefined)el.textContent=String(content);if(cls)el.className=cls;return el;};
$('manager-dashboard-button').addEventListener('click',()=>managerSwitch('dashboard'));
$('manager-cloud-dashboard-button').addEventListener('click',()=>managerSwitch('dashboard'));
function managerSwitch(view){
 if(role!=='manager')return;
 managerView=view;
 document.body.classList.toggle('manager-home',view==='dashboard');
 $('manager-dashboard').hidden=view!=='dashboard';
 $('manager-choice').hidden=true;
 $('sb-panel').hidden=view==='dashboard'||!isRossAdmin();
 $('manager-dashboard-shortcut').hidden=view==='dashboard';
 if(view==='dashboard'){managerArea=null;managerLine=null;setManagerSubpage(false);refreshManager();}
}
function setManagerSubpage(open){
 $('md-back').hidden=!open;
 $('md-summary').hidden=open;
 $('md-areas').hidden=open;
 $('md-tabs').hidden=open;
}
$('md-back').addEventListener('click',()=>{managerArea=null;managerLine=null;setManagerSubpage(false);drawManagerOverview();});
function managerWelcome(){
 // Managers can open the dashboard from the toolbar at any time.
 // Do not interrupt their SIC Sheet with a login choice overlay.
 $('manager-choice').hidden=true;
}
$('md-choose-dashboard').addEventListener('click',()=>managerSwitch('dashboard'));
$('md-choose-sheet').addEventListener('click',()=>managerSwitch('sheet'));
$('md-open-sheet').addEventListener('click',()=>managerSwitch('sheet'));
$('md-refresh').addEventListener('click',()=>refreshManager());
document.querySelectorAll('[data-md-tab]').forEach(btn=>btn.addEventListener('click',()=>{
 if(btn.dataset.mdTab==='accounts'&&!isRossAdmin())return;
 managerTab=btn.dataset.mdTab;
 setManagerSubpage(true);
 for(const name of ['overview','audit','accounts'])$('md-'+name).hidden=name!==managerTab;
 document.querySelectorAll('[data-md-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mdTab===managerTab)));
 refreshManager();
}));
function managerButton(label,handler){const b=mdEl('button',label);b.type='button';b.addEventListener('click',handler);return b;}
function managerTable(headers,rows){
 const table=mdEl('table',undefined,'md-table'),head=mdEl('tr');
 for(const h of headers)head.append(mdEl('th',h));
 table.append(head);
 for(const row of rows){const tr=mdEl('tr');for(const val of row){const td=mdEl('td');if(val instanceof Node)td.append(val);else td.textContent=String(val??'');tr.append(td);}table.append(tr);}
 return table;
}
function managerName(id){const p=managerProfiles.find(x=>x.id===id);return p?.display_name||id?.slice(0,8)||'Unknown';}
function sheetArea(s){return s.payload?.cloud_area||'Unassigned';}
function sheetLine(s){return s.payload?.cloud_line||'Unassigned';}
function drawManagerOverview(area=null,line=null){
 managerArea=area;managerLine=line;
 setManagerSubpage(!!(area&&line));
 const summary=$('md-summary'),areas=$('md-areas'),recent=$('md-recent');
 summary.replaceChildren();areas.replaceChildren();recent.replaceChildren();
 for(const [name,value] of [['Production lines',12],['Cloud sheets',managerSheets.length],['Draft sheets',managerSheets.filter(s=>s.status==='draft').length]]){
  const c=mdEl('div',undefined,'md-card');c.append(mdEl('div',name),mdEl('h2',value));summary.append(c);
 }
 for(let d=1;d<=3;d++){
  const areaName='Deli '+d,c=mdEl('div',undefined,'md-card');c.append(mdEl('h3',areaName));
  const grid=mdEl('div',undefined,'md-lines');
  for(let l=1;l<=4;l++){const lineName='Line '+l,matching=managerSheets.filter(s=>sheetArea(s)===areaName&&sheetLine(s)===lineName);
   grid.append(managerButton(lineName+' · '+matching.length,()=>drawManagerOverview(areaName,lineName)));
  }c.append(grid);areas.append(c);
 }
 $('md-selected-title').textContent=area&&line?area+' / '+line+' · Saved sheets':'Recent sheets';
 const chosen=managerSheets.filter(s=>(!area||sheetArea(s)===area)&&(!line||sheetLine(s)===line)).slice(0,50);
 if(!chosen.length){recent.append(mdEl('p','No saved sheets for this selection.'));return;}
 recent.append(managerTable(['Date','Area / line','Owner','Status','Open'],chosen.map(item=>[
  item.sheet_date||'Undated',sheetArea(item)+' / '+sheetLine(item),item.payload?.cloud_username||managerName(item.owner_id),item.status,
  managerButton('View sheet',async()=>{managerSwitch('sheet');await loadSheet(item.id,true);})
 ])));
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
  if(error)throw error;managerSheets=data||[];
  drawManagerOverview(managerArea,managerLine);
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
  if(authUser?.id && authUser.id===activeUserId && role){user=authUser;showPermissions();return;}
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
      fillSicIdentity(true);
      say('Signed in as '+role+' · checking cloud sheets…');
      const sheets=await listSheets();
      if(sheets){
        if(role==='manager')managerWelcome();
        const localEntries=hasLocalEntries();
        if(sheets.length){
          if(localEntries){
            say('Local data found. Choose a cloud sheet to load, or create a cloud sheet to preserve local work.');
          }else{
            await loadSheet(sheets[0].id,true);
            say('Your latest cloud sheet has loaded automatically on this device.');
          }
        }else if(localEntries){
          say('This device has local SIC data that is not yet in the cloud.');
          if(confirm('Upload this device\'s existing SIC Sheet to your cloud account so it is available on other devices?')){
            if(!$('sb-area').value||!$('sb-line').value){say('Choose a deli area and line, then click Create cloud sheet to upload your work.');return;}
            const payload=sheetPayload();
            const created=await sb.from('sheets').insert({owner_id:user.id,sheet_date:String(payload.date||''),payload,status:'draft'}).select('id').single();
            if(created.error)say('Cloud upload failed: '+errText(created.error));
            else{await listSheets();await loadSheet(created.data.id,true);say('Local SIC Sheet uploaded. It will now be available when you sign in on another device.');}
          }
        }else say('No cloud sheets yet. Create a cloud sheet to sync across devices.');
      }
    }
  }else say('Sign in to open your SIC Sheet.');
  showPermissions();
  } finally {
    refreshing=false;
    if(refreshQueued){refreshQueued=false;queueMicrotask(()=>refreshAccount().catch(error=>{setAccess(false);say('Could not verify login: '+errText(error));}));}
  }
}
sb.auth.onAuthStateChange((event,_session)=>{if(event==='SIGNED_IN'||event==='SIGNED_OUT'||event==='INITIAL_SESSION')setTimeout(()=>refreshAccount().catch(error=>{setAccess(false);say('Could not verify login: '+errText(error));}),0);});
refreshAccount().catch(error=>{setAccess(false);say('Could not verify login: '+errText(error));});
