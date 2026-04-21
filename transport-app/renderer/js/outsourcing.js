/* renderer/js/outsourcing.js — Third-Party Transport (Outsourced Trips) */
'use strict';
const { supabase } = require('./supabase-client');
const { formatCurrency, formatDate, statusBadge, toast, getRange, renderPagination, confirmAction, todayISO, refreshIcons, formatCompactNumber } = require('./utils');

let activeTab = 'outbound';
let outboundPage = 1;
let inboundPage  = 1;

async function load() {
  await Promise.all([loadKPIs(), loadTab('outbound'), loadTab('inbound')]);
  refreshIcons();
}

function showTab(tab) {
  activeTab = tab;
  document.querySelectorAll('#page-outsourcing .tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('#page-outsourcing .tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('out-tab-' + tab).classList.add('active');
  document.getElementById('tab-' + tab).classList.add('active');
  refreshIcons();
}

async function loadKPIs() {
  const el = document.getElementById('out-kpi-grid');
  if (!el) return;
  const { data } = await supabase.from('outsourced_trips').select('direction,freight_received,freight_paid,payment_status');
  const all = data || [];
  const outbound = all.filter(r => r.direction === 'outbound');
  const inbound  = all.filter(r => r.direction === 'inbound');
  const totalRecv = all.reduce((s, r) => s + parseFloat(r.freight_received || 0), 0);
  const totalPaid = all.reduce((s, r) => s + parseFloat(r.freight_paid    || 0), 0);
  const margin    = totalRecv - totalPaid;

  el.innerHTML = `
    <div class="kpi-card" style="--kpi-color:var(--accent);">
      <span class="kpi-icon"><i data-lucide="arrow-up-right" class="icon-inline"></i></span>
      <div class="kpi-label">Outbound Trips</div>
      <div class="kpi-value">${outbound.length}</div>
      <div class="kpi-sub">Client → External</div>
    </div>
    <div class="kpi-card" style="--kpi-color:var(--blue);">
      <span class="kpi-icon"><i data-lucide="arrow-down-left" class="icon-inline"></i></span>
      <div class="kpi-label">Inbound Trips</div>
      <div class="kpi-value">${inbound.length}</div>
      <div class="kpi-sub">From transporters</div>
    </div>
    <div class="kpi-card" style="--kpi-color:var(--green);">
      <span class="kpi-icon"><i data-lucide="coins" class="icon-inline"></i></span>
      <div class="kpi-label">Freight Received</div>
      <div class="kpi-value" title="₹${totalRecv.toLocaleString('en-IN')}">₹${totalRecv.toLocaleString('en-IN')}</div>
      <div class="kpi-sub">Total billed to clients</div>
    </div>
    <div class="kpi-card" style="--kpi-color:var(--red);">
      <span class="kpi-icon"><i data-lucide="banknote" class="icon-inline"></i></span>
      <div class="kpi-label">Freight Paid</div>
      <div class="kpi-value" title="₹${totalPaid.toLocaleString('en-IN')}">₹${totalPaid.toLocaleString('en-IN')}</div>
      <div class="kpi-sub">Paid to transporters</div>
    </div>
    <div class="kpi-card" style="--kpi-color:${margin >= 0 ? 'var(--green)' : 'var(--red)'};">
      <span class="kpi-icon"><i data-lucide="bar-chart-2" class="icon-inline"></i></span>
      <div class="kpi-label">Net Margin</div>
      <div class="kpi-value ${margin >= 0 ? 'kpi-positive' : 'kpi-negative'}" title="₹${margin.toLocaleString('en-IN')}">₹${margin.toLocaleString('en-IN')}</div>
      <div class="kpi-sub">Received − Paid</div>
    </div>
  `;
  refreshIcons();
}

async function loadTab(direction) {
  const containerEl = document.getElementById('out-tab-' + direction);
  if (!containerEl) return;
  const page = direction === 'outbound' ? outboundPage : inboundPage;
  const { from, to } = getRange(page);

  try {
    const { data, count, error } = await supabase
      .from('outsourced_trips')
      .select('*', { count: 'exact' })
      .eq('direction', direction)
      .order('trip_date', { ascending: false })
      .range(from, to);
    if (error) throw error;

    if (!data || data.length === 0) {
      containerEl.innerHTML = `<div class="empty-state"><span class="empty-icon">${direction === 'outbound' ? '<i data-lucide="arrow-up-right" class="icon-inline"></i>' : '<i data-lucide="arrow-down-left" class="icon-inline"></i>'}</span><div class="empty-title">No ${direction} trips</div><div class="empty-sub">Click "Add Record" to create one</div></div>`;
      return;
    }

    const rows = data.map((r, i) => {
      const margin = parseFloat(r.freight_received || 0) - parseFloat(r.freight_paid || 0);
      return `<tr>
        <td class="td-primary">${from+i+1}</td>
        <td>${formatDate(r.trip_date)}</td>
        <td class="td-primary">${direction==='outbound' ? (r.client_name || '—') : (r.transporter_name || '—')}</td>
        <td>${direction==='outbound' ? (r.transporter_name || '—') : (r.client_name || '—')}</td>
        <td>${r.from_location || ''}${r.to_location ? ' → ' + r.to_location : ''}</td>
        <td class="td-amount" style="color:var(--green);">${formatCurrency(r.freight_received)}</td>
        <td class="td-amount" style="color:var(--red);">${formatCurrency(r.freight_paid)}</td>
        <td class="td-amount ${margin >= 0 ? 'profit-positive' : 'profit-negative'}">${formatCurrency(margin)}</td>
        <td>${statusBadge(r.payment_status)}</td>
        <td>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-ghost btn-xs" onclick="window.outsourcingModule.openEditModal(${r.id})"><i data-lucide="edit-2" class="icon-inline" style="width:14px;height:14px;"></i></button>
            <button class="btn btn-ghost btn-xs" style="color:var(--red);" onclick="window.outsourcingModule.openOutsourcedExpenseModal(${r.id}, '${direction==='outbound' ? r.client_name : r.transporter_name}')"><i data-lucide="banknote" class="icon-inline" style="width:14px;height:14px;"></i> Exp.</button>
            <button class="btn btn-danger btn-xs" onclick="window.outsourcingModule.deleteRecord(${r.id})"><i data-lucide="trash-2" class="icon-inline" style="width:14px;height:14px;"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');

    const paginId = `out-pag-${direction}`;
    containerEl.innerHTML = `
      <div class="table-wrapper">
        <div class="table-scroll">
          <table>
            <thead><tr>
              <th>#</th><th>Date</th>
              <th>${direction === 'outbound' ? 'Client' : 'Transporter'}</th>
              <th>${direction === 'outbound' ? 'Transporter' : 'Client'}</th>
              <th>Route</th><th>Received</th><th>Paid</th><th>Margin</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div class="pagination" id="${paginId}"></div>
      </div>`;
    refreshIcons();

    renderPagination(paginId, count || 0, page, (p) => {
      if (direction === 'outbound') outboundPage = p; else inboundPage = p;
      loadTab(direction);
    });
  } catch(err) {
    containerEl.innerHTML = `<div style="color:var(--red);padding:16px;">${err.message}</div>`;
  }
}

function openAddModal() { openModal(null); }
function openEditModal(id) { openModal(id); }

function openModal(editId = null) {
  const html = `
    <div class="modal-overlay" id="out-modal" onclick="if(event.target.id==='out-modal')closeModal('out-modal')">
      <div class="modal modal-lg">
        <div class="modal-header">
          <span class="modal-title"><i data-lucide="handshake" class="icon-inline"></i> ${editId ? 'Edit' : 'Add'} Outsourced Trip</span>
          <button class="modal-close" onclick="closeModal('out-modal')">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Direction</label>
              <select class="form-control" id="ot-dir">
                <option value="outbound"><i data-lucide="arrow-up-right" class="icon-inline"></i> Outbound (Client → External)</option>
                <option value="inbound"><i data-lucide="arrow-down-left" class="icon-inline"></i> Inbound (From Transporter)</option>
              </select>
            </div>
            <div class="form-group"><label class="form-label">Date</label><input class="form-control" type="date" id="ot-date" value="${todayISO()}"></div>
            <div class="form-group"><label class="form-label">Client Name</label><input class="form-control" id="ot-client" placeholder="Client who gave the work"></div>
            <div class="form-group"><label class="form-label">External Transporter</label><input class="form-control" id="ot-transporter" placeholder="Transporter who did the trip"></div>
            <div class="form-group"><label class="form-label">From Location</label><input class="form-control" id="ot-from" placeholder="Origin"></div>
            <div class="form-group"><label class="form-label">To Location</label><input class="form-control" id="ot-to" placeholder="Destination"></div>
            <div class="form-group"><label class="form-label">Freight Received (₹)</label><input class="form-control" type="number" id="ot-recv" placeholder="0" oninput="calcOutMargin()"></div>
            <div class="form-group"><label class="form-label">Freight Paid (₹)</label><input class="form-control" type="number" id="ot-paid" placeholder="0" oninput="calcOutMargin()"></div>
            <div class="form-group">
              <label class="form-label">Margin (auto)</label>
              <input class="form-control" id="ot-margin" readonly style="background:var(--bg-elevated);color:var(--green);font-weight:700;">
            </div>
            <div class="form-group">
              <label class="form-label">Payment Status</label>
              <select class="form-control" id="ot-status">
                <option value="Pending">Pending</option>
                <option value="Partial">Partial</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
            <div class="form-group form-full"><label class="form-label">Notes</label><textarea class="form-control" id="ot-notes" placeholder="Optional…"></textarea></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal('out-modal')">Cancel</button>
          <button class="btn btn-primary" onclick="window.outsourcingModule.saveRecord(${editId||'null'})"><i data-lucide="save" class="icon-inline"></i> Save</button>
        </div>
      </div>
    </div>`;
  document.getElementById('outsourcing-modal-container').innerHTML = html;
  refreshIcons();
  if (editId) prefillRecord(editId);
}

function calcOutMargin() {
  const recv = parseFloat(document.getElementById('ot-recv')?.value || 0);
  const paid = parseFloat(document.getElementById('ot-paid')?.value || 0);
  const m = recv - paid;
  const el = document.getElementById('ot-margin');
  if (el) { el.value = `₹${m.toLocaleString('en-IN')}`; el.style.color = m >= 0 ? 'var(--green)' : 'var(--red)'; }
}
window.calcOutMargin = calcOutMargin;

async function prefillRecord(id) {
  const { data } = await supabase.from('outsourced_trips').select('*').eq('id', id).single();
  if (!data) return;
  document.getElementById('ot-dir').value         = data.direction || 'outbound';
  document.getElementById('ot-date').value        = data.trip_date || todayISO();
  document.getElementById('ot-client').value      = data.client_name || '';
  document.getElementById('ot-transporter').value = data.transporter_name || '';
  document.getElementById('ot-from').value        = data.from_location || '';
  document.getElementById('ot-to').value          = data.to_location   || '';
  document.getElementById('ot-recv').value        = data.freight_received || '';
  document.getElementById('ot-paid').value        = data.freight_paid    || '';
  document.getElementById('ot-status').value      = data.payment_status  || 'Pending';
  document.getElementById('ot-notes').value       = data.notes || '';
  calcOutMargin();
}

async function saveRecord(editId) {
  const payload = {
    direction:         document.getElementById('ot-dir').value,
    trip_date:         document.getElementById('ot-date').value,
    client_name:       document.getElementById('ot-client').value.trim(),
    transporter_name:  document.getElementById('ot-transporter').value.trim(),
    from_location:     document.getElementById('ot-from').value.trim(),
    to_location:       document.getElementById('ot-to').value.trim(),
    freight_received:  parseFloat(document.getElementById('ot-recv').value) || 0,
    freight_paid:      parseFloat(document.getElementById('ot-paid').value) || 0,
    payment_status:    document.getElementById('ot-status').value,
    notes:             document.getElementById('ot-notes').value.trim(),
  };
  try {
    let error;
    if (editId) { 
      ({ error } = await supabase.from('outsourced_trips').update(payload).eq('id', editId)); 
    }
    else { 
      const { data, error: insertErr } = await supabase.from('outsourced_trips').insert([payload]).select().single(); 
      error = insertErr;
      
      if (!error && payload.direction === 'outbound') {
        // Automatically reflect this outbound trip in the main trips table
        await supabase.from('trips').insert([{
          trip_date: payload.trip_date,
          start_location: payload.from_location,
          end_location: payload.to_location,
          consignor: payload.client_name,
          consignee: payload.transporter_name, // Treat transporter as consignee to track who took it
          freight_amount: payload.freight_received,
          advance_payment: payload.freight_paid, // Represents what was paid out to transporter
          status: 'Pending',
          notes: 'Auto-synced from Outsourced (Outbound)'
        }]);
      }
    }
    if (error) throw error;
    closeModal('out-modal');
    toast(editId ? 'Record updated' : 'Record added ✓');
    await Promise.all([loadKPIs(), loadTab('outbound'), loadTab('inbound')]);
  } catch(err) { toast(err.message, 'error'); }
}

async function deleteRecord(id) {
  if (!confirmAction('Delete this record?')) return;
  const { error } = await supabase.from('outsourced_trips').delete().eq('id', id);
  if (error) { toast(error.message, 'error'); return; }
  toast('Record deleted');
  await Promise.all([loadKPIs(), loadTab('outbound'), loadTab('inbound')]);
}

function openOutsourcedExpenseModal(id, partyName) {
  const html = `
    <div class="modal-overlay" id="out-exp-modal" onclick="if(event.target.id==='out-exp-modal')closeModal('out-exp-modal')">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title"><i data-lucide="banknote" class="icon-inline"></i> Log Expense — ${partyName}</span>
          <button class="modal-close" onclick="closeModal('out-exp-modal')">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group"><label class="form-label">Date</label><input class="form-control" type="date" id="oe-date" value="${todayISO()}"></div>
            <div class="form-group"><label class="form-label">Amount (₹)</label><input class="form-control" type="number" id="oe-amount" placeholder="0"></div>
            <div class="form-group"><label class="form-label">Category</label>
              <select class="form-control" id="oe-cat">
                <option>Other</option><option>Toll</option><option>Commission</option>
              </select>
            </div>
            <div class="form-group form-full"><label class="form-label">Notes</label><textarea class="form-control" id="oe-notes" placeholder="Optional details…"></textarea></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal('out-exp-modal')">Cancel</button>
          <button class="btn btn-primary" onclick="window.outsourcingModule.saveOutsourcedExpense(${id})">Save Expense</button>
        </div>
      </div>
    </div>`;
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container.firstElementChild);
  refreshIcons();
}

async function saveOutsourcedExpense(id) {
  const payload = {
    amount: parseFloat(document.getElementById('oe-amount').value) || 0,
    date: document.getElementById('oe-date').value,
    expense_category: document.getElementById('oe-cat').value,
    notes: document.getElementById('oe-notes').value.trim() + ' (Linked to Outsourced Trip #' + id + ')',
    category: document.getElementById('oe-cat').value
  };
  if (!payload.amount) { toast('Enter amount', 'warning'); return; }
  const { error } = await supabase.from('expenses').insert([payload]);
  if (error) { toast(error.message, 'error'); return; }
  closeModal('out-exp-modal');
  toast('Expense logged ✓');
}

window.closeModal = closeModal;

module.exports = { load, showTab, openAddModal, openEditModal, saveRecord, deleteRecord, openOutsourcedExpenseModal, saveOutsourcedExpense };
