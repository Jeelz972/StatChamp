// Switch to Supabase: set VITE_DB_BACKEND=supabase in .env
// Both modules expose an identical DB interface.
import { DB as FirebaseDB } from './firebase';
import { DB as SupabaseDB } from './supabase';

export const DB = import.meta.env.VITE_DB_BACKEND === 'supabase' ? SupabaseDB : FirebaseDB;
