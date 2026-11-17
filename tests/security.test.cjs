const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const sources=['index.html','final-product.html','supabase-sync.js','final-product.js'].map(path=>({path,source:fs.readFileSync(path,'utf8')}));
test('No dynamic HTML execution or unsafe string-to-code sinks',()=>{
 for(const {path,source} of sources){
  assert.doesNotMatch(source,/\b(?:eval|Function)\s*\(/,path+' evaluates code');
  assert.doesNotMatch(source,/\bdocument\.write\s*\(/,path+' writes HTML');
  assert.doesNotMatch(source,/\binsertAdjacentHTML\s*\(/,path+' injects HTML');
  assert.doesNotMatch(source,/\.outerHTML\s*=/,path+' sets outerHTML');
  assert.doesNotMatch(source,/\bsrcdoc\s*=/,path+' sets srcdoc');
  assert.doesNotMatch(source,/\bsetTimeout\s*\(\s*['"`]/,path+' uses string timer');
 }
});
test('HTML injection sinks are limited to audited static literals and clearing',()=>{
 const sic=fs.readFileSync('index.html','utf8');
 const sync=fs.readFileSync('supabase-sync.js','utf8');
 const final=fs.readFileSync('final-product.js','utf8');
 const uses=(s)=>[...s.matchAll(/\.innerHTML\s*=\s*([^;]+);/g)].map(m=>m[1].trim());
 assert.deepEqual(uses(sic),['printHeaders[i]','\'\'','\'\'','\'\'']);
 assert.deepEqual(uses(sync),["'<option value=\"\" >Choose saved sheet…</option>'".replace(' \\>','>')]);
 assert.deepEqual(uses(final),[]);
 assert.match(sic,/screen\.textContent=h/);
 assert.match(sic,/span\.textContent=inp\.value/);
 assert.match(sync,/option\.textContent=/);
 assert.match(sync,/td\.textContent=/);
});
test('No inline event-handler attributes in application HTML',()=>{
 for(const {path,source} of sources.filter(f=>f.path.endsWith('.html')))
  assert.doesNotMatch(source,/\son(?:click|error|load|mouseover|focus|input|change)\s*=/i,path);
});
