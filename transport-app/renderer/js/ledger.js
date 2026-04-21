/* renderer/js/ledger.js — Party Ledger System */
'use strict';
const { supabase } = require('./supabase-client');
const { formatCurrency, formatDate, toast, confirmAction, todayISO, exportTableToCSV, refreshIcons } = require('./utils');

let currentCompanyId   = null;
let currentCompanyName = '';
let currentCompanyGst  = '';
let vehicles = [];

async function load() {
  await loadCompanyDropdown();
  await loadVehicles();
}

async function loadVehicles() {
  const { data } = await supabase.from('vehicles').select('vehicle_number').order('vehicle_number');
  vehicles = (data || []).map(v => v.vehicle_number);
}

async function loadCompanyDropdown() {
  const sel = document.getElementById('ledger-company-select');
  if (!sel) return;
  const { data } = await supabase.from('companies').select('id,name').order('name');
  const opts = (data || []).map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  sel.innerHTML = `<option value="">Select Company…</option>${opts}`;
}

async function loadCompany(companyId) {
  currentCompanyId = companyId;
  if (!companyId) {
    // Reset display
    document.getElementById('ledger-summary').style.display = 'none';
    document.getElementById('ledger-table-wrapper').innerHTML = `
      <div class="empty-state">
        <span class="empty-icon"><i data-lucide="book-open" class="icon-inline"></i></span>
        <div class="empty-title">Select a Company</div>
        <div class="empty-sub">Choose a party from the dropdown to view their ledger</div>
      </div>`;
    refreshIcons();
    return;
  }

  // Get company name & GST
  const { data: co } = await supabase.from('companies').select('name,gst_number').eq('id', companyId).single();
  currentCompanyName = co?.name || '';
  currentCompanyGst = co?.gst_number ? ` <span style="font-size:13px; color:var(--text-muted); font-weight:normal; margin-left:8px;">(GST: ${co.gst_number})</span>` : '';

  await fetchLedgerEntries(companyId);
}

async function fetchLedgerEntries(companyId) {
  const wrapper = document.getElementById('ledger-table-wrapper');
  if (!wrapper) return;
  wrapper.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-muted);">Loading ledger…</div>`;

  try {
    const [ { data: ledgerEntries, error: ledgerErr }, { data: tripsData, error: tripsErr } ] = await Promise.all([
      supabase.from('party_ledger').select('*').eq('company_id', companyId),
      supabase.from('trips').select('*').eq('company_id', companyId)
    ]);
    
    if (ledgerErr) throw ledgerErr;
    if (tripsErr) throw tripsErr;

    // Normalize
    const mappedLedger = (ledgerEntries || []).map(e => ({ ...e, isTrip: false }));
    const mappedTrips = (tripsData || []).map(t => ({
      id: t.id,
      isTrip: true,
      entry_date: t.trip_date,
      truck_no: t.vehicle_id,
      gr_number: t.gr_number,
      from_location: t.start_location,
      to_location: t.end_location,
      weight: t.weight,
      freight_amount: t.freight_amount,
      payment_received: t.advance_amount,
      shortage: 0,
      surcharge: 0
    }));

    const sortVal = document.getElementById('ledger-sort')?.value || 'trip_date-desc';
    const [col, dir] = sortVal.split('-');

    const entries = [...mappedLedger, ...mappedTrips].sort((a, b) => {
      let valA = a[col === 'trip_date' ? 'entry_date' : col];
      let valB = b[col === 'trip_date' ? 'entry_date' : col];
      
      if (col === 'freight_amount') {
        valA = parseFloat(valA || 0);
        valB = parseFloat(valB || 0);
      } else {
        valA = new Date(valA || 0);
        valB = new Date(valB || 0);
      }

      return dir === 'asc' ? valA - valB : valB - valA;
    });

    // Calculate running balance
    let runningBalance  = 0;
    let totalFreight    = 0;
    let totalReceived   = 0;

    const rows = (entries || []).map((e, i) => {
      const freight  = parseFloat(e.freight_amount  || 0);
      const payment  = parseFloat(e.payment_received || 0);
      const shortage = parseFloat(e.shortage || 0);
      const surcharge = parseFloat(e.surcharge || 0);
      runningBalance = runningBalance + freight - payment + shortage - surcharge;
      totalFreight  += freight;
      totalReceived += payment;

      const balClass = runningBalance > 0 ? 'running-balance-negative' : 'running-balance-positive';
      return `<tr>
        <td class="td-primary">${i+1}</td>
        <td>${formatDate(e.entry_date)}</td>
        <td class="td-primary">${e.truck_no || '—'}</td>
        <td>${e.gr_number || '—'}</td>
        <td>${e.from_location || ''}${e.to_location ? ' → ' + e.to_location : ''}</td>
        <td>${e.weight ? e.weight + ' kg' : '—'}</td>
        <td class="td-amount" style="color:var(--accent);">${formatCurrency(freight)}</td>
        <td class="td-amount" style="color:var(--green);">${formatCurrency(payment)}</td>
        <td class="td-amount" style="color:var(--red);">${shortage > 0 ? formatCurrency(shortage) : '—'}</td>
        <td class="td-amount" style="color:var(--yellow);">${surcharge > 0 ? formatCurrency(surcharge) : '—'}</td>
        <td class="td-amount ${balClass}">${formatCurrency(Math.abs(runningBalance))} ${runningBalance > 0 ? '↑DR' : (runningBalance < 0 ? '↓CR' : '')}</td>
        <td>
          <div style="display:flex;gap:6px;">
            ${e.isTrip 
              ? `<span style="font-size:11px;color:var(--text-muted);font-weight:600;padding:4px 8px;background:#f1f5f9;border-radius:12px;">Auto: Trip</span>`
              : `<button class="btn btn-ghost btn-xs" onclick="window.ledgerModule.openEditModal(${e.id})"><i data-lucide="edit-2" class="icon-inline" style="width:14px;height:14px;"></i></button>
                 <button class="btn btn-danger btn-xs" onclick="window.ledgerModule.deleteEntry(${e.id})"><i data-lucide="trash-2" class="icon-inline" style="width:14px;height:14px;"></i></button>`
            }
          </div>
        </td>
      </tr>`;
    });

    // Summary
    const outstanding = totalFreight - totalReceived;
    const sumEl = document.getElementById('ledger-summary');
    if (sumEl) {
      sumEl.style.display = 'grid';
      document.getElementById('ls-freight').textContent     = formatCurrency(totalFreight);
      document.getElementById('ls-received').textContent    = formatCurrency(totalReceived);
      document.getElementById('ls-outstanding').textContent = formatCurrency(Math.max(outstanding, 0));
      document.getElementById('ls-entries').textContent     = (entries || []).length;
    }

    if (!entries || entries.length === 0) {
      wrapper.innerHTML = `<div class="empty-state"><span class="empty-icon"><i data-lucide="book-open" class="icon-inline"></i></span><div class="empty-title">No entries for ${currentCompanyName}</div><div class="empty-sub">Click "Add Entry" to create the first ledger entry</div></div>`;
      refreshIcons();
      return;
    }

    wrapper.innerHTML = `
      <div class="table-toolbar">
        <span class="table-toolbar-title"><i data-lucide="book-open" class="icon-inline"></i> ${currentCompanyName} Ledger${currentCompanyGst}</span>
        <button class="btn btn-ghost btn-sm" onclick="window.ledgerModule.exportCSV()">⬇ Export</button>
      </div>
      <div class="table-scroll">
        <table id="ledger-table">
          <thead><tr>
            <th>#</th><th>Date</th><th>Truck No</th><th>GR No</th><th>Route</th><th>Weight</th>
            <th>Freight</th><th>Payment Recv.</th><th>Shortage</th><th>Surcharge</th><th>Balance</th><th>Actions</th>
          </tr></thead>
          <tbody>${rows.join('')}</tbody>
        </table>
      </div>`;
    refreshIcons();
  } catch(err) {
    wrapper.innerHTML = `<div style="color:var(--red);padding:16px;">${err.message}</div>`;
  }
}

function openAddModal() {
  if (!currentCompanyId) { toast('Select a company first', 'warning'); return; }
  openModal(null);
}
function openEditModal(id) { openModal(id); }

function openModal(editId = null) {
  const vehicleOpts = vehicles.map(v => `<option value="${v}">${v}</option>`).join('');
  const html = `
    <div class="modal-overlay" id="ledger-modal" onclick="if(event.target.id==='ledger-modal')closeModal('ledger-modal')">
      <div class="modal modal-lg">
        <div class="modal-header">
          <span class="modal-title"><i data-lucide="book-open" class="icon-inline"></i> ${editId ? 'Edit Entry' : 'New Ledger Entry'} — ${currentCompanyName}</span>
          <button class="modal-close" onclick="closeModal('ledger-modal')">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group"><label class="form-label">Date</label><input class="form-control" type="date" id="le-date" value="${todayISO()}"></div>
            <div class="form-group"><label class="form-label">Truck Number</label>
              <input class="form-control" id="le-truck" placeholder="Truck no" list="truck-list">
              <datalist id="truck-list">${vehicleOpts}</datalist>
            </div>
            <div class="form-group"><label class="form-label">GR Number</label><input class="form-control" id="le-gr" placeholder="GR/LR No"></div>
            <div class="form-group"><label class="form-label">From Location</label><input class="form-control" id="le-from" placeholder="Origin"></div>
            <div class="form-group"><label class="form-label">To Location</label><input class="form-control" id="le-to" placeholder="Destination"></div>
            <div class="form-group"><label class="form-label">Weight (kg)</label><input class="form-control" type="number" id="le-weight" placeholder="0"></div>
            <div class="form-group"><label class="form-label">Freight Amount (₹)</label><input class="form-control" type="number" id="le-freight" placeholder="0"></div>
            <div class="form-group"><label class="form-label">Payment Received (₹)</label><input class="form-control" type="number" id="le-payment" placeholder="0"></div>
            <div class="form-group"><label class="form-label">Shortage (₹)</label><input class="form-control" type="number" id="le-shortage" placeholder="0"></div>
            <div class="form-group"><label class="form-label">Surcharge (₹)</label><input class="form-control" type="number" id="le-surcharge" placeholder="0"></div>
            <div class="form-group form-full"><label class="form-label">Notes</label><textarea class="form-control" id="le-notes" placeholder="Optional notes…"></textarea></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal('ledger-modal')">Cancel</button>
          <button class="btn btn-primary" onclick="window.ledgerModule.saveEntry(${editId||'null'})"><i data-lucide="save" class="icon-inline"></i> Save Entry</button>
        </div>
      </div>
    </div>`;
  document.getElementById('ledger-modal-container').innerHTML = html;
  refreshIcons();
  if (editId) prefillEntry(editId);
}

async function prefillEntry(id) {
  const { data } = await supabase.from('party_ledger').select('*').eq('id', id).single();
  if (!data) return;
  document.getElementById('le-date').value     = data.entry_date || todayISO();
  document.getElementById('le-truck').value    = data.truck_no  || '';
  document.getElementById('le-gr').value       = data.gr_number || '';
  document.getElementById('le-from').value     = data.from_location || '';
  document.getElementById('le-to').value       = data.to_location   || '';
  document.getElementById('le-weight').value   = data.weight    || '';
  document.getElementById('le-freight').value  = data.freight_amount || '';
  document.getElementById('le-payment').value  = data.payment_received || '';
  document.getElementById('le-shortage').value = data.shortage  || '';
  document.getElementById('le-surcharge').value= data.surcharge || '';
  document.getElementById('le-notes').value    = data.notes     || '';
}

async function saveEntry(editId) {
  const payload = {
    company_id:       currentCompanyId,
    entry_date:       document.getElementById('le-date').value,
    truck_no:         document.getElementById('le-truck').value.trim(),
    gr_number:        document.getElementById('le-gr').value.trim(),
    from_location:    document.getElementById('le-from').value.trim(),
    to_location:      document.getElementById('le-to').value.trim(),
    weight:           parseFloat(document.getElementById('le-weight').value)   || null,
    freight_amount:   parseFloat(document.getElementById('le-freight').value)  || 0,
    payment_received: parseFloat(document.getElementById('le-payment').value)  || 0,
    shortage:         parseFloat(document.getElementById('le-shortage').value) || 0,
    surcharge:        parseFloat(document.getElementById('le-surcharge').value)|| 0,
    notes:            document.getElementById('le-notes').value.trim(),
  };
  try {
    let error;
    if (editId) { ({ error } = await supabase.from('party_ledger').update(payload).eq('id', editId)); }
    else        { ({ error } = await supabase.from('party_ledger').insert([payload])); }
    if (error) throw error;
    closeModal('ledger-modal');
    toast(editId ? 'Entry updated' : 'Entry added ✓');
    await fetchLedgerEntries(currentCompanyId);
  } catch(err) { toast(err.message, 'error'); }
}

async function deleteEntry(id) {
  if (!confirmAction('Delete this ledger entry?')) return;
  const { error } = await supabase.from('party_ledger').delete().eq('id', id);
  if (error) { toast(error.message, 'error'); return; }
  toast('Entry deleted');
  await fetchLedgerEntries(currentCompanyId);
}

function exportCSV() { exportTableToCSV('ledger-table', `ledger_${currentCompanyName}.csv`); }

function closeModal(id) { const el = document.getElementById(id); if(el) el.remove(); }
window.closeModal = closeModal;

// COMPANY MANAGEMENT FROM LEDGER

function openAddCompanyModal() {
  const html = `
    <div class="modal-overlay" id="company-modal" onclick="if(event.target.id==='company-modal')closeModal('company-modal')">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title"><i data-lucide="building" class="icon-inline"></i> Add New Company</span>
          <button class="modal-close" onclick="closeModal('company-modal')">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group form-full"><label class="form-label">Company Name *</label><input class="form-control" id="c-new-name" placeholder="E.g. XYZ Logistics"></div>
            <div class="form-group"><label class="form-label">GST Number</label><input class="form-control" id="c-new-gst" placeholder="GSTIN"></div>
            <div class="form-group"><label class="form-label">Phone</label><input class="form-control" id="c-new-phone"></div>
            <div class="form-group form-full"><label class="form-label">Address</label><input class="form-control" id="c-new-address"></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal('company-modal')">Cancel</button>
          <button class="btn btn-primary" onclick="window.ledgerModule.saveCompany()"><i data-lucide="save" class="icon-inline"></i> Save Company</button>
        </div>
      </div>
    </div>`;
  document.getElementById('ledger-modal-container').innerHTML = html;
  refreshIcons();
}

async function saveCompany() {
  const name = document.getElementById('c-new-name').value.trim();
  if (!name) { toast('Company name is required', 'warning'); return; }
  const payload = {
    name,
    gst_number: document.getElementById('c-new-gst').value.trim() || null,
    phone: document.getElementById('c-new-phone').value.trim() || null,
    address: document.getElementById('c-new-address').value.trim() || null
  };
  const { data, error } = await supabase.from('companies').insert([payload]).select().single();
  if (error) { toast(error.message, 'error'); return; }
  
  toast('Company created!');
  closeModal('company-modal');
  
  // Reload dropdown and select the new company
  await loadCompanyDropdown();
  const sel = document.getElementById('ledger-company-select');
  if (sel) {
    sel.value = data.id;
    await loadCompany(data.id);
  }
}

async function refresh() {
  if (currentCompanyId) await fetchLedgerEntries(currentCompanyId);
}

async function deleteCompany(id) {
  if (!id) { toast('No company selected', 'warning'); return; }
  if (!confirmAction('Delete this company? Their trip history will remain but they will be removed from lists.')) return;
  const { error } = await supabase.from('companies').delete().eq('id', id);
  if (error) { toast(error.message, 'error'); return; }
  toast('Company deleted ✓');
  await loadCompanyDropdown();
  await loadCompany(null);
}

module.exports = { load, loadCompany, refresh, openAddModal, openEditModal, saveEntry, deleteEntry, exportCSV, openAddCompanyModal, saveCompany, deleteCompany };
