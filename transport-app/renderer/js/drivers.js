/* renderer/js/drivers.js — Drivers Management Module */
'use strict';
const { supabase } = require('./supabase-client');
const { formatCurrency, formatDate, statusBadge, toast, confirmAction, todayISO, refreshIcons } = require('./utils');

let searchTerm = '';

async function load() {
  await loadDrivers();
  refreshIcons();
}

const onSearch = (val) => { searchTerm = val.toLowerCase(); loadDrivers(); };

async function loadDrivers() {
  const grid = document.getElementById('drivers-grid');
  if (!grid) return;
  try {
    const sortVal = document.getElementById('drivers-sort')?.value || 'name-asc';
    const [col, dir] = sortVal.split('-');
    let q = supabase.from('drivers').select('*,trips(id)').order(col, { ascending: dir === 'asc' });
    if (searchTerm) q = q.ilike('name', `%${searchTerm}%`);
    const { data, error } = await q;
    if (error) throw error;
    
    grid.innerHTML = (data || []).map(d => {
      const trips = (d.trips || []).length;
      const statusCls = d.is_active === false ? 'badge-red' : 'badge-green';
      const statusTxt = d.is_active === false ? 'Inactive' : 'Active';
      const salary    = d.fixed_salary || 0;
      return `
        <div class="card" style="border-left:3px solid var(--blue);padding:16px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
            <div>
              <div style="font-size:15px;font-weight:700;color:var(--text-primary);"><i data-lucide="user" class="icon-inline"></i> ${d.name}</div>
              <div style="font-size:12px;color:var(--text-muted);">${d.phone || 'No phone'}</div>
            </div>
            <span class="badge ${statusCls}">${statusTxt}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;margin-bottom:14px;">
            <div><span style="color:var(--text-muted);">License:</span> <strong>${d.license_number || '—'}</strong></div>
            <div><span style="color:var(--text-muted);">Trips:</span> <strong>${trips}</strong></div>
            <div><span style="color:var(--text-muted);">Salary:</span> <strong>${formatCurrency(salary)}</strong></div>
            <div><span style="color:var(--text-muted);">Joined:</span> <strong>${formatDate(d.joined_date) || '—'}</strong></div>
          </div>
          <div style="display:flex;gap:4px;">
            <button class="btn btn-ghost btn-sm" style="flex:1;" onclick="window.driversModule.openDriverDetails(${d.id})"><i data-lucide="eye" class="icon-inline" style="width:14px;height:14px;"></i> Details</button>
            <button class="btn btn-ghost btn-sm" style="flex:1;" onclick="window.driversModule.openDriverModal(${d.id})"><i data-lucide="edit-2" class="icon-inline" style="width:14px;height:14px;"></i> Edit</button>
            <button class="btn btn-ghost btn-sm" style="flex:1;color:var(--green);" onclick="window.driversModule.openPayrollModal(${d.id},'${d.name}')"><i data-lucide="banknote" class="icon-inline"></i> Payroll</button>
            <button class="btn btn-danger btn-sm" onclick="window.driversModule.deleteDriver(${d.id})"><i data-lucide="trash-2" class="icon-inline" style="width:14px;height:14px;"></i></button>
          </div>
        </div>`;
    }).join('') || `<div class="empty-state" style="grid-column:1/-1;"><span class="empty-icon"><i data-lucide="user" class="icon-inline"></i></span><div class="empty-title">No drivers record found</div></div>`;
    refreshIcons();
  } catch(err) { grid.innerHTML = `<div style="color:var(--red);padding:16px;">${err.message}</div>`; }
}

function openDriverModal(editId = null) {
  const html = `
    <div class="modal-overlay" id="driver-modal" onclick="if(event.target.id==='driver-modal')closeModal('driver-modal')">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title"><i data-lucide="user" class="icon-inline"></i> ${editId ? 'Edit Driver' : 'Add Driver'}</span>
          <button class="modal-close" onclick="closeModal('driver-modal')">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group"><label class="form-label">Full Name</label><input class="form-control" id="d-name" placeholder="Driver name"></div>
            <div class="form-group"><label class="form-label">Phone</label><input class="form-control" id="d-phone" placeholder="+91 98XXXXXXXX"></div>
            <div class="form-group"><label class="form-label">License Number</label><input class="form-control" id="d-license" placeholder="DL number"></div>
            <div class="form-group"><label class="form-label">Aadhaar Number</label><input class="form-control" id="d-aadhaar" placeholder="12-digit Aadhaar"></div>
            <div class="form-group"><label class="form-label">Monthly Fixed Salary (₹)</label><input class="form-control" type="number" id="d-salary" placeholder="0"></div>
            <div class="form-group"><label class="form-label">Joined Date</label><input class="form-control" type="date" id="d-joined"></div>
            <div class="form-group">
              <label class="form-label">Driver Status</label>
              <div style="display:flex;align-items:center;gap:10px;height:40px;">
                <label class="switch"><input type="checkbox" id="d-active" checked><span class="slider round"></span></label>
                <span id="d-active-label" style="font-weight:600;font-size:12px;">Active / On Duty</span>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal('driver-modal')">Cancel</button>
          <button class="btn btn-primary" onclick="window.driversModule.saveDriver(${editId||'null'})"><i data-lucide="save" class="icon-inline"></i> Save</button>
        </div>
      </div>
    </div>`;
  document.getElementById('drivers-modal-container').innerHTML = html;
  refreshIcons();
  if (editId) prefillDriver(editId);
}

async function prefillDriver(id) {
  const { data } = await supabase.from('drivers').select('*').eq('id', id).single();
  if (!data) return;
  document.getElementById('d-name').value    = data.name    || '';
  document.getElementById('d-phone').value   = data.phone   || '';
  document.getElementById('d-license').value = data.license_number || '';
  document.getElementById('d-aadhaar').value = data.aadhaar_number || '';
  document.getElementById('d-salary').value  = data.fixed_salary || '';
  document.getElementById('d-joined').value  = data.joined_date   || '';
  document.getElementById('d-active').checked = data.is_active !== false;
}

async function saveDriver(editId) {
  const payload = {
    name:           document.getElementById('d-name').value.trim(),
    phone:          document.getElementById('d-phone').value.trim(),
    license_number: document.getElementById('d-license').value.trim(),
    aadhaar_number: document.getElementById('d-aadhaar').value.trim(),
    fixed_salary:   parseFloat(document.getElementById('d-salary').value) || 0,
    joined_date:    document.getElementById('d-joined').value || null,
    is_active:      document.getElementById('d-active').checked,
    status:         (editId ? 'Existing' : 'Available')
  };
  if (!payload.name) { toast('Name required', 'warning'); return; }
  try {
    let error;
    if (editId) { ({ error } = await supabase.from('drivers').update(payload).eq('id', editId)); }
    else        { ({ error } = await supabase.from('drivers').insert([payload])); }
    if (error) throw error;
    closeModal('driver-modal');
    toast(editId ? 'Driver updated' : 'Driver added ✓');
    await loadDrivers();
  } catch(err) { toast(err.message, 'error'); }
}

async function deleteDriver(id) {
  if (!confirmAction('Delete this driver?')) return;
  const { error } = await supabase.from('drivers').delete().eq('id', id);
  if (error) { toast(error.message, 'error'); return; }
  toast('Driver deleted');
  await loadDrivers();
}

function openPayrollModal(driverId, driverName) {
  const html = `
    <div class="modal-overlay" id="payroll-modal" onclick="if(event.target.id==='payroll-modal')closeModal('payroll-modal')">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title"><i data-lucide="banknote" class="icon-inline"></i> Payroll — ${driverName}</span>
          <button class="modal-close" onclick="closeModal('payroll-modal')">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group"><label class="form-label">Date</label><input class="form-control" type="date" id="p-date" value="${todayISO()}"></div>
            <div class="form-group">
              <label class="form-label">Payment Category</label>
              <select class="form-control" id="p-cat">
                <option value="Driver Salary">Salary / Advance</option>
                <option value="Other">Reimbursement (Other)</option>
              </select>
            </div>
            <div class="form-group"><label class="form-label">Amount (₹)</label><input class="form-control" type="number" id="p-amount" placeholder="0"></div>
            <div class="form-group form-full"><label class="form-label">Notes</label><textarea class="form-control" id="p-notes" placeholder="e.g. Month of June Salary"></textarea></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal('payroll-modal')">Cancel</button>
          <button class="btn btn-primary" onclick="window.driversModule.savePayroll(${driverId})"><i data-lucide="save" class="icon-inline"></i> Log Payroll</button>
        </div>
      </div>
    </div>`;
  document.getElementById('drivers-modal-container').innerHTML = html;
}

async function savePayroll(driverId) {
  const payload = {
    driver_id: driverId,
    category: document.getElementById('p-cat').value,
    expense_category: document.getElementById('p-cat').value,
    amount: parseFloat(document.getElementById('p-amount').value) || 0,
    date: document.getElementById('p-date').value,
    notes: document.getElementById('p-notes').value.trim()
  };
  if (!payload.amount) { toast('Enter amount', 'warning'); return; }
  const { error } = await supabase.from('expenses').insert([payload]);
  if (error) { toast(error.message, 'error'); return; }
  closeModal('payroll-modal');
  toast('Payroll logged ✓');
}

async function openDriverDetails(id) {
  const { data: d, error } = await supabase.from('drivers').select('*, trips(id, trip_date, start_location, end_location, status), expenses(date, amount, category, notes)').eq('id', id).single();
  if (error || !d) return;

  const pLogs = (d.expenses || []).map(e => `<tr><td>${e.date}</td><td>${e.category}</td><td>${e.notes || '-'}</td><td style="color:var(--green);">₹${e.amount}</td></tr>`).join('');
  const tLogs = (d.trips || []).map(t => `<tr><td>${t.trip_date}</td><td>${t.start_location} → ${t.end_location}</td><td>${statusBadge(t.status)}</td></tr>`).join('');

  const html = `
    <div class="modal-overlay" id="dd-modal" onclick="if(event.target.id==='dd-modal')closeModal('dd-modal')">
      <div class="modal modal-lg">
        <div class="modal-header">
          <span class="modal-title"><i data-lucide="user" class="icon-inline"></i> Details: ${d.name}</span>
          <button class="modal-close" onclick="closeModal('dd-modal')">✕</button>
        </div>
        <div class="modal-body" style="max-height: 60vh; overflow-y: auto;">
          <h3 style="margin-bottom:8px;font-size:14px;"><i data-lucide="banknote" class="icon-inline"></i> Payroll & Advances</h3>
          <div class="table-wrapper"><table style="width:100%; text-align:left; border-collapse:collapse; margin-bottom:20px;">
            <tr style="border-bottom:1px solid var(--border-color);"><th style="padding:8px;">Date</th><th>Category</th><th>Notes</th><th>Amount</th></tr>
            ${pLogs || '<tr><td colspan="4" style="color:var(--text-muted);padding:8px;">No payroll history.</td></tr>'}
          </table></div>
          <h3 style="margin-bottom:8px;font-size:14px;"><i data-lucide="truck" class="icon-inline"></i> Trip History</h3>
          <div class="table-wrapper"><table style="width:100%; text-align:left; border-collapse:collapse;">
            <tr style="border-bottom:1px solid var(--border-color);"><th style="padding:8px;">Date</th><th>Route</th><th>Status</th></tr>
            ${tLogs || '<tr><td colspan="3" style="color:var(--text-muted);padding:8px;">No trips logged.</td></tr>'}
          </table></div>
        </div>
      </div>
    </div>`;
  document.getElementById('drivers-modal-container').innerHTML = html;
  if(window.lucide) window.lucide.createIcons();
}


module.exports = { load, onSearch, loadDrivers, openDriverModal, saveDriver, deleteDriver, openPayrollModal, savePayroll, openDriverDetails };
