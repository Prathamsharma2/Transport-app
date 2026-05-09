
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ebmfpoqphhoukiuyjbus.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspectCompanies() {
  const { data, error } = await supabase.from('companies').select('*');
  if (error) {
    console.log(error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

inspectCompanies();
