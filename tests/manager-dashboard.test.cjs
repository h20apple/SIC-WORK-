const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8'),js=fs.readFileSync('supabase-sync.js','utf8');
test('manager navigation includes overview, staff, audit and accounts',()=>{for(const name of ['overview','insights','staff','audit','accounts'])assert.match(html,new RegExp('data-md-tab="'+name+'"'));});
test('dashboard search and filters are wired to sheet overview',()=>{for(const id of ['md-search','md-filter','md-results-count','md-staff-list'])assert.ok(html.includes('id="'+id+'"'));assert.match(js,/managerSearch=e\.target\.value/);assert.match(js,/managerFilter=e\.target\.value/);});
test('staff directory displays profile access but does not grant account changes',()=>{assert.match(js,/function drawManagerStaff\(/);assert.match(js,/if\(!isRossAdmin\(\)\)/);assert.match(js,/managerTab==='staff'/);});
test('manager values use textContent, not dynamic HTML',()=>{assert.match(js,/el\.textContent=String\(content\)/);assert.match(js,/td\.textContent=String\(val\?\?''\)/);});

test('production insights and CSV export are available',()=>{assert.match(html,/id="md-insights-list"/);assert.match(js,/function drawManagerInsights\(/);assert.match(js,/Download sheet summary \(CSV\)/);assert.match(js,/managerTab==='insights'/);});
test('phone layout uses card tables and compact metrics',()=>{assert.match(html,/@media\(max-width:700px\)/);assert.match(html,/content:attr\(data-label\)/);assert.match(js,/td\.dataset\.label=/);});

test('manager opens dashboard and cannot create or edit SIC records',()=>{
 assert.match(js,/managerWelcome\(\)[\s\S]*?managerSwitch\('dashboard'\)/);
 assert.match(js,/role==='charge_hand' && current && current\.status === 'draft'/);
 assert.match(js,/\$\('sb-new'\)\.disabled = role!=='charge_hand'/);
 assert.match(js,/el\.disabled = role==='manager'/);
 assert.match(js,/role==='manager' \|\| !!current/);
 assert.match(js,/Only Charge Hands can create SIC sheets/);
 assert.match(js,/if\(view==='sheet'&&!current\)/);
});
test('manager can review and approve existing SIC sheets',()=>{
 assert.match(js,/managerButton\('Review sheet'/);
 assert.match(js,/\$\('sb-approve'\)\.addEventListener/);
 assert.match(js,/\$\('sb-reopen'\)\.addEventListener/);
 assert.match(html,/manager-review-only/);
});

test('manager SIC deletion requires explicit confirmation and checks deleted row',()=>{
 assert.match(js,/async function deleteManagerSheet\(item\)/);
 assert.match(js,/role!=='manager'/);
 assert.match(js,/type DELETE/);
 assert.match(js,/typed!=='DELETE'/);
 assert.match(js,/\.from\('sheets'\)\.delete\(\)\.eq\('id',item\.id\)\.select\('id'\)/);
 assert.match(js,/if\(!data\?\.length\)/);
 assert.match(html,/md-delete/);
});
