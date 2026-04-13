const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ebmfpoqphhoukiuyjbus.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVibWZwb3FwaGhvdWtpdXlqYnVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3Mjg4MjgsImV4cCI6MjA5MTMwNDgyOH0.Y26zM-qQSF_1PxQP_6sqUa9Evk1doZucaFM557cbg3Y';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function listBuckets() {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
        console.error('Error listing buckets:', error);
    } else {
        console.log('Buckets:', JSON.stringify(data, null, 2));
        for (const bucket of data) {
            const { data: files, error: fileError } = await supabase.storage.from(bucket.name).list();
            if (fileError) {
                console.error(`Error listing files in ${bucket.name}:`, fileError);
            } else {
                console.log(`Files in ${bucket.name}:`, JSON.stringify(files, null, 2));
            }
        }
    }
}

listBuckets();
