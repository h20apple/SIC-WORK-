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
