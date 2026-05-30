import { createClient as _createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

export type TypedSupabaseClient = SupabaseClient<Database>;

export function createClient(url: string, anonKey: string): TypedSupabaseClient {
  return _createClient<Database>(url, anonKey);
}
