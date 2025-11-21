import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase project credentials
// Get these from: https://app.supabase.com/project/_/settings/api
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to check if email is valid (allow all emails for now)
export const isAllowedEmail = (email) => {
  // Basic email validation - allow any valid email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Auth helpers
export const signUp = async (email, password) => {
  if (!isAllowedEmail(email)) {
    return { error: { message: 'Please enter a valid email address' } };
  }
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin
    }
  });
  
  return { data, error };
};

export const signIn = async (email, password) => {
  if (!isAllowedEmail(email)) {
    return { error: { message: 'Please enter a valid email address' } };
  }
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Real-time subscription helpers
export const subscribeToTable = (table, callback) => {
  return supabase
    .channel(`public:${table}`)
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: table },
      callback
    )
    .subscribe();
};

export const unsubscribe = (subscription) => {
  if (subscription) {
    supabase.removeChannel(subscription);
  }
};
