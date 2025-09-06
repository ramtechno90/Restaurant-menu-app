import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://mdpmktdfszztukfgqwjq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kcG1rdGRmc3p6dHVrZmdxd2pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMDQ0MTksImV4cCI6MjA3MDY4MDQxOX0.NBlC_7cqv7WscIryrJEPpfpktP8YerbsHfKp8UbjqHU";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
