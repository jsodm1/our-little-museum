import { createClient } from 'npm:@supabase/supabase-js@2.95.3';
const headers = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type','Content-Type':'application/json'};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(b=>b.toString(16).padStart(2,'0')).join('');
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 try{
  const raw=await req.text();if(raw.length>4000)return reply({error:'Request too large'},413);
  const {action,username,password,recovery}=JSON.parse(raw);
  if(!['register','recover'].includes(action)||typeof password!=='string'||password.length<10||password.length>128)return reply({error:'Use a password with 10–128 characters.'},400);
  const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const client=createClient(Deno.env.get('SUPABASE_URL')!,secret,{auth:{persistSession:false}});
  const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
  const rateKey=await hash(secret+':'+ip+':'+action);
  const {data:allowed,error:limitError}=await client.rpc('account_rate_limit',{rate_key:rateKey,maximum:action==='register'?5:10});
  if(limitError||!allowed)return reply({error:'Too many attempts. Please try again in one hour.'},429);
  const recoveryCode=crypto.randomUUID()+crypto.randomUUID();
  let userId;
  if(action==='register'){
   if(typeof username!=='string'||!/^[a-z0-9_]{4,24}$/.test(username))return reply({error:'Username: 4–24 lowercase letters, numbers or underscores.'},400);
   const {data,error}=await client.auth.admin.createUser({email:username+'@accounts.ourlittleworld.invalid',password,email_confirm:true,app_metadata:{login_type:'username'}});
   if(error)return reply({error:'That username is unavailable or account creation failed.'},400);
   userId=data.user.id;
  }else{
   if(typeof recovery!=='string'||recovery.length!==72)return reply({error:'Invalid recovery code.'},400);
   const {data,error}=await client.rpc('account_recover',{hash:await hash(recovery)});
   if(error||!data)return reply({error:'Invalid recovery code.'},400);
   userId=data;
   const {error:changed}=await client.auth.admin.updateUserById(userId,{password});if(changed)throw changed;
  }
  const {error}=await client.rpc('account_set_recovery',{uid:userId,hash:await hash(recoveryCode)});
  if(error)throw error;
  return reply({recoveryCode});
 }catch{return reply({error:'The account request could not be completed. Try again.'},400);}
});
