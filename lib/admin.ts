import { redirect } from 'next/navigation';
import { db } from './supabase';

export async function requireAdmin() {
  const supabase = await db();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || user.is_anonymous || user.app_metadata?.provider !== 'google') redirect('/login');
  const { data, error: profileError } = await supabase.from('profiles').select('id,is_superadmin,first_name,last_name').eq('id', user.id).single();
  if (profileError || data?.is_superadmin !== true) redirect('/denied');
  return { supabase, user, profile: data };
}
