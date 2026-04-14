const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ebmfpoqphhoukiuyjbus.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVibWZwb3FwaGhvdWtpdXlqYnVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3Mjg4MjgsImV4cCI6MjA5MTMwNDgyOH0.Y26zM-qQSF_1PxQP_6sqUa9Evk1doZucaFM557cbg3Y';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ✅ Direct Hostinger link — no redirects, no AWS S3 tokens
const DIRECT_URL = 'https://zucax.in/tms-setup.exe';

async function pushUpdate() {
    console.log('--- Pushing Hostinger direct link to Supabase ---');
    console.log('URL:', DIRECT_URL);

    const update = {
        version: '1.0.3',
        platform: 'win',
        url: DIRECT_URL,
        release_notes: 'Critical update: Fixed auto-update downloader. Improved stability and performance.'
    };

    try {
        const { data, error } = await supabase
            .from('app_updates')
            .insert(update)
            .select();

        if (error) throw error;

        console.log('');
        console.log('✅ SUCCESS! Update pushed to Supabase:');
        console.log(JSON.stringify(data, null, 2));
        console.log('');
        console.log('Clients will now download from: https://zucax.in/tms-setup.exe');
    } catch (err) {
        console.error('❌ Failed:', err.message);
    }
}

pushUpdate();
