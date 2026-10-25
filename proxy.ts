import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request:NextRequest) {
 let response=NextResponse.next({request});
 const client=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{
  cookies:{getAll:()=>request.cookies.getAll(),setAll:(entries,cacheHeaders)=>{
   entries.forEach(({name,value})=>request.cookies.set(name,value));
   response=NextResponse.next({request});
   entries.forEach(({name,value,options})=>response.cookies.set(name,value,options));
   Object.entries(cacheHeaders??{}).forEach(([key,value])=>response.headers.set(key,value));
  }}
 });
 const {data:{user}}=await client.auth.getUser();
 const path=request.nextUrl.pathname;
 const publicRoute=path==='/login'||path==='/auth/callback';
 let destination:string|undefined;
 if(!publicRoute){
  if(!user||user.is_anonymous||user.app_metadata?.provider!=='google')destination='/login';
  else if(path!=='/denied'){
   const {data,error}=await client.from('profiles').select('is_superadmin').eq('id',user.id).single();
   if(error||data?.is_superadmin!==true)destination='/denied';
  }
 }
 if(destination){
  const redirected=NextResponse.redirect(new URL(destination,request.url));
  response.cookies.getAll().forEach(c=>redirected.cookies.set(c));
  response=redirected;
 }
 response.headers.set('Cache-Control','private, no-store');
 response.headers.set('X-Content-Type-Options','nosniff');
 response.headers.set('Referrer-Policy','strict-origin-when-cross-origin');
 response.headers.set('X-Frame-Options','DENY');
 return response;
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico).*)']};
