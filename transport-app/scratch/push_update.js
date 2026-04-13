const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ebmfpoqphhoukiuyjbus.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVibWZwb3FwaGhvdWtpdXlqYnVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3Mjg4MjgsImV4cCI6MjA5MTMwNDgyOH0.Y26zM-qQSF_1PxQP_6sqUa9Evk1doZucaFM557cbg3Y';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DRIVE_FILE_ID = '1-y-vc6CBoBeiwA7t83TpTr_L_zrnsKNq';
const DIRECT_DOWNLOAD_URL = `https://drive.google.com/uc?export=download&id=${DRIVE_FILE_ID}`;

async function pushUpdate() {
    console.log('--- Pushing update to Supabase ---');
    
    // 1. Push for Windows
    const winUpdate = {
        version: '1.0.3',
        platform: 'win',
        url: DIRECT_DOWNLOAD_URL,
        release_notes: 'Critical update: Fixed auto-update downloader and improved stability.'
    };

    // 2. Push for Mac (using same link for now as per user request, or I'll just push win)
    const macUpdate = {
        version: '1.0.3',
        platform: 'mac',
        url: DIRECT_DOWNLOAD_URL,
        release_notes: 'Critical update: Fixed auto-update downloader and improved stability.'
    };

    try {
        const { data: winData, error: winError } = await supabase.from('app_updates').insert(winUpdate).select();
        if (winError) throw winError;
        console.log('✅ Windows update pushed:', winData);

        const { data: macData, error: macError } = await supabase.from('app_updates').insert(macUpdate).select();
        if (macError) throw macError;
        console.log('✅ Mac update pushed:', macData);

    } catch (error) {
        console.error('❌ Failed to push update:', error.message);
    }
}

pushUpdate();
