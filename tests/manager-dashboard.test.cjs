const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8'),js=fs.readFileSync('supabase-sync.js','utf8');
test('manager navigation includes overview, staff, audit and accounts',()=>{for(const name of ['overview','staff','audit','accounts'])assert.match(html,new RegExp('data-md-tab="'+name+'"'));});
test('dashboard search and filters are wired to sheet overview',()=>{for(const id of ['md-search','md-filter','md-results-count','md-staff-list'])assert.ok(html.includes('id="'+id+'"'));assert.match(js,/managerSearch=e\.target\.value/);assert.match(js,/managerFilter=e\.target\.value/);});
test('staff directory displays profile access but does not grant account changes',()=>{assert.match(js,/function drawManagerStaff\(/);assert.match(js,/if\(!isRossAdmin\(\)\)/);assert.match(js,/managerTab==='staff'/);});
test('manager values use textContent, not dynamic HTML',()=>{assert.match(js,/el\.textContent=String\(content\)/);assert.match(js,/td\.textContent=String\(val\?\?''\)/);});
