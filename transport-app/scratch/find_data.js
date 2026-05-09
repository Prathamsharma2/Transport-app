
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ebmfpoqphhoukiuyjbus.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function getAllTables() {
  // Use a query that is likely to work in Supabase SQL environment
  const { data, error } = await supabase.from('pg_tables').select('tablename').eq('schemaname', 'public');
  if (error) {
    // If pg_tables is not accessible, try brute forcing or checking the migration script
    console.log("pg_tables not accessible, using common names");
    const tables = [
      'trips', 'outsourced_trips', 'broker_expenses', 'broker_party_ledger', 
      'vehicles', 'drivers', 'broker_companies', 'party_ledger', 'loads', 'companies',
      'ledger', 'expenses', 'payments', 'maintenance_logs', 'broker_ledger'
    ];
    for (const t of tables) {
      const { count, error: err } = await supabase.from(t).select('*', { count: 'exact', head: true });
      if (!err) console.log(`${t}: ${count} rows`);
    }
  } else {
    for (const row of data) {
      const t = row.tablename;
      const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
      console.log(`${t}: ${count} rows`);
    }
  }
}

getAllTables();
