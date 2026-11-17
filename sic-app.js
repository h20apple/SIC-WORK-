
const headers=['Start Time','Finish time','R-code','Product Description','Date code','Order Update','Planned Packs','Packs Produced','LOMA packs total','OAL total reads','Despatch Waste','Dell Rejects','Dell Burst packs','Samples/ Temp packs','Units per tray','Total trays','Extra Loose packs','Extra trays','Redzone'];
const PRODUCT_LOOKUP={
 'R5812':'4 Bean',
 'R5813':'4 Bean',
 'R5538':'OC Honey Roast Salmon Pasta Salad (Small)',
 'R5483':'MS Honey Roast Salmon Pasta',
 'R5537':'OC King Prawn Tomato & Basil Pasta Salad (Large)',
 'R5482':'MS King Prawn Tomato & Basil Pasta',
 'R5746':'MS ND Chipotle Peppers & Jalapeno Houmous',
 'R5739':'MS Honey & Must Chicken P Bowl',
 'R5738':'MS Chicken Bacon Sweetcorn Pasta Salad',
 'R5533':'MS Chicken Bacon Sweetcorn Pasta Salad (Large)',
 'R5485':'MS Feta & Sunblush Tomato Pasta Large',
 'R5539':'OC Feta Cheese & Roasted Tomato Pasta Salad (Large)',
 'R5736':'MS Cafe Naked Slaw 6s',
 'R5509':'MS Tuna & Sweetcorn Pasta Bowl',
 'R5364':'MS Smoked Salmon & Potato Salad',
 'R5673':'MS Beetroot & Feta 23 4s',
 'R5484':'MS Pesto Chicken Pasta',
 'R6044':'OC Orzo & Roasted Tomatoes',
 'R5735':'OC Garlic Baby Potatoes',
 'R5603':'OC Buttery Herb Baby Potatoes',
 'R5542':'OC Tuna Sweetcorn Pasta Salad (Large)',
 'R5742':'OC Super wholegrain Harissa Carrot',
 'R5696':'OC Creamy Greek Dip',
 'R5594':'OC EPD Roast Veg Couscous',
 'R5780':'OC Green Pesto',
 'R5586':'OC Labneh Yogurt dip with a herb dressing',
 'R5587':'OC SPALDING GG EPD',
 'R5467':'OC Buffalo Chicken Dip',
 'R5053':'OC Moroccan Style Fruity Couscous',
 'R5514':'OC Large Moroccan Style Fruity Couscous',
 'R5759':'OC Roasted Red Pepper & Chilli Pesto',
 'R5592':'OC Collection Tzatziki 170g',
 'R5728':'OC Roasted Pepper & Whipped Pecorino',
 'R5752':'OC Bountiful Beans',
 'R5753':'OC Rainbow Rice',
 'R5734':'OC Grains & Greens',
 'R5721':'OC Mexican Chicken Shake-a-grains salad',
 'R5425':'OC Italian Pasta & Spinach Salad (Large Pack)',
 'R5164':'OC Pasta, Spinach & Pine',
 'R5708':'OC Small Tabbouleh',
 'R5481':'OC Avocado, Kale & Grains',
 'R5173':'OC British Potato, Pea & Mint',
 'R5707':'OC British Potato, Pea & Mint',
 'R5600':'OC EPD 4 Bean Salad',
 'R5630':'OC Pesto & Slow Roasted Tomatoes Pasta Bowl',
 'R5541':'OC Honey & Mustard Pasta Salad (Large)',
 'R5681':'OC FETA & BEETROOT',
 'R5535':'OC Chicken Tomato Basil Pasta Salad (Large)',
 'R5543':'OC Chicken Bacon Sweetcorn Pasta Salad (Large)',
 'R5715':'OC Beetroot, Carrot & Whipped Goats Cheese',
 'R5590':'OC Asian Edamame',
 'R5424':'OC Greek Salad',
 'R5536':'OC Pesto Chicken Pasta Salad with Sundried Tomatoes',
 'R5434':'OC Hot Smoked Salmon & New Potato Salad',
 'R5700':'OC Mexican Chicken Pasta Salad',
 'R5559':'OC Herby Feta Dip',
 'R5697':'OC Edamamole - Edamame and Butterbean Crush',
 'R5593':'OC Collections Alvar Dip 170g',
 'R5558':'MS GOATS CHEESE & LENTIL SLD',
 'R5764':'MS Super wholegrain Harissa Carrot',
 'R5614':'MS Orzo & Slow Roasted Tomato',
 'R5751':'MS Garlic Baby Potatoes',
 'R5783':'MS Garlic Baby Potatoes',
 'R5602':'MS Buttery Herb Baby Potatoes',
 'R5732':'MS Big Dill Pot',
 'R5572':'MS Roast Veg Couscous',
 'R5463':'M&S Moroccan Style Fruity Cous Cous',
 'R5686':'M&S Moroccan Style Fruity Cous Cous ROI',
 'R4923':'MS Moroccan Style Couscous',
 'R5609':'MS Moroccan Style Couscous ROI',
 'R5613':'MS Large Moroccan Couscous',
 'R5725':'MS Roasted Pepper & Whipped Pecorino',
 'R5748':'MS Bountiful Beans',
 'R5781':'MS Bountiful Beans',
 'R5749':'MS Rainbow Rice',
 'R5782':'MS Rainbow Rice',
 'R5731':'MS Grains & Greens',
 'R5717':'MS Mexican Chicken Shake-a-grains salad',
 'R5744':'MS Mexican Chicken Shake-a-grains ROI',
 'R5607':'MS Pesto & Slow Roasted Tomatoes Pasta Bowl',
 'R4938':'MS Pasta, Spinach & Pine',
 'R5608':'MS SPINACH & PINENUT ROI',
 'R5611':'MS Large Italian Pasta Spinach PN',
 'R5612':'MS Large Italian Pasta Spinach PN ROI',
 'R5571':'MS 4 Bean Salad',
 'R5573':'MS Beetroot, Carrot & Whipped Goats Cheese',
 'R5675':'MS Asian Edamame',
 'R5458':'MS British Potato Pea & Mint Salad',
 'R5683':'MS British Potato Pea & Mint Salad',
 'R4918':'M&S Avocado Kale & Grains Salad',
 'R5648':'MS Avocado Kale & Grains',
 'R5230':'MS Tabbouleh Salad',
 'R5553':'MS Tabbouleh Salad',
 'R5459':'MS Greek Salad 8’S',
 'R5460':'MS Greek Salad 4’S',
 'R5534':'MS Chicken Tomato Basil Pasta Salad (Large)',
 'R5703':'ROI MS Chicken Tomato Basil Pasta Salad (Large)',
 'R5474':'MS Chicken Tomato Basil Pasta Salad (Large)',
 'R5741':'MS Honey & Must Chicken P Bowl ROI',
 'R5740':'MS Chicken Bacon Sweetcorn Pasta Salad ROI',
 'R5772':'MS Mexican Chicken Pasta Salad',
 'R5771':'MS Mexican Chicken Pasta Salad Export',
 'R5448':'Herby Feta Dip 170g',
 'R5695':'MS Edamamole - Edamame and Butterbean Crush',
 'R5807':'MS Edamame and Butterbean Crush',
 'R5694':'MS Creamy Greek Dip',
 'R5806':'MS Creamy Greek Dip',
 'R5770':'MS Green Pesto',
 'R5679':'Labneh Yogurt Dip 170g',
 'R5579':'MS Spalding GG EPD',
 'R5446':'Buffalo Chicken Dip 6X170G',
 'R5677':'Collection Tzatziki 170g',
 'R5758':'MS Roasted Red Pepper & Chilli Pesto',
 'R5678':'Collections Ajvar Dip 170g'
};
const PRODUCT_DEFAULTS = {
 'R5812':{unitsPerTray:6},
 'R5813':{unitsPerTray:12},
 'R5538':{unitsPerTray:6,samples:5},
 'R5483':{unitsPerTray:6,samples:5},
 'R5537':{unitsPerTray:4,samples:5},
 'R5482':{unitsPerTray:6,samples:5},
 'R5746':{unitsPerTray:6,samples:5},
 'R5739':{unitsPerTray:12,samples:5},
 'R5738':{unitsPerTray:6,samples:5},
 'R5533':{unitsPerTray:12,samples:5},
 'R5485':{unitsPerTray:5,samples:5},
 'R5539':{unitsPerTray:4,samples:5},
 'R5736':{unitsPerTray:6,samples:5},
 'R5509':{unitsPerTray:6,samples:5},
 'R5364':{unitsPerTray:4,samples:5},
 'R5673':{unitsPerTray:4,samples:5},
 'R5484':{unitsPerTray:6,samples:5},
 'R6044':{unitsPerTray:18,samples:5},
 'R5735':{unitsPerTray:6,samples:5},
 'R5603':{unitsPerTray:6,samples:5},
 'R5542':{unitsPerTray:6,samples:5},
 'R5742':{unitsPerTray:10,samples:5},
 'R5696':{unitsPerTray:16,samples:5},
 'R5594':{unitsPerTray:12,samples:5},
 'R5780':{unitsPerTray:18,samples:5},
 'R5586':{unitsPerTray:6,samples:5},
 'R5587':{unitsPerTray:6,samples:5},
 'R5467':{unitsPerTray:6,samples:5},
 'R5053':{unitsPerTray:18,samples:5},
 'R5514':{unitsPerTray:4,samples:5},
 'R5759':{unitsPerTray:6,samples:5},
 'R5592':{unitsPerTray:6,samples:5},
 'R5728':{unitsPerTray:6,samples:5},
 'R5752':{unitsPerTray:6,samples:5},
 'R5753':{unitsPerTray:6,samples:5},
 'R5734':{unitsPerTray:12,samples:5},
 'R5721':{unitsPerTray:4,samples:5},
 'R5425':{unitsPerTray:4,samples:5},
 'R5164':{unitsPerTray:18,samples:5},
 'R5708':{unitsPerTray:4,samples:5},
 'R5481':{unitsPerTray:4,samples:5},
 'R5173':{unitsPerTray:8,samples:5},
 'R5707':{unitsPerTray:4,samples:5},
 'R5600':{unitsPerTray:16,samples:5},
 'R5630':{unitsPerTray:4,samples:5},
 'R5541':{unitsPerTray:6,samples:5},
 'R5681':{unitsPerTray:4,samples:5},
 'R5535':{unitsPerTray:8,samples:5},
 'R5543':{unitsPerTray:8,samples:5},
 'R5715':{unitsPerTray:4,samples:5},
 'R5590':{unitsPerTray:6,samples:5},
 'R5424':{unitsPerTray:8,samples:5},
 'R5536':{unitsPerTray:4,samples:5},
 'R5434':{unitsPerTray:6,samples:5},
 'R5700':{unitsPerTray:4,samples:5},
 'R5559':{unitsPerTray:6,samples:5},
 'R5697':{unitsPerTray:6,samples:5},
 'R5593':{unitsPerTray:6,samples:5},
 'R5558':{unitsPerTray:6,samples:5},
 'R5764':{unitsPerTray:4,samples:5},
 'R5614':{unitsPerTray:8,samples:5},
 'R5751':{unitsPerTray:6,samples:5},
 'R5783':{unitsPerTray:4,samples:5},
 'R5602':{unitsPerTray:6,samples:5},
 'R5732':{unitsPerTray:6,samples:5},
 'R5572':{unitsPerTray:12,samples:5},
 'R5463':{unitsPerTray:18,samples:5},
 'R5686':{unitsPerTray:18,samples:5},
 'R4923':{unitsPerTray:12,samples:5},
 'R5609':{unitsPerTray:12,samples:5},
 'R5613':{unitsPerTray:6,samples:5},
 'R5725':{unitsPerTray:6,samples:5},
 'R5748':{unitsPerTray:6,samples:5},
 'R5781':{unitsPerTray:4,samples:5},
 'R5749':{unitsPerTray:6,samples:5},
 'R5782':{unitsPerTray:4,samples:5},
 'R5731':{unitsPerTray:4,samples:5},
 'R5717':{unitsPerTray:6,samples:5},
 'R5744':{unitsPerTray:6,samples:5},
 'R5607':{unitsPerTray:4,samples:5},
 'R4938':{unitsPerTray:16,samples:5},
 'R5608':{unitsPerTray:16,samples:5},
 'R5611':{unitsPerTray:6,samples:5},
 'R5612':{unitsPerTray:6,samples:5},
 'R5571':{unitsPerTray:8,samples:5},
 'R5573':{unitsPerTray:4,samples:5},
 'R5675':{unitsPerTray:4,samples:5},
 'R5458':{unitsPerTray:4,samples:5},
 'R5683':{unitsPerTray:4,samples:5},
 'R4918':{unitsPerTray:6,samples:5},
 'R5648':{unitsPerTray:4,samples:5},
 'R5230':{unitsPerTray:6,samples:5},
 'R5553':{unitsPerTray:4,samples:5},
 'R5459':{unitsPerTray:8,samples:5},
 'R5460':{unitsPerTray:4,samples:5},
 'R5534':{unitsPerTray:12,samples:5},
 'R5703':{unitsPerTray:6,samples:5},
 'R5474':{unitsPerTray:6,samples:5},
 'R5741':{unitsPerTray:12,samples:5},
 'R5740':{unitsPerTray:6,samples:5},
 'R5772':{unitsPerTray:6,samples:5},
 'R5771':{unitsPerTray:6,samples:5},
 'R5448':{unitsPerTray:4,samples:5},
 'R5695':{unitsPerTray:6,samples:5},
 'R5807':{unitsPerTray:4,samples:5},
 'R5694':{unitsPerTray:6,samples:5},
 'R5806':{unitsPerTray:4,samples:5},
 'R5770':{unitsPerTray:6,samples:5},
 'R5679':{unitsPerTray:4,samples:5},
 'R5579':{unitsPerTray:6,samples:5},
 'R5446':{unitsPerTray:6,samples:5},
 'R5677':{unitsPerTray:4,samples:5},
 'R5758':{unitsPerTray:6,samples:5},
 'R5678':{unitsPerTray:4,samples:5}
};
function fillProductDefaults(tr){
 const code=tr.children[2].firstChild.value.trim().toUpperCase();
 const normalized=/^R?\d+$/.test(code)?'R'+code.replace(/^R/,''):code;
 const defaults=PRODUCT_DEFAULTS[normalized];
 if(!defaults)return;
 for(const [col,value] of [[14,defaults.unitsPerTray]]){
   if(value===undefined||value===null)continue;
   const field=tr.children[col].firstChild;
   const previous=field.dataset.lookupValue||'';
   if(!field.value.trim()||field.value===previous){field.value=String(value);field.dataset.lookupValue=String(value)}
 }
 calculate(tr);
}
function fillProduct(tr){
 const code=tr.children[2].firstChild.value.trim().toUpperCase();
 const normalized=/^R?\d+$/.test(code)?'R'+code.replace(/^R/,''):code;
 const product=tr.children[3].firstChild;
 if(PRODUCT_LOOKUP[normalized]){
   const previous=product.dataset.lookupValue||'';
   if(!product.value.trim()||product.value===previous){product.value=PRODUCT_LOOKUP[normalized];product.dataset.lookupValue=product.value;}
 }
}
const head=document.getElementById('head'),body=document.getElementById('rows');const printHeaders=['Start<br>Time','Finish<br>Time','R-code','Product<br>Description','Date<br>Code','Order<br>Update','Planned<br>Packs','Packs<br>Produced','LOMA<br>Packs','OAL<br>Reads','Despatch<br>Waste','Dell<br>Rejects','Dell Burst<br>Packs','Samples /<br>Temp Packs','Units per<br>Tray','Total<br>Trays','Extra Loose<br>Packs','Extra<br>Trays','Redzone'];headers.forEach((h,i)=>{let th=document.createElement('th');const screen=document.createElement('span');screen.className='screen-heading';screen.textContent=h;const printed=document.createElement('span');printed.className='print-heading';printed.innerHTML=printHeaders[i];th.append(screen,printed);head.append(th)});const KEY='greencore-sic-paper-v12';let data={};try{data=JSON.parse(localStorage.getItem(KEY))||{};}catch(e){}function save(){renderEndShift();document.querySelectorAll('[data-key]').forEach(el=>data[el.dataset.key]=el.value);try{localStorage.setItem(KEY,JSON.stringify(data))}catch(e){console.warn('Autosave unavailable in this viewer',e)};window.dispatchEvent(new Event('sic-local-saved'))}function renderEndShift(){
 const footer=document.getElementById('end-shift-footer');
 footer.hidden=!data.endShift;
 const button=document.getElementById('end-shift-button');
 button.textContent=data.endShift?'Undo end shift':'End shift';
 button.setAttribute('aria-pressed',String(!!data.endShift));
 // Keep blank rows in the saved document, but hide them below the last
 // populated product so the end-of-shift marker sits immediately beneath it.
 const rows=[...document.querySelectorAll('#rows > tr')];
 let lastUsed=-1;
 rows.forEach((tr,i)=>{
  const populated=[0,1,2,3,4,6,14,15].some(j=>String(tr.children[j]?.querySelector('input')?.value||'').trim()!=='');
  if(populated)lastUsed=i;
 });
 rows.forEach((tr,i)=>{
  const hide=!!data.endShift&&i>Math.max(0,lastUsed);
  tr.classList.toggle('end-shift-unused',hide);
  tr.style.setProperty('display',hide?'none':'','important');
 });
}
function endShift(){if(data.endShift){if(!confirm('Remove the end-of-shift marker?'))return;data.endShift=false;}else{if(!confirm('Submit this completed shift for manager review?'))return;data.endShift=true;}renderEndShift();save();window.dispatchEvent(new CustomEvent('sic-end-shift',{detail:{ended:!!data.endShift}}));}
function newSheet(){
 if(!confirm('Start a new blank SIC Sheet? Save a backup first if you need the current data.'))return;
 data={};renderEndShift();
 try{localStorage.removeItem(KEY)}catch(e){}
 document.querySelectorAll('.meta input,.comment input').forEach(el=>el.value='');
 document.querySelector('[data-key="version"]').value='v1.2 by Ross Hutton';
 document.querySelector('[data-key="page"]').value='1';
 body.innerHTML='';
 for(let i=0;i<9;i++)addRow();
 refreshTotals();save();
}
const DOLLY_DEPOTS=[['ROI','R.O.I'],['NI','NI'],['ENFIELD','Enfield'],['FAVERSHAM','Faversham'],['BRISTOL','Bristol'],['THATCHAM','Thatcham'],['HEMEL','Hemel'],['BARNSLEY','Barnsley'],['CREWE','Crewe'],['CUMBERNAULD','Cumbernauld']];
function expandDepotOrder(value){
 const raw=String(value||'').trim();
 // Accept 36E, 36 E, 36BR, 36 BA, 36ROI, etc.
 const match=raw.match(/^(\d+)\s*[- ]?\s*([a-z.]+)$/i);
 if(!match)return raw;
 const qty=match[1],prefix=match[2].toUpperCase().replace(/\./g,'');
 const found=DOLLY_DEPOTS.filter(([code,name])=>code.startsWith(prefix)||name.toUpperCase().replace(/[^A-Z]/g,'').startsWith(prefix));
 if(found.length!==1)return raw; // Ambiguous prefixes (B, C) remain unchanged.
 return qty+' '+found[0][1];
}
function addRow(){let i=body.children.length;let tr=document.createElement('tr');headers.forEach((h,j)=>{let td=document.createElement('td'),inp=document.createElement(j===18?'textarea':'input');inp.setAttribute('aria-label',h+' row '+(i+1));inp.dataset.key='r'+i+'c'+j;inp.value=data[inp.dataset.key]||'';if(j===0||j===1){inp.inputMode='numeric';inp.maxLength=5;inp.placeholder='00:00';inp.addEventListener('input',()=>{inp.value=inp.value.trim()==='='?'=':formatTime(inp.value);refreshTotals();save()})}else if(j===4){inp.inputMode='numeric';inp.maxLength=10;inp.placeholder='DD/MM/YYYY';inp.addEventListener('input',()=>{inp.value=formatDate(inp.value);save()})}else if(j===5){
 inp.autocomplete='off';inp.placeholder='e.g. 36E, 36BR';
 const fitDepot=()=>{const text=inp.value.trim();inp.style.fontSize=text.length>17?'8px':text.length>13?'9px':text.length>10?'10px':'12px';};
 const expand=()=>{const expanded=expandDepotOrder(inp.value);if(expanded!==inp.value){inp.value=expanded;save();}fitDepot();};
 inp.addEventListener('change',expand);
 inp.addEventListener('blur',expand);
 inp.addEventListener('input',()=>{fitDepot();save();});
 inp.addEventListener('keydown',event=>{
  if(event.key==='Enter'){event.preventDefault();expand();inp.blur();}
  if(event.key===' '){const expanded=expandDepotOrder(inp.value);if(expanded!==inp.value.trim()){event.preventDefault();inp.value=expanded;fitDepot();save();}}
 });
 fitDepot();
 }else if(j===7||j===17){inp.readOnly=true;inp.tabIndex=-1;inp.title=j===7?'Units per tray × Total trays':'Extra Loose packs ÷ Units per tray';inp.className='calculated'}else{if(j===14||j===15||j===16)inp.inputMode='decimal';inp.addEventListener('input',()=>{if(j===13)delete inp.dataset.autoFinishSamples;if(j===2){
 const productField=tr.children[3].firstChild;
 if(productField.dataset.lookupValue && productField.value===productField.dataset.lookupValue)productField.value='';
 const unitField=tr.children[14].firstChild;
 if(unitField.dataset.lookupValue && unitField.value===unitField.dataset.lookupValue)unitField.value='';
 fillProduct(tr);fillProductDefaults(tr);
}if([2,3,10,11,12,13,14,15,16].includes(j))calculate(tr);refreshTotals();save()})}td.append(inp);if(j===5){td.classList.add('order-cell');td.classList.toggle('manager-yellow',!!data['managerYellow'+i]);td.setAttribute('title',data['managerYellow'+i]?'Tap to remove yellow highlight':'Tap to highlight yellow');td.addEventListener('click',event=>{if(!window.sicManagerReviewMode||event.target.closest('button'))return;const key='managerYellow'+i;data[key]=!data[key];td.classList.toggle('manager-yellow',!!data[key]);td.setAttribute('title',data[key]?'Tap to remove yellow highlight':'Tap to highlight yellow');save();window.dispatchEvent(new Event('sic-manager-highlight'));});let toggle=document.createElement('button');toggle.type='button';toggle.className='order-toggle';toggle.textContent='✓';toggle.title='Toggle green order update highlight';toggle.setAttribute('aria-label','Mark order updated green');toggle.addEventListener('click',()=>{data['orderGreen'+i]=!data['orderGreen'+i];refreshHighlights();save()});td.append(toggle)}if(j===11||j===13){td.classList.add('circle-cell');td.classList.toggle('circled',!!data['circled'+i+'c'+j]);let circle=document.createElement('button');circle.type='button';circle.className='circle-toggle';circle.textContent=data['circled'+i+'c'+j]?'✓':'○';circle.title='Tap to circle or uncircle this count';circle.setAttribute('aria-label','Circle '+h+' row '+(i+1));circle.setAttribute('aria-pressed',String(!!data['circled'+i+'c'+j]));circle.addEventListener('click',()=>{const k='circled'+i+'c'+j;data[k]=!data[k];td.classList.toggle('circled',data[k]);circle.textContent=data[k]?'✓':'○';circle.setAttribute('aria-pressed',String(data[k]));save()});td.append(circle)}tr.append(td)});body.append(tr);fillProduct(tr);fillProductDefaults(tr);calculate(tr);data.rowCount=body.children.length;refreshTotals();save()}for(let i=0;i<Math.max(9,Math.min(100,Number(data.rowCount)||9));i++)addRow();renderEndShift();document.querySelectorAll('.paper [data-key]').forEach(el=>{if(data[el.dataset.key]!==undefined)el.value=data[el.dataset.key];if(el.classList.contains('date-field'))el.addEventListener('input',()=>{el.value=formatDate(el.value);save()});else el.addEventListener('input',save)});document.querySelector('[data-key="version"]').value='v1.2 by Ross Hutton';save();function formatTime(v){if(v.trim()==='=')return '=';let d=v.replace(/\D/g,'').slice(0,4);return d.length>2?d.slice(0,2)+':'+d.slice(2):d}function formatDate(v){let d=v.replace(/\D/g,'').slice(0,8);return [d.slice(0,2),d.slice(2,4),d.slice(4,8)].filter(Boolean).join('/')}function calculate(tr){let a=Number(tr.children[14]?.firstChild.value),b=Number(tr.children[15]?.firstChild.value),out=tr.children[7]?.firstChild;if(out){const base=(tr.children[14].firstChild.value!==''&&tr.children[15].firstChild.value!=='')?a*b:0;const description=tr.children[3].firstChild.value.trim();const isOC=/\bOC\b/i.test(description);const extras=isOC?0:[10,11,12,13,16].reduce((sum,col)=>sum+(Number(tr.children[col].firstChild.value)||0),0);out.value=(base||extras||tr.children[14].firstChild.value!==''&&tr.children[15].firstChild.value!=='')?String(base+extras):'';}const extra=tr.children[16]?.firstChild.value.trim(),tray=tr.children[14]?.firstChild.value.trim(),extraOut=tr.children[17]?.firstChild;if(extraOut){const qty=Number(extra),units=Number(tray);extraOut.value=extra!==''&&tray!==''&&Number.isFinite(qty)&&Number.isFinite(units)&&units>0&&qty>=0?String(Math.floor(qty/units)):''}}function refreshHighlights(){
 for(const [i,tr] of [...body.children].entries()){
  const packs=tr.children[7].firstChild.value.trim(),oal=tr.children[9].firstChild.value.trim();
  tr.children[9].classList.toggle('oal-green',packs!==''&&oal!==''&&Number.isFinite(Number(oal))&&Number(oal)>Number(packs));
  tr.children[5].classList.toggle('order-green',!!data['orderGreen'+i]);
 }
}
function refreshTotals(){refreshHighlights();
 const trs=[...body.children], groups=[];
 // Reposition only sample values inserted automatically by this feature.
 for(const tr of trs){const field=tr.children[13].firstChild;if(field.dataset.autoFinishSamples==='1'){field.value='';delete field.dataset.autoFinishSamples;calculate(tr);}}
 for(let i=0;i<trs.length;i++){
  const cells=trs[i].querySelectorAll('input');
  const continuation=cells[0].value.trim()==='='||cells[1].value.trim()==='=';
  if(continuation&&groups.length)groups[groups.length-1].push(i);
  else groups.push([i]);
 }
 // Clear only order updates that this calculation previously generated.
 for(const tr of trs){
  const order=tr.children[5].firstChild;
  if(order.dataset.autoOrder==='1'){
   if(order.value===order.dataset.autoOrderText)order.value='';
   delete order.dataset.autoOrder;delete order.dataset.autoOrderText;
  }
 }
 // Remove previous automatic results before recalculating.
 for(const tr of trs){
  const comment=tr.children[18].firstChild;
  if(comment.dataset.autoSummary==='1'){
   comment.value='';delete comment.dataset.autoSummary;
  }
 }
 for(const group of groups){
  // A finished product is identified by a valid finish time (HH:MM).
  // For continued products, the last row with a finish time closes the run.
  const finished=group.filter(idx=>{
   const v=trs[idx].children[1].firstChild.value.trim();
   if(!/^\d{2}:\d{2}$/.test(v))return false;
   const [h,m]=v.split(':').map(Number);
   return h<24&&m<60;
  });
  if(!finished.length)continue;
  const finishIdx=finished[finished.length-1];
  // Put the automatic sample count on the row that actually finishes the product.
  // Never overwrite a manually entered sample count.
  const finishRow=trs[finishIdx];
  const productCode=group.map(idx=>trs[idx].children[2].firstChild.value.trim().toUpperCase()).find(Boolean)||'';
  const normalizedCode=/^R?\d+$/.test(productCode)?'R'+productCode.replace(/^R/,''):productCode;
  const defaultSamples=PRODUCT_DEFAULTS[normalizedCode]?.samples == null ? null : Number(PRODUCT_DEFAULTS[normalizedCode].samples) + 1;
  if(defaultSamples!=null){
   const sampleField=finishRow.children[13].firstChild;
   if(!sampleField.value.trim()||sampleField.dataset.autoFinishSamples==='1'){
    sampleField.value=String(defaultSamples);
    sampleField.dataset.autoFinishSamples='1';
    calculate(finishRow);
   }
  }
  let total=0, waste=0;
  // Sum the displayed Packs Produced values; extras are included there for non-OC products.
  const productDescription=group.map(idx=>trs[idx].children[3].firstChild.value.trim()).find(Boolean)||'';
  const isOC=/\bOC\b/i.test(productDescription);
  for(const idx of group){
   const row=trs[idx];
   const produced=Number(row.children[7].firstChild.value)||0;
   const despatchWaste=Number(row.children[10].firstChild.value)||0;
   const dellRejects=Number(row.children[11].firstChild.value)||0;
   const dellBurstPacks=Number(row.children[12].firstChild.value)||0;
   const samples=Number(row.children[13].firstChild.value)||0;
   const loosePacks=Number(row.children[16].firstChild.value)||0;
   total+=produced; // Packs Produced already includes extras for non-OC products.
   waste+=despatchWaste+dellRejects;
  }
  const comment=trs[finishIdx].children[18].firstChild;
  comment.value=`Packs ${total}\nWaste ${waste}`;
  comment.dataset.autoSummary='1';
  comment.title=comment.value;

 }
 refreshHighlights();
 if(window.__sicFitReady)fitAllFields();
}

refreshTotals();

function syncPrintValues(){
 document.querySelectorAll('.print-value').forEach(el=>el.remove());
 document.querySelectorAll('.paper input, .paper textarea').forEach(inp=>{
   const span=document.createElement('span');
   span.className='print-value';
   span.textContent=inp.value||' ';
   inp.insertAdjacentElement('afterend',span);
 });
}
window.addEventListener('beforeprint',()=>{fitAllFields();syncPrintValues()});
// Measure text against the actual input width and shrink its font until it fits.
// This also runs after automatic product-name and totals updates.
const fitCanvas=document.createElement('canvas');
const fitCtx=fitCanvas.getContext('2d');
function fitField(el){
 if(!el || !el.matches('input'))return;
 const isCell=!!el.closest('.sheet td');
 const base=isCell?12:10, minimum=isCell?6:8;
 el.style.fontSize=base+'px';
 const available=Math.max(10,el.clientWidth- (isCell?9:12) - (el.closest('.order-cell')?22:0));
 const value=el.value||el.placeholder||'';
 if(!value)return;
 let size=base;
 while(size>minimum){
  fitCtx.font=size+'px Arial';
  if(fitCtx.measureText(value).width<=available)break;
  size-=0.25;
 }
 el.style.fontSize=Math.max(minimum,size)+'px';
 el.title=el.value||'';
}
function fitAllFields(){document.querySelectorAll('.paper input').forEach(fitField)}
document.addEventListener('input',e=>{if(e.target.matches('.paper input'))requestAnimationFrame(fitAllFields)},true);
const fitObserver=new MutationObserver(()=>requestAnimationFrame(fitAllFields));
fitObserver.observe(document.getElementById('rows'),{childList:true,subtree:true});
window.addEventListener('resize',fitAllFields);
window.addEventListener('load',fitAllFields);
window.__sicFitReady=true;
requestAnimationFrame(fitAllFields);

function printSheet(){
  renderEndShift();syncPrintValues();
  save();
  // iOS Files/ChatGPT preview can suppress window.print(). Safari supports it.
  const ua=navigator.userAgent||'';
  const embedded=/ChatGPT|FBAN|FBAV|Instagram|Line\//i.test(ua);
  if(embedded){
    alert('For printing on iPhone, open this SIC Sheet in Safari, then tap Print / PDF. If using Files preview, use Share > Print.');
    return;
  }
  if(typeof window.print==='function'){
    try{window.focus();window.print()}catch(e){alert('Printing is unavailable in this viewer. Open the sheet in Safari and choose Share > Print.');}
  }else alert('Open this page in Safari, then choose Share > Print.');
}

function exportData(){save();let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download='SIC-sheet-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}function restoreData(e){let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{try{const parsed=JSON.parse(r.result);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error('Invalid sheet');data=parsed;localStorage.setItem(KEY,JSON.stringify(data));location.reload()}catch(e){alert('Invalid backup file')}};r.readAsText(f)}
if('serviceWorker' in navigator){
 navigator.serviceWorker.getRegistrations().then(regs=>Promise.all(regs.filter(r=>r.scope.startsWith(location.origin+location.pathname.replace(/[^/]*$/,''))).map(r=>r.unregister()))).catch(()=>{});
}
window.sicCloudRead=()=>{save();data.rowCount=body.children.length;return JSON.parse(JSON.stringify(data));};
window.sicClearPrivate=()=>{data={};renderEndShift();body.innerHTML='';document.querySelectorAll('.paper input,.paper textarea').forEach(el=>{el.value='';});try{localStorage.removeItem(KEY)}catch(e){};};
window.sicCloudApply=payload=>{
 if(!payload||typeof payload!=='object'||Array.isArray(payload))return;
 data=JSON.parse(JSON.stringify(payload));renderEndShift();body.innerHTML='';
 for(let i=0;i<Math.max(9,Math.min(100,Number(data.rowCount)||9));i++)addRow();
 document.querySelectorAll('.meta input,.comment input,.footer input').forEach(el=>{
   el.value=data[el.dataset.key]===undefined?'':String(data[el.dataset.key]);
 });
 // Fill missing fields from the authenticated staff and selected cloud location.
 const identity=window.sicSignedInIdentity;
 if(identity){
  for(const [key,value] of Object.entries({leader:identity.name,dell:identity.area,line:identity.line})){
   const input=document.querySelector('.meta input[data-key="'+key+'"]');
   if(input&&value&&!input.value.trim())input.value=value;
  }
 }
 refreshTotals();save();
};

document.getElementById('local-new')?.addEventListener('click',newSheet);
document.getElementById('local-add')?.addEventListener('click',addRow);
document.getElementById('end-shift-button')?.addEventListener('click',endShift);
document.getElementById('local-backup')?.addEventListener('click',exportData);
document.getElementById('local-restore')?.addEventListener('click',()=>document.getElementById('restore').click());
document.getElementById('restore')?.addEventListener('change',restoreData);
document.getElementById('local-print')?.addEventListener('click',printSheet);
