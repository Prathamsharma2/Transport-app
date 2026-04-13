const SUPABASE_URL = 'https://ebmfpoqphhoukiuyjbus.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVibWZwb3FwaGhvdWtpdXlqYnVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTcyODgyOCwiZXhwIjoyMDkxMzA0ODI4fQ.HLiSdJ0w65tKZlet1-cWXCzDTMHbvJRH4a-8DStPOGc';

async function pushUpdate() {
    console.log('--- Pushing GitHub release update to Supabase ---');
    
    const headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    };

    const winUpdate = {
        version: '1.0.6-win',
        platform: 'win',
        url: 'https://github.com/Prathamsharma2/Transport-app/releases/latest/download/tms-setup.exe',
        release_notes: 'Important Update: Migration to GitHub Auto-Updater (Prathamsharma2 account).'
    };

    const macUpdate = {
        version: '1.0.6-mac',
        platform: 'mac',
        url: 'https://github.com/Prathamsharma2/Transport-app/releases/latest/download/tms-setup.dmg',
        release_notes: 'Important Update: Migration to GitHub Auto-Updater (Prathamsharma2 account).'
    };

    try {
        const winRes = await fetch(`${SUPABASE_URL}/rest/v1/app_updates`, { method: 'POST', headers, body: JSON.stringify(winUpdate) });
        console.log('✅ Windows update pushed:', await winRes.json());
        
        const macRes = await fetch(`${SUPABASE_URL}/rest/v1/app_updates`, { method: 'POST', headers, body: JSON.stringify(macUpdate) });
        console.log('✅ Mac update pushed:', await macRes.json());
    } catch (error) {
        console.error('❌ Failed to push update:', error.message);
    }
}
pushUpdate();
