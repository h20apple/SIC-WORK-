const {test,expect}=require('@playwright/test');
test('XSS payload in SIC saved data stays inert',async({page})=>{
 await page.goto('/index.html');
 await page.waitForFunction(()=>typeof window.sicCloudApply==='function');
 const payload='<img src=x onerror="window.__xssTriggered=true"><svg onload="window.__xssTriggered=true"></svg>';
 await page.evaluate(value=>{window.__xssTriggered=false;window.sicCloudApply({rowCount:9,r0c3:value,actions:value});},payload);
 await expect(page.locator('[data-key="r0c3"]')).toHaveValue(payload);
 expect(await page.evaluate(()=>window.__xssTriggered)).toBe(false);
 expect(await page.locator('img[onerror],svg[onload]').count()).toBe(0);
});
test('CSP blocks inline injected scripts',async({page})=>{
 await page.goto('/index.html');
 await page.evaluate(()=>{window.__cspXss=false;const s=document.createElement('script');s.textContent='window.__cspXss=true';document.body.append(s);});
 expect(await page.evaluate(()=>window.__cspXss)).toBe(false);
});

const ATTACK='<img src=x onerror="window.__xssTriggered=true"><svg onload="window.__xssTriggered=true"></svg>';
async function assertNoExecution(page){
 expect(await page.evaluate(()=>window.__xssTriggered===true)).toBe(false);
 expect(await page.locator('img[onerror],svg[onload]').count()).toBe(0);
}
test('all editable SIC fields safely handle malicious-looking text through save and reload',async({page})=>{
 await page.goto('/index.html');
 await page.waitForFunction(()=>typeof window.sicCloudApply==='function');
 const result=await page.evaluate(payload=>{
  window.__xssTriggered=false;
  const sheet={rowCount:9};
  const editable=[...document.querySelectorAll('[data-key]')].filter(el=>!el.readOnly&&!el.disabled);
  for(const el of editable)sheet[el.dataset.key]=payload;
  window.sicCloudApply(sheet);
  return {count:editable.length,keys:editable.map(el=>el.dataset.key)};
 },ATTACK);
 expect(result.count).toBeGreaterThan(100);
 await assertNoExecution(page);
 // Read-only calculations, numeric formatting and auto-generated fields may legitimately
 // transform values. Check every editable field for executable DOM, not verbatim text.
 await page.evaluate(()=>window.sicCloudRead());
 await page.reload();
 await page.waitForFunction(()=>typeof window.sicCloudRead==='function');
 await assertNoExecution(page);
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('greencore-sic-paper-v12')||'{}'));
 expect(Object.keys(stored).length).toBeGreaterThan(100);
 expect(Object.values(stored).some(v=>typeof v==='string'&&v.includes('<img'))).toBe(true);
});
test('Final Product editable fields render injection strings as values only',async({page})=>{
 await page.goto('/final-product.html');
 await page.evaluate(payload=>{
  window.__xssTriggered=false;
  for(const el of document.querySelectorAll('input:not([type=password]):not([type=hidden]),textarea')){
   if(el.readOnly||el.disabled)continue;
   el.value=payload;
   el.dispatchEvent(new Event('input',{bubbles:true}));
  }
 },ATTACK);
 await assertNoExecution(page);
 expect(await page.locator('input:not([type=password]):not([type=hidden]),textarea').count()).toBeGreaterThan(10);
});
