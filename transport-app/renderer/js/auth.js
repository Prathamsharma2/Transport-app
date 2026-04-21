/* renderer/js/auth.js — Simple table-based auth (no Supabase email needed) */
'use strict';
const { supabase } = require('./supabase-client');

const SESSION_KEY = 'tms_session';
const SESSION_TTL  = 24 * 60 * 60 * 1000; // 24 hours

async function login(username, password) {
  if (!username || !password) throw new Error('Username and password required');

  const { data, error } = await supabase
    .from('app_users')
    .select('id, username, full_name, role')
    .eq('username', username.toLowerCase().trim())
    .eq('password', password)
    .eq('is_active', true)
    .single();

  if (error || !data) throw new Error('Invalid username or password');

  const session = { user: data, loggedAt: Date.now() };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (Date.now() - session.loggedAt > SESSION_TTL) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch { return null; }
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
}

function getDisplayUsername(session) {
  return session?.user?.username || session?.user?.full_name || 'User';
}

module.exports = { login, logout, getSession, getDisplayUsername };
