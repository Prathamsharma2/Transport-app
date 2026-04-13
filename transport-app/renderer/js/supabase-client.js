/**
 * supabase-client.js
 * Uses the locally installed @supabase/supabase-js package via require()
 * Works because nodeIntegration: true in Electron.
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ebmfpoqphhoukiuyjbus.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVibWZwb3FwaGhvdWtpdXlqYnVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3Mjg4MjgsImV4cCI6MjA5MTMwNDgyOH0.Y26zM-qQSF_1PxQP_6sqUa9Evk1doZucaFM557cbg3Y';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        storage: window.localStorage
    }
});

function usernameToEmail(username) {
    return `${username.trim().toLowerCase()}@dhillonroadlines.local`;
}

window._supabase = supabase;
window._usernameToEmail = usernameToEmail;

console.log('✅ Supabase client initialized via require()');
