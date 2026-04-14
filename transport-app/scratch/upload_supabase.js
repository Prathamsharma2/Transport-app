const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const _path = require('path');
const SUPABASE_URL = 'https://ebmfpoqphhoukiuyjbus.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiO'+'iJzdXBhYmFzZSIsInJlZiI6ImVibWZwb3FwaGhvdWtpdXlqYnVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTcyODgyOCwiZXhwIjoyMDkxMzA0ODI4fQ.HLiSdJ0w65tKZlet1-cWXCzDTMHbvJRH4a-8DStPOGc';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function run() {
  const filePath = _path.join(__dirname, '../dist/tms-setup.exe');
  console.log("Reading file:", filePath);
  
  if (!fs.existsSync(filePath)) {
     console.error("File not found!");
     return;
  }
  const fileData = fs.readFileSync(filePath);
  
  console.log("Uploading to Supabase Storage (This might take 1-3 minutes for 96MB)...");
  const { data, error } = await supabase.storage.from('releases').upload('v1.0.5/tms-setup.exe', fileData, {
      contentType: 'application/x-msdownload',
      upsert: true
  });
  
  if (error) {
      console.log("Upload Error:", error);
      return;
  }
  
  const { data: urlData } = supabase.storage.from('releases').getPublicUrl('v1.0.5/tms-setup.exe');
  const directUrl = urlData.publicUrl;
  console.log("Upload Success! Public URL:", directUrl);
  
  console.log("Updating app_updates table to point to this direct URL...");
  
  // Push the row to Supabase so old clients will get this update URL
  const { data: dbData, error: dbError } = await supabase.from('app_updates').insert([
    {
        version: '1.0.5',
        platform: 'win',
        url: directUrl,
        release_notes: 'Important Update: Please click Update Now to upgrade to our new Auto-Updater system.'
    }
  ]);
  
  if (dbError) {
      console.log("DB Update Error:", dbError);
  } else {
      console.log("DB Update Success! Old clients will now download from:", directUrl);
  }
}
run();
