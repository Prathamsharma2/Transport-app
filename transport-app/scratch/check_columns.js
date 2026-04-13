const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ebmfpoqphhoukiuyjbus.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVibWZwb3FwaGhvdWtpdXlqYnVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3Mjg4MjgsImV4cCI6MjA5MTMwNDgyOH0.Y26zM-qQSF_1PxQP_6sqUa9Evk1doZucaFM557cbg3Y';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkColumns() {
    // We can't easily list columns without a query, so we'll try to insert a fake record and see the error or just select one (if any)
    const { data, error } = await supabase.from('app_updates').select('*').limit(1);
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Sample data:', data);
    }
}

checkColumns();
