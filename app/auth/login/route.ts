import {NextResponse} from 'next/server';
import {db} from '@/lib/supabase';
export const dynamic='force-dynamic';
// OAuth starts and finishes on the same stable origin, including its PKCE cookie.
export async function GET(request:Request){
 const canonical='https://caption-archive-admin.vercel.app';
 const url=new URL(request.url);
 if(url.origin!==canonical)return NextResponse.redirect(new URL('/auth/login',canonical));
 const client=await db();
 const {data,error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:canonical+'/auth/callback',queryParams:{prompt:'select_account'}}});
 if(error||!data.url)return NextResponse.redirect(new URL('/login?error=oauth',canonical));
 const response=NextResponse.redirect(data.url);
 response.headers.set('Cache-Control','private, no-store');
 return response;
}
