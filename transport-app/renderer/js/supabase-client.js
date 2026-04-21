/* renderer/js/supabase-client.js — Singleton with fallback hardcoded keys */
'use strict';

// Use window.supabase loaded via CDN in index.html to bypass Electron nodeIntegration bugs
const createClient = window.supabase ? window.supabase.createClient : null;

if (!createClient) {
  console.error('[Supabase] window.supabase not found. Ensure CDN script is loaded.');
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ebmfpoqphhoukiuyjbus.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVibWZwb3FwaGhvdWtpdXlqYnVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTcyODgyOCwiZXhwIjoyMDkxMzA0ODI4fQ.HLiSdJ0w65tKZlet1-cWXCzDTMHbvJRH4a-8DStPOGc';

const supabase = createClient ? createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
}) : null;

module.exports = { supabase };
