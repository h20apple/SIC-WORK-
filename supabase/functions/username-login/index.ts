// Deploy with: supabase functions deploy username-login --no-verify-jwt
// Uses the Supabase Auth password verifier; no plaintext passwords are stored here.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors={'Access-Control-Allow-Origin':'https://h20apple.github.io','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 if(req.method!=='POST')return new Response('Method not allowed',{status:405,headers:cors});
 try{
  const {username,password}=await req.json();
  const name=String(username||'').trim().toLowerCase();
  if(!/^[a-z][a-z0-9._-]{2,31}$/.test(name)||typeof password!=='string'||password.length<8)
   return Response.json({error:'Invalid username or password'},{status:401,headers:cors});
  const sb=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{auth:{persistSession:false}});
  const {data,error}=await sb.auth.signInWithPassword({email:name+'@sic-users.invalid',password});
  if(error||!data.session)return Response.json({error:'Invalid username or password'},{status:401,headers:cors});
  return Response.json({access_token:data.session.access_token,refresh_token:data.session.refresh_token},{headers:{...cors,'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Unable to sign in'},{status:400,headers:cors});}
});
