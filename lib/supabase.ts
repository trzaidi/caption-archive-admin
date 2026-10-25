import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function db() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (entries) => { try { entries.forEach(({name,value,options}) => store.set(name,value,options)); } catch { /* Server Component writes are unsupported */ } }
    }
  });
}
