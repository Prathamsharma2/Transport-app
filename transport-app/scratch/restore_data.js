
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ebmfpoqphhoukiuyjbus.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function restoreData() {
  console.log("Starting data restoration from broker_party_ledger to outsourced_trips...");
  
  // 1. Fetch all data from broker_party_ledger
  const { data: ledger, error: lErr } = await supabase.from('broker_party_ledger').select('*');
  if (lErr) {
    console.error("Error fetching ledger:", lErr);
    return;
  }
  
  console.log(`Found ${ledger.length} entries in broker_party_ledger.`);
  
  // 2. Map ledger entries to outsourced_trips structure
  // Since we don't know the 'direction' or 'client_name', we'll make best guesses or use placeholders.
  // Usually, broker_party_ledger entries represent outbound trips if freight_amount > 0.
  const outsourced = ledger.map(l => ({
    trip_date: l.entry_date,
    truck_no: l.truck_no,
    from_location: l.from_location,
    to_location: l.to_location,
    freight_received: l.freight_amount,
    freight_paid: 0, // We don't have this in ledger usually, or it's payment_received? 
    payment_status: l.payment_received >= l.freight_amount ? 'Paid' : (l.payment_received > 0 ? 'Partial' : 'Pending'),
    notes: l.notes || `Restored from ledger entry #${l.id}`,
    direction: 'outbound', // Default to outbound
    broker_name: 'Restored Party'
  }));
  
  // 3. Insert into outsourced_trips
  const { data: inserted, error: iErr } = await supabase.from('outsourced_trips').insert(outsourced);
  if (iErr) {
    console.error("Error inserting into outsourced_trips:", iErr);
  } else {
    console.log(`Successfully restored ${outsourced.length} trips to outsourced_trips.`);
  }
}

restoreData();
