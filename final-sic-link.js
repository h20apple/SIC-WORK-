import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {supabaseUrl,supabasePublishableKey} from './supabase-config.js';
const sb=createClient(supabaseUrl,supabasePublishableKey);
const $=id=>document.getElementById(id);
const clean=v=>String(v||'').trim();
const lineNumber=v=>clean(v).replace(/^line\s*/i,'');
const dateValue=()=>clean(document.querySelector('.paper [data-key="date"]')?.value);
let matches=[],lastKey='',busy=false;
const status=t=>$('fp-match-status').textContent=t;
function canImport(){
 return document.getElementById('sb-role')?.textContent?.trim()==='charge_hand' &&
        !window.sicManagerReviewMode;
}
function key(){return [clean($('sb-area').value),lineNumber($('sb-line').value),dateValue()].join('|');}
function productRows(record){
 const rows=record.payload?.rows;
 return Array.isArray(rows)?rows.filter(r=>clean(r.rCode)): [{rCode:record.r_code,totalTrays:record.total_trays,burstPacks:record.burst_packs}];
}
function render(){
 const root=$('fp-match-results');root.replaceChildren();
 for(const record of matches){
  const wrap=document.createElement('div');wrap.style.cssText='margin:6px 0;padding:7px;border-top:1px solid #a7c3b4';
  const title=document.createElement('strong');title.textContent='Operator sheet · '+record.production_date+' · '+record.deli+' · Line '+lineNumber(record.line);wrap.append(title);
  for(const row of productRows(record)){
   const item=document.createElement('div');item.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:5px 0';
   const text=document.createElement('span');text.textContent=clean(row.rCode)+' · Trays: '+(row.totalTrays||'—')+' · Burst: '+(row.burstPacks||'—');item.append(text);
   const button=document.createElement('button');button.type='button';button.textContent='Fill blank SIC row';button.disabled=!canImport();
   button.addEventListener('click',()=>importRow(row,record));item.append(button);wrap.append(item);
  }
  root.append(wrap);
 }
}
function importRow(row,record){
 if(!canImport()){status('Only Charge Hands editing an unlocked SIC sheet can import product details.');return;}
 if(record.deli!==$('sb-area').value||lineNumber(record.line)!==lineNumber($('sb-line').value)||record.production_date!==dateValue()){
  status('Deli, line or date changed. Refresh the matching operator checks.');return;
 }
 const code=clean(row.rCode).toUpperCase().replace(/\s/g,'');
 if(!/^R\d+$/.test(code)){status('Operator row has no valid R-code.');return;}
 const rows=[...document.querySelectorAll('#rows tr')];
 const target=rows.find(tr=>[2,3,14,15].every(i=>!clean(tr.children[i]?.querySelector('input,textarea')?.value)));
 if(!target){status('No blank SIC product row available. Add a blank row before importing.');return;}
 const input=target.children[2]?.querySelector('input');
 if(!input){status('Could not find a blank SIC R-code field.');return;}
 input.value=code;input.dispatchEvent(new Event('input',{bubbles:true}));
 // Operator checks are evidence only: do not copy tray totals, rejects, waste or sample counts into SIC.
 status('Imported '+code+' into a blank SIC row. Check product details and enter actual SIC pack totals.');
}
async function refresh(){
 if(busy)return;
 const deli=clean($('sb-area').value),line=lineNumber($('sb-line').value),date=dateValue();
 if(!deli||!line||!date){matches=[];render();status('Select Deli, Line and SIC date to match operator checks.');return;}
 busy=true;lastKey=key();status('Checking matching operator records…');
 try{
  const {data:{user}}=await sb.auth.getUser();
  if(!user){matches=[];render();status('Sign in to view operator records.');return;}
  const {data,error}=await sb.from('final_product_checks').select('id,deli,line,production_date,r_code,total_trays,burst_packs,payload,updated_at').eq('deli',deli).eq('production_date',date).order('updated_at',{ascending:false}).limit(150);
  if(error)throw error;
  if(lastKey!==key())return;
  matches=(data||[]).filter(x=>lineNumber(x.line)===line);
  render();status(matches.length+' matching Final Product sheet(s) for '+deli+' · Line '+line+' · '+date+'. No other lines are included.');
 }catch(e){matches=[];render();status('Could not load operator checks: '+e.message);}
 finally{busy=false;}
}
$('fp-match-refresh').addEventListener('click',refresh);
$('sb-area').addEventListener('change',refresh);
$('sb-line').addEventListener('change',refresh);
document.addEventListener('change',e=>{if(e.target?.dataset?.key==='date')refresh();});
sb.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT'){matches=[];render();status('Sign in to view matching checks.');}else if(event==='SIGNED_IN')setTimeout(refresh,0);});
setInterval(()=>{if(!document.hidden&&$('fp-match-panel').offsetParent!==null&&key()!==lastKey)refresh();},5000);
