/* renderer/js/trips.js — Trip Management + Profitability */
'use strict';
const { supabase } = require('./supabase-client');
const { formatCurrency, formatDate, statusBadge, toast, getRange, renderPagination, exportTableToCSV, confirmAction, profitClass, todayISO, refreshIcons } = require('./utils');
const { getFilters } = require('./filters');

let currentPage = 1;
let searchTerm  = '';
let vehicles    = [];
let drivers     = [];
let companies   = [];

async function load() {
  currentPage = 1;
  searchTerm = '';
  await Promise.all([loadDropdowns(), fetchTrips()]);
  refreshIcons();
}

async function loadDropdowns() {
  const [v, d, c] = await Promise.all([
    supabase.from('vehicles').select('id,vehicle_number,status').order('vehicle_number'),
    supabase.from('drivers').select('id,name,status').order('name'),
    supabase.from('companies').select('id,name').order('name'),
  ]);
  vehicles  = v.data || [];
  drivers   = d.data || [];
  companies = c.data || [];
  
  // Populate form dropdowns immediately
  populateDropdowns();
}

function populateDropdowns() {
  const vehicleOpts  = vehicles.map(v => `<option value="${v.id}">${v.vehicle_number} (${v.status})</option>`).join('');
  const driverOpts   = drivers.map(d => `<option value="${d.id}">${d.name} (${d.status})</option>`).join('');
  const companyOpts  = companies.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  document.getElementById('t-vehicle').innerHTML = `<option value="">Unassigned</option>${vehicleOpts}`;
  document.getElementById('t-driver').innerHTML  = `<option value="">Unassigned</option>${driverOpts}`;
  document.getElementById('t-company').innerHTML = `<option value="">No company</option>${companyOpts}`;
}

function onSearchVehicle(val) {
  const s = val.toLowerCase();
  const sugg = document.getElementById('t-vehicle-suggestions');
  if (!val) { sugg.classList.remove('active'); return; }
  
  const filtered = vehicles.filter(v => v.vehicle_number.toLowerCase().includes(s));
  if (filtered.length === 0) { sugg.classList.remove('active'); return; }
  
  sugg.innerHTML = filtered.map(v => `
    <div class="suggestion-item" onclick="window.tripsModule.selectVehicle('${v.id}', '${v.vehicle_number}')">
      ${v.vehicle_number} <span class="suggestion-sub">${v.status || 'Available'}</span>
    </div>
  `).join('');
  sugg.classList.add('active');
}

function selectVehicle(id, label) {
  document.getElementById('t-vehicle').value = id;
  document.getElementById('t-vehicle-search').value = label;
  document.getElementById('t-vehicle-suggestions').classList.remove('active');
  
  const pill = document.getElementById('t-vehicle-selected-label');
  pill.innerHTML = `Selected: ${label}`;
  pill.style.display = 'flex';
  pill.onclick = () => {
    document.getElementById('t-vehicle').value = '';
    document.getElementById('t-vehicle-search').value = '';
    pill.style.display = 'none';
  };
}

function onSearchDriver(val) {
  const s = val.toLowerCase();
  const sugg = document.getElementById('t-driver-suggestions');
  if (!val) { sugg.classList.remove('active'); return; }
  
  const filtered = drivers.filter(d => d.name.toLowerCase().includes(s));
  if (filtered.length === 0) { sugg.classList.remove('active'); return; }
  
  sugg.innerHTML = filtered.map(d => `
    <div class="suggestion-item" onclick="window.tripsModule.selectDriver('${d.id}', '${d.name}')">
      ${d.name} <span class="suggestion-sub">${d.status || 'Available'}</span>
    </div>
  `).join('');
  sugg.classList.add('active');
}

function selectDriver(id, label) {
  document.getElementById('t-driver').value = id;
  document.getElementById('t-driver-search').value = label;
  document.getElementById('t-driver-suggestions').classList.remove('active');

  const pill = document.getElementById('t-driver-selected-label');
  pill.innerHTML = `Selected: ${label}`;
  pill.style.display = 'flex';
  pill.onclick = () => {
    document.getElementById('t-driver').value = '';
    document.getElementById('t-driver-search').value = '';
    pill.style.display = 'none';
  };
}

async function fetchTrips() {
  const tbody = document.getElementById('trips-table-body');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="14" style="padding:24px;text-align:center;color:var(--text-muted);">Loading…</td></tr>`;

  try {
    const f = getFilters();
    const { from, to } = getRange(currentPage);
    const sortVal = document.getElementById('trips-sort')?.value || 'trip_date-desc';
    const [col, dir] = sortVal.split('-');
    
    // Fetch trips along with related entities, now pulling consignor and consignee
    let q = supabase.from('trips')
      .select(`id,trip_date,gr_number,consignor,consignee,start_location,end_location,freight_amount,status,
               vehicles(vehicle_number),drivers(name),companies(name),expenses(amount)`, { count:'exact' })
      .order(col, { ascending: dir === 'asc' })
      .range(from, to);

    if (f.vehicleId) q = q.eq('vehicle_id', f.vehicleId);
    if (f.companyId) q = q.eq('company_id', f.companyId);
    if (f.status)    q = q.eq('status', f.status);
    if (f.dateFrom)  q = q.gte('trip_date', f.dateFrom);
    if (f.dateTo)    q = q.lte('trip_date', f.dateTo);
    
    // We add related text to locally filter vehicles/drivers/companies since deep ilike is complex
    // Or we simply do OR logic on gr_number and locations
    if (searchTerm) {
      // We search across main fields and also support searching for truck/driver names
      // Note: Relation search in 'or' is tricky in Supabase, but we can do it by 
      // ensuring our relation fields are part of the main text search if needed, 
      // or using a combined approach. For now, we search the primary string fields.
      q = q.or(`gr_number.ilike.%${searchTerm}%,start_location.ilike.%${searchTerm}%,end_location.ilike.%${searchTerm}%,consignor.ilike.%${searchTerm}%,consignee.ilike.%${searchTerm}%,goods_description.ilike.%${searchTerm}%`);
    }

    const { data, count, error } = await q;
    if (error) throw error;

    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="14"><div class="empty-state"><span class="empty-icon"><i data-lucide="truck" class="icon-inline"></i></span><div class="empty-title">No trips yet</div><div class="empty-sub">Create your first trip</div></div></td></tr>`;
    } else {
      tbody.innerHTML = data.map((t, i) => {
        // Simple search filter in memory for related entities if our search term was somewhat general
        if (searchTerm) {
          const s = searchTerm.toLowerCase();
          const veh = t.vehicles?.vehicle_number?.toLowerCase() || '';
          const dri = t.drivers?.name?.toLowerCase() || '';
          const com = t.companies?.name?.toLowerCase() || '';
          const matchLocally = (veh.includes(s) || dri.includes(s) || com.includes(s));
          // if it didn't match the ILIKE on main columns mostly handled by DB, we would filter here.
          // Since Supabase evaluated the OR on the parent fields, we only get rows matching parent fields from the DB. 
          // Note: To perfectly search relational fields, an RPC or better query is needed. We rely on standard text matches.
        }

        const expenses = (t.expenses || []).reduce((s, e) => s + parseFloat(e.amount || 0), 0);
        const profit   = parseFloat(t.freight_amount || 0) - expenses;
        return `<tr>
          <td class="td-primary">${from + i + 1}</td>
          <td>${formatDate(t.trip_date)}</td>
          <td>${t.companies?.name || '—'}</td>
          <td class="td-primary">${t.gr_number || '—'}</td>
          <td>${t.consignor || '—'}</td>
          <td>${t.consignee || '—'}</td>
          <td>${t.start_location} → ${t.end_location}${t.goods_description ? `<div style="font-size:10px;color:var(--text-muted);margin-top:4px;"><i data-lucide="package" style="width:10px;height:10px;"></i> ${t.goods_description}</div>` : ''}</td>
          <td>${t.vehicles?.vehicle_number || '—'}</td>
          <td>${t.drivers?.name || '—'}</td>
          <td class="td-amount">${formatCurrency(t.freight_amount)}</td>
          <td class="td-amount">${formatCurrency(expenses)}</td>
          <td class="td-amount ${profitClass(profit)}">${formatCurrency(profit)}</td>
          <td>${statusBadge(t.status)}</td>
          <td>
            <div style="display:flex;gap:4px;">
              <button class="btn btn-ghost btn-xs" title="Generate Bill" onclick="window.billingModule.openBillPreview(${t.id})"><i data-lucide="printer" class="icon-inline" style="width:14px;height:14px;"></i> Bill</button>
              <button class="btn btn-ghost btn-xs" onclick="window.tripsModule.openExpenseModal(${t.id})"><i data-lucide="banknote" class="icon-inline" style="width:14px;height:14px;"></i> + Exp</button>
              <button class="btn btn-ghost btn-xs" onclick="window.tripsModule.openTripDetails(${t.id})"><i data-lucide="eye" class="icon-inline" style="width:14px;height:14px;"></i></button>
              <button class="btn btn-danger btn-xs" onclick="window.tripsModule.deleteTrip(${t.id})"><i data-lucide="trash-2" class="icon-inline" style="width:14px;height:14px;"></i></button>
            </div>
          </td>
        </tr>`;
      }).join('');
    }
    refreshIcons();
    renderPagination('trips-pagination', count || 0, currentPage, (p) => { currentPage = p; fetchTrips(); });
  } catch(err) {
    console.error('FetchTrips Error:', err);
    tbody.innerHTML = `<tr><td colspan="14" style="color:var(--red);padding:16px;">Error: ${err.message}</td></tr>`;
  }
}

function goToPage(p) {
  currentPage = p;
  fetchTrips();
}

const onSearch = (val) => { searchTerm = val; currentPage = 1; fetchTrips(); };

function showListView() {
  // Safely reset all form fields to blank/default
  const safe = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  safe('t-edit-id', '');
  safe('t-date', todayISO());
  safe('t-gr', '');
  safe('t-consignor', '');
  safe('t-consignee', '');
  safe('t-from', '');
  safe('t-to', '');
  safe('t-freight', '');
  safe('t-advance', '');
  safe('t-weight', '');
  safe('t-company', '');
  safe('t-vehicle', '');
  safe('t-driver', '');
  safe('t-vehicle-search', '');
  safe('t-driver-search', '');
  // Re-populate everything to ensure full lists are back after search
  populateDropdowns();
  safe('t-goods', '');
  safe('t-shortage', 0);
  safe('t-surcharge', 0);
  safe('t-status', 'pending');
  document.getElementById('t-vehicle-selected-label').style.display = 'none';
  document.getElementById('t-driver-selected-label').style.display = 'none';
  document.getElementById('t-vehicle-suggestions').classList.remove('active');
  document.getElementById('t-driver-suggestions').classList.remove('active');
  const titleEl = document.getElementById('trips-form-title');
  if (titleEl) {
    titleEl.innerHTML = '<i data-lucide="plus-circle" class="icon-inline"></i> Create New Trip';
    refreshIcons();
  }
}

function showAddTrip() {
  showListView();
}

async function openEditTrip(id) {
  const titleEl = document.getElementById('trips-form-title');
  if (titleEl) titleEl.innerHTML = '<i data-lucide="edit-2" class="icon-inline"></i> Edit Trip #' + id;
  
  const idEl = document.getElementById('t-edit-id');
  if (idEl) idEl.value = id;
  refreshIcons();

  // Scroll to top of content area to show the form
  const contentArea = document.getElementById('content-area');
  if (contentArea) contentArea.scrollTo({ top: 0, behavior: 'smooth' });
  
  const { data, error } = await supabase.from('trips').select('*').eq('id', id).single();
  if (error || !data) return;
  
  document.getElementById('t-date').value      = data.trip_date      || todayISO();
  document.getElementById('t-gr').value        = data.gr_number      || '';
  document.getElementById('t-consignor').value = data.consignor      || '';
  document.getElementById('t-consignee').value = data.consignee      || '';
  document.getElementById('t-from').value      = data.start_location || '';
  document.getElementById('t-to').value        = data.end_location   || '';
  document.getElementById('t-freight').value   = data.freight_amount || '';
  document.getElementById('t-advance').value   = data.advance_amount || '';
  document.getElementById('t-weight').value    = data.weight         || '';
  document.getElementById('t-company').value   = data.company_id     || '';
  document.getElementById('t-vehicle').value   = data.vehicle_id     || '';
  document.getElementById('t-driver').value    = data.driver_id      || '';
  document.getElementById('t-goods').value     = data.goods_description || '';
  document.getElementById('t-status').value    = data.status         || 'pending';

  // Show selection pills
  if (data.vehicle_id) {
    const v = vehicles.find(x => x.id == data.vehicle_id);
    if (v) selectVehicle(v.id, v.vehicle_number);
  }
  if (data.driver_id) {
    const dr = drivers.find(x => x.id == data.driver_id);
    if (dr) selectDriver(dr.id, dr.name);
  }
}

async function saveTrip() {
  const editId = document.getElementById('t-edit-id').value;
  const payload = {
    trip_date:       document.getElementById('t-date').value,
    gr_number:       document.getElementById('t-gr').value.trim(),
    consignor:       document.getElementById('t-consignor').value.trim(),
    consignee:       document.getElementById('t-consignee').value.trim(),
    start_location:  document.getElementById('t-from').value.trim(),
    end_location:    document.getElementById('t-to').value.trim(),
    freight_amount:  parseFloat(document.getElementById('t-freight').value) || 0,
    advance_amount:  parseFloat(document.getElementById('t-advance').value) || 0,
    weight:          parseFloat(document.getElementById('t-weight').value)  || null,
    company_id:      document.getElementById('t-company').value || null,
    vehicle_id:      document.getElementById('t-vehicle').value || null,
    driver_id:       document.getElementById('t-driver').value  || null,
    shortage:        parseFloat(document.getElementById('t-shortage').value) || 0,
    surcharge:       parseFloat(document.getElementById('t-surcharge').value) || 0,
    goods_description: document.getElementById('t-goods').value.trim(),
    status:          document.getElementById('t-status').value,
    trip_type:       'internal',
    billing_status:  'Billed', // Automatically move to Bill section
  };

  // Auto-generate Bill Number if new
  if (!editId) {
    const d = new Date(payload.trip_date);
    const yr = d.getFullYear().toString().slice(-2);
    const rand = Math.floor(1000 + Math.random() * 9000);
    payload.bill_number = `DRL/${yr}/${rand}`;
  }

  try {
    let error;
    if (editId) {
      ({ error } = await supabase.from('trips').update(payload).eq('id', editId));
    } else {
      ({ error } = await supabase.from('trips').insert([payload]));
    }
    if (error) throw error;
    
    showListView();
    toast(editId ? 'Trip updated' : 'Trip created ✓');
    await fetchTrips();
  } catch(err) {
    toast(err.message, 'error');
  }
}

async function deleteTrip(id) {
  if (!confirmAction('Delete this trip and all its expenses?')) return;
  const { error } = await supabase.from('trips').delete().eq('id', id);
  if (error) { toast(error.message, 'error'); return; }
  toast('Trip deleted');
  await fetchTrips();
}

// ── Expense Modal (attached to trip) ──────────────────────────────────────────
function openExpenseModal(tripId) {
  const catOpts = ['Fuel','Toll','Driver Salary','Maintenance','Other'].map(c => `<option>${c}</option>`).join('');
  const html = `
    <div class="modal-overlay" id="exp-modal" onclick="if(event.target.id==='exp-modal')closeModal('exp-modal')">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title"><i data-lucide="banknote" class="icon-inline"></i> Add Expense — Trip #${tripId}</span>
          <button class="modal-close" onclick="closeModal('exp-modal')">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Category</label>
              <select class="form-control" id="exp-cat">${catOpts}</select>
            </div>
            <div class="form-group">
              <label class="form-label">Amount (₹)</label>
              <input class="form-control" type="number" id="exp-amount" placeholder="0">
            </div>
            <div class="form-group">
              <label class="form-label">Date</label>
              <input class="form-control" type="date" id="exp-date" value="${todayISO()}">
            </div>
            <div class="form-group">
              <label class="form-label">Vendor</label>
              <input class="form-control" id="exp-vendor" placeholder="Petrol pump, etc.">
            </div>
            <div class="form-group form-full">
              <label class="form-label">Notes</label>
              <textarea class="form-control" id="exp-notes" placeholder="Optional notes…"></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal('exp-modal')">Cancel</button>
          <button class="btn btn-primary" onclick="window.tripsModule.saveExpense(${tripId})"><i data-lucide="save" class="icon-inline"></i> Add Expense</button>
        </div>
      </div>
    </div>`;
  document.getElementById('trips-modal-container').innerHTML = html;
  refreshIcons();
}

async function saveExpense(tripId) {
  const payload = {
    trip_id:          tripId,
    expense_category: document.getElementById('exp-cat').value,
    category:         document.getElementById('exp-cat').value,
    amount:           parseFloat(document.getElementById('exp-amount').value) || 0,
    date:             document.getElementById('exp-date').value,
    vendor:           document.getElementById('exp-vendor').value.trim(),
    notes:            document.getElementById('exp-notes').value.trim(),
  };
  if (!payload.amount) { toast('Enter a valid amount', 'warning'); return; }
  const { error } = await supabase.from('expenses').insert([payload]);
  if (error) { toast(error.message, 'error'); return; }
  closeModal('exp-modal');
  toast('Expense added ✓');
  await fetchTrips();
}

function exportCSV() { exportTableToCSV('trips-table-body', 'trips.csv'); }

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}
window.closeModal = closeModal;

async function openTripDetails(id) {
  const container = document.getElementById('trip-details-container');
  if (!container) return;
  
  try {
    const { data: t, error } = await supabase.from('trips')
      .select(`id,trip_date,gr_number,consignor,consignee,start_location,end_location,freight_amount,advance_amount,status,weight,
               vehicles(vehicle_number),drivers(name),companies(name),expenses(*)`)
      .eq('id', id)
      .single();
      
    if (error) throw error;
    
    const expensesList = (t.expenses || []).map((e, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${formatDate(e.date)}</td>
        <td>${e.category}</td>
        <td>${e.vendor || '—'}</td>
        <td class="td-amount" style="color:var(--red);">${formatCurrency(e.amount)}</td>
      </tr>
    `).join('');

    const totalExp = (t.expenses || []).reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    const balance = parseFloat(t.freight_amount || 0) - parseFloat(t.advance_amount || 0);

    container.innerHTML = `
      <div class="modal-overlay" id="trip-details-modal" onclick="if(event.target.id==='trip-details-modal')closeModal('trip-details-modal')">
        <div class="modal modal-lg">
          <div class="modal-header">
            <span class="modal-title"><i data-lucide="info" class="icon-inline"></i> Trip Details — #${t.gr_number || t.id}</span>
            <button class="modal-close" onclick="closeModal('trip-details-modal')">✕</button>
          </div>
          <div class="modal-body">
            <div class="details-top-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:20px; margin-bottom:24px;">
              <div class="details-card">
                <div class="details-label">Basic Info</div>
                <div class="details-row"><span>Date:</span> <strong>${formatDate(t.trip_date)}</strong></div>
                <div class="details-row"><span>Status:</span> <span class="badge badge-${t.status?.toLowerCase()}">${t.status}</span></div>
                <div class="details-row"><span>Company:</span> <strong>${t.companies?.name || '—'}</strong></div>
              </div>
              <div class="details-card">
                <div class="details-label">Logistics</div>
                <div class="details-row"><span>Route:</span> <strong>${t.start_location} → ${t.end_location}</strong></div>
                <div class="details-row"><span>Vehicle:</span> <strong>${t.vehicles?.vehicle_number || '—'}</strong></div>
                <div class="details-row"><span>Driver:</span> <strong>${t.drivers?.name || '—'}</strong></div>
              </div>
              <div class="details-card">
                <div class="details-label">Parties</div>
                <div class="details-row"><span>Consignor:</span> <strong>${t.consignor || '—'}</strong></div>
                <div class="details-row"><span>Consignee:</span> <strong>${t.consignee || '—'}</strong></div>
                <div class="details-row"><span>Weight:</span> <strong>${t.weight ? t.weight + ' kg' : '—'}</strong></div>
              </div>
            </div>

            <div class="details-financials" style="display:grid; grid-template-columns:repeat(4, 1fr); gap:12px; margin-bottom:24px; padding:16px; background:var(--bg-light); border-radius:8px;">
               <div><div class="details-label">Total Freight</div><div class="summary-value" style="color:var(--accent); font-size:1.2rem;">${formatCurrency(t.freight_amount)}</div></div>
               <div><div class="details-label">Advance Received</div><div class="summary-value" style="color:var(--green); font-size:1.2rem;">${formatCurrency(t.advance_amount)}</div></div>
               <div><div class="details-label">Pending (Company)</div><div class="summary-value" style="color:var(--red); font-size:1.2rem;">${formatCurrency(balance)}</div></div>
               <div><div class="details-label">Expenses Logged</div><div class="summary-value" style="color:var(--text-muted); font-size:1.2rem;">${formatCurrency(totalExp)}</div></div>
            </div>

            <div class="table-toolbar" style="margin-top:24px;">
              <span class="table-toolbar-title"><i data-lucide="banknote" class="icon-inline"></i> Expenses History</span>
            </div>
            <div class="table-scroll" style="max-height:300px;">
              <table>
                <thead><tr><th>#</th><th>Date</th><th>Category</th><th>Vendor</th><th>Amount</th></tr></thead>
                <tbody>${expensesList || '<tr><td colspan="5" style="text-align:center;padding:20px;">No expenses logged for this trip.</td></tr>'}</tbody>
              </table>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="closeModal('trip-details-modal')">Close Window</button>
            <button class="btn btn-primary" onclick="closeModal('trip-details-modal'); window.tripsModule.openEditTrip(${t.id})">Edit Trip Info</button>
          </div>
        </div>
      </div>
    `;
    refreshIcons();
    // Assuming openModal is defined globally or in utils
    if (typeof openModal === 'function') openModal('trip-details-modal');
  } catch (err) {
    toast(err.message, 'error');
  }
}


// Export module
window.tripsModule = {
  load,
  fetchTrips,
  onSearch,
  onSearchVehicle,
  onSearchDriver,
  selectVehicle,
  selectDriver,
  showListView,
  showAddTrip,
  saveTrip,
  openEditTrip,
  deleteTrip,
  openExpenseModal,
  saveExpense,
  openTripDetails,
  goToPage,
  exportCSV
};

module.exports = window.tripsModule;
