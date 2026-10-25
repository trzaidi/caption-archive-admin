import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
export async function GET(request:Request){
 const url=new URL(request.url);const code=url.searchParams.get('code');
 if(!code)return NextResponse.redirect(new URL('/login?error=missing-code',url.origin));
 const client=await db();const {error}=await client.auth.exchangeCodeForSession(code);
 return NextResponse.redirect(new URL(error?'/login?error=auth':'/',url.origin));
}
