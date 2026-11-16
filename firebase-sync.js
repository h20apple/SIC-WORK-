import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirestore, doc, getDoc, collection, query, where, getDocs, setDoc, updateDoc, serverTimestamp, onSnapshot } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

const $ = (id) => document.getElementById(id);
const status = (message) => { $('cloud-status').textContent = message; };
const configured = firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('REPLACE_ME') && firebaseConfig.projectId !== 'REPLACE_ME';
if (!configured) {
  status('Cloud setup required — local sheet still works.');
} else {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  let user = null, role = null, sheetId = null, sheetStatus = 'draft', ownerUid = null;
  let unsubscribe = null, timer = null, loading = false, lastPayload = '';
  const panel = $('cloud-panel'), sheetPicker = $('cloud-sheets');
  const errorText = (e) => (e && e.message ? e.message : String(e)).replace(/Firebase: /, '').slice(0, 180);
  function permissions() {
    const canEdit = !!user && !!role && (sheetStatus === 'draft') &&
      (role === 'manager' || role === 'chargeHand' || ownerUid === user.uid);
    const canApprove = !!user && role === 'manager' && !!sheetId;
    $('cloud-approve').hidden = !canApprove || sheetStatus === 'approved';
    $('cloud-reopen').hidden = !canApprove || sheetStatus !== 'approved';
    $('cloud-save').disabled = !canEdit || !sheetId;
    document.querySelectorAll('.paper input,.paper textarea,.sheet .order-toggle,.sheet .circle-toggle').forEach(el => { el.disabled = !!sheetId && !canEdit; });
    $('cloud-edit-note').textContent = sheetId ? (canEdit ? 'Editable cloud draft' : 'Read-only cloud sheet') : 'Local sheet (not synced)';
  }
  function stopWatching() { if (unsubscribe) { unsubscribe(); unsubscribe = null; } }
  function attachSheet(id) {
    stopWatching(); sheetId = id; lastPayload = ''; 
    if (!id) { ownerUid = null; sheetStatus = 'draft'; permissions(); return; }
    unsubscribe = onSnapshot(doc(db, 'sheets', id), snap => {
      if (!snap.exists()) { status('Cloud sheet no longer exists'); return; }
      const item = snap.data(); ownerUid = item.ownerUid; sheetStatus = item.status;
      const payload = JSON.stringify(item.payload || {});
      if (payload !== lastPayload) {
        lastPayload = payload;
        loading = true;
        // Only overwrite the local form after explicit selection/new cloud sheet.
        window.sicCloudApply(item.payload || {});
        loading = false;
      }
      permissions();
      status('Cloud: ' + (item.dateKey || id) + ' · ' + sheetStatus);
    }, e => status('Cloud read failed: ' + errorText(e)));
  }
  async function listSheets() {
    sheetPicker.innerHTML = '<option value="">Select saved sheet…</option>';
    if (!user || !role) return;
    try {
      const base = collection(db, 'sheets');
      const q = (role === 'operator') ? query(base, where('ownerUid', '==', user.uid)) : query(base);
      const result = await getDocs(q);
      const items = result.docs.map(d => ({id:d.id, ...d.data()})).sort((a,b)=> (b.dateKey || '').localeCompare(a.dateKey || ''));
      for (const item of items) {
        const opt = document.createElement('option');
        opt.value = item.id; opt.textContent = (item.dateKey || 'Undated') + ' · ' + item.status + ' · ' + item.id.slice(0,8);
        sheetPicker.append(opt);
      }
      if (sheetId) sheetPicker.value = sheetId;
    } catch(e) { status('Could not list sheets: ' + errorText(e)); }
  }
  async function saveCloud() {
    if (!sheetId || !user || !role || sheetStatus !== 'draft' || loading) return;
    if (!(role === 'manager' || role === 'chargeHand' || ownerUid === user.uid)) return;
    const payload = window.sicCloudRead();
    const serialized = JSON.stringify(payload);
    if (serialized === lastPayload) return;
    try {
      await updateDoc(doc(db,'sheets',sheetId), {payload, updatedAt:serverTimestamp()});
      lastPayload = serialized;
      status('Saved to Firestore');
    } catch(e) { status('Cloud save failed: ' + errorText(e)); }
  }
  window.addEventListener('sic-local-saved', () => {
    if (!sheetId || loading) return;
    clearTimeout(timer); timer = setTimeout(saveCloud, 1100);
  });
  $('cloud-login').addEventListener('submit', async e => {
    e.preventDefault();
    try { await signInWithEmailAndPassword(auth, $('cloud-email').value.trim(), $('cloud-password').value); $('cloud-password').value=''; }
    catch(err) { status('Sign-in failed: ' + errorText(err)); }
  });
  $('cloud-logout').addEventListener('click', async () => { clearTimeout(timer); stopWatching(); await signOut(auth); });
  $('cloud-new').addEventListener('click', async () => {
    if (!user || !role) return;
    if (!confirm('Create a new cloud sheet using the CURRENT on-screen values?')) return;
    try {
      const id = crypto.randomUUID();
      const payload = window.sicCloudRead();
      const dateKey = String(payload.date || '').trim() || new Date().toISOString().slice(0,10);
      await setDoc(doc(db,'sheets',id), {ownerUid:user.uid,dateKey,payload,status:'draft',createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
      await listSheets(); sheetPicker.value=id; attachSheet(id);
    } catch(e) { status('Could not create sheet: ' + errorText(e)); }
  });
  sheetPicker.addEventListener('change', () => {
    if (!sheetPicker.value) return;
    if (!confirm('Open this cloud sheet? It will replace the current on-screen values. Save a JSON backup first if needed.')) { sheetPicker.value=sheetId || ''; return; }
    clearTimeout(timer); attachSheet(sheetPicker.value);
  });
  $('cloud-save').addEventListener('click', async () => { clearTimeout(timer); await saveCloud(); });
  $('cloud-approve').addEventListener('click', async () => {
    if (!user || role !== 'manager' || !sheetId || !confirm('Approve and lock this sheet?')) return;
    try { clearTimeout(timer); await saveCloud(); await updateDoc(doc(db,'sheets',sheetId),{status:'approved',approvedBy:user.uid,approvedAt:serverTimestamp(),updatedAt:serverTimestamp()}); }
    catch(e) { status('Approval failed: '+errorText(e)); }
  });
  $('cloud-reopen').addEventListener('click', async () => {
    if (!user || role !== 'manager' || !sheetId || !confirm('Reopen this approved sheet for editing?')) return;
    try {
      const {deleteField} = await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js');
      await updateDoc(doc(db,'sheets',sheetId),{status:'draft',approvedBy:deleteField(),approvedAt:deleteField(),updatedAt:serverTimestamp()});
    } catch(e) { status('Reopen failed: '+errorText(e)); }
  });
  onAuthStateChanged(auth, async current => {
    clearTimeout(timer); stopWatching(); user=current; role=null; sheetId=null; ownerUid=null;
    $('cloud-login').hidden=!!current; $('cloud-account').hidden=!current;
    $('cloud-identity').textContent=current ? current.email : '';
    sheetPicker.innerHTML='<option value="">Select saved sheet…</option>';
    if (current) {
      try {
        const snap=await getDoc(doc(db,'users',current.uid));
        if (!snap.exists() || snap.data().active !== true || !['operator','chargeHand','manager'].includes(snap.data().role)) {
          status('No active role assigned. Ask the Firebase administrator to create users/'+current.uid);
          $('cloud-account').hidden=true; permissions(); return;
        }
        role=snap.data().role; $('cloud-role').textContent=role;
        status('Signed in · '+role+' · select or create a cloud sheet');
        await listSheets();
      } catch(e) { status('Could not load role: '+errorText(e)); }
    } else status('Sign in to sync sheets. Local editing is still available.');
    permissions();
  });
}
