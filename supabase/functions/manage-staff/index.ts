// Deploy with: supabase functions deploy manage-staff
// Requires service-role secret only in the Supabase Edge Function environment.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors={'Access-Control-Allow-Origin':'https://h20apple.github.io','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 if(req.method!=='POST')return new Response('Method not allowed',{status:405,headers:cors});
 const bearer=req.headers.get('Authorization')||'';
 if(!bearer.startsWith('Bearer '))return Response.json({error:'Unauthorised'},{status:401,headers:cors});
 const url=Deno.env.get('SUPABASE_URL')!;
 const pub=Deno.env.get('SUPABASE_ANON_KEY')!;
 const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 const authClient=createClient(url,pub,{auth:{persistSession:false}});
 const {data:{user},error:authError}=await authClient.auth.getUser(bearer.slice(7));
 if(authError||!user)return Response.json({error:'Unauthorised'},{status:401,headers:cors});
 const admin=createClient(url,service,{auth:{persistSession:false}});
 const {data:profile}=await admin.from('profiles').select('role,active').eq('id',user.id).single();
 if(!profile?.active||profile.role!=='manager')return Response.json({error:'Manager access required'},{status:403,headers:cors});
 try{
  const {username,password,role,display_name}=await req.json();
  const name=String(username||'').trim().toLowerCase();
  if(!/^[a-z][a-z0-9._-]{2,31}$/.test(name)||!['operator','charge_hand','manager'].includes(role)||typeof password!=='string'||password.length<12)
   return Response.json({error:'Use a valid username, role and password of at least 12 characters'},{status:400,headers:cors});
  const {data:created,error}=await admin.auth.admin.createUser({email:name+'@sic-users.invalid',password,email_confirm:true});
  if(error||!created.user)return Response.json({error:'Unable to create account; username may already exist'},{status:400,headers:cors});
  const {error:profileError}=await admin.from('profiles').insert({id:created.user.id,role,active:true,display_name:String(display_name||'').slice(0,80)});
  if(profileError){await admin.auth.admin.deleteUser(created.user.id);return Response.json({error:'Unable to create profile'},{status:500,headers:cors});}
  return Response.json({ok:true,username:name,role},{headers:cors});
 }catch{return Response.json({error:'Invalid request'},{status:400,headers:cors});}
});
