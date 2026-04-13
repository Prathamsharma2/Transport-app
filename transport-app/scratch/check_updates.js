const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ebmfpoqphhoukiuyjbus.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVibWZwb3FwaGhvdWtpdXlqYnVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3Mjg4MjgsImV4cCI6MjA5MTMwNDgyOH0.Y26zM-qQSF_1PxQP_6sqUa9Evk1doZucaFM557cbg3Y';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkUpdates() {
    const { data, error } = await supabase
        .from('app_updates')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching updates:', error);
    } else {
        console.log('Current Updates:', JSON.stringify(data, null, 2));
    }
}

checkUpdates();
