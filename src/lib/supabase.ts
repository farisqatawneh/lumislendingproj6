import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://obupjgavowabowrshtmt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9idXBqZ2F2b3dhYm93cnNodG10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzOTY0MzMsImV4cCI6MjA4NTk3MjQzM30.6M8_Q_wYnM1lUtwx3Gt7PZE3m6IAzqF5gc3WEJt26bE';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
