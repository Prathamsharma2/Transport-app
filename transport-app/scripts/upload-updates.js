require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');

// Ensure you add these to your transport-app/.env file
const SUPABASE_URL = process.env.SUPABASE_URL; 
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; 

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in .env');
  process.exit(1);
}

const BUCKET_NAME = 'updates'; // Ensure you create a PUBLIC bucket named 'updates' in Supabase
const distPath = path.join(__dirname, '../dist');

async function uploadLatestBuild() {
  if (!fs.existsSync(distPath)) {
    console.error('❌ Error: dist folder not found. Run "npm run build:win" first.');
    process.exit(1);
  }

  // Find installer, latest.yml and blockmap files
  const filesToUpload = fs.readdirSync(distPath).filter(file => 
    file.endsWith('.exe') || file.endsWith('latest.yml') || file.endsWith('.blockmap')
  );

  if (filesToUpload.length === 0) {
    console.log('⚠️ No build files found in dist/. Please build first.');
    return;
  }

  console.log(`🚀 Uploading ${filesToUpload.length} files to Supabase...`);

  for (const file of filesToUpload) {
    const filePath = path.join(distPath, file);
    const fileBuffer = fs.readFileSync(filePath);
    
    console.log(`⏳ Uploading ${file}...`);
    
    // Determine content type
    let contentType = 'application/octet-stream';
    if (file.endsWith('.yml')) contentType = 'text/yaml';
    
    try {
      const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${file}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY,
          'Content-Type': contentType,
          'x-upsert': 'true'
        },
        body: fileBuffer
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Upload failed with status ${response.status}: ${errText}`);
      }

      console.log(`✅ Successfully uploaded: ${file}`);
    } catch (err) {
      console.error(`❌ Failed to upload ${file}:`, err.message);
    }
  }

  console.log('\n🎉 All uploads complete! Your clients will now auto-update on next launch.');
  console.log(`🔗 Make sure your package.json publish url looks like: ${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/`);
}

uploadLatestBuild();
