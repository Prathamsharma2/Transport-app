/* renderer/js/expenses.js — Expense Management Module */
'use strict';
const { supabase } = require('./supabase-client');
const { formatCurrency, formatDate, statusBadge, toast, getRange, renderPagination, exportTableToCSV, confirmAction, todayISO, refreshIcons, formatCompactNumber } = require('./utils');
const { getFilters } = require('./filters');

let currentPage = 1;
let trips = [];
let catChart = null;
let monthlyExpChart = null;

async function load() {
  currentPage = 1;
  await Promise.all([loadTrips(), fetchExpenses(), loadKPIs(), loadCharts()]);
  refreshIcons();
}

async function loadTrips() {
  const { data } = await supabase.from('trips').select('id,gr_number,start_location,end_location').order('trip_date',{ascending:false}).limit(100);
  trips = data || [];
}

async function loadKPIs() {
  const el = document.getElementById('exp-kpi-grid');
  if (!el) return;
  const f = getFilters();
  let q = supabase.from('expenses').select('amount,expense_category');
  if (f.dateFrom) q = q.gte('date', f.dateFrom);
  if (f.dateTo)   q = q.lte('date', f.dateTo);
  if (f.vehicleId) q = q.eq('vehicle_id', f.vehicleId);
  if (f.driverId)  q = q.eq('driver_id', f.driverId);
  if (f.companyId) q = q.eq('company_id', f.companyId);
  if (f.categoryId) q = q.eq('expense_category', f.categoryId);

  const { data } = await q;
  const exps = data || [];

  const total = exps.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const byCategory = {};
  exps.forEach(e => { const c = e.expense_category || 'Other'; byCategory[c] = (byCategory[c] || 0) + parseFloat(e.amount || 0); });

  const topCat = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];

  el.innerHTML = `
    <div class="kpi-card" style="--kpi-color:var(--red);">
      <span class="kpi-icon"><i data-lucide="banknote" class="icon-inline"></i></span>
      <div class="kpi-label">Total Expenses</div>
      <div class="kpi-value">${formatCurrency(total)}</div>
      <div class="kpi-sub">${exps.length} entries</div>
    </div>
    <div class="kpi-card" style="--kpi-color:var(--yellow);">
      <span class="kpi-icon">⛽</span>
      <div class="kpi-label">Fuel</div>
      <div class="kpi-value">${formatCurrency(byCategory['Fuel'] || 0)}</div>
      <div class="kpi-sub">Fuel expenses</div>
    </div>
    <div class="kpi-card" style="--kpi-color:var(--blue);">
      <span class="kpi-icon">🛣️</span>
      <div class="kpi-label">Toll</div>
      <div class="kpi-value">${formatCurrency(byCategory['Toll'] || 0)}</div>
      <div class="kpi-sub">Toll charges</div>
    </div>
    <div class="kpi-card" style="--kpi-color:var(--purple);">
      <span class="kpi-icon"><i data-lucide="user" class="icon-inline"></i></span>
      <div class="kpi-label">Driver Salary</div>
      <div class="kpi-value">${formatCurrency(byCategory['Driver Salary'] || 0)}</div>
      <div class="kpi-sub">Driver payments</div>
    </div>
    <div class="kpi-card" style="--kpi-color:var(--cyan);">
      <span class="kpi-icon"><i data-lucide="wrench" class="icon-inline"></i></span>
      <div class="kpi-label">Maintenance</div>
      <div class="kpi-value">${formatCurrency(byCategory['Maintenance'] || 0)}</div>
      <div class="kpi-sub">Repair & service</div>
    </div>
  `;
  refreshIcons();
}

async function fetchExpenses() {
  const tbody = document.getElementById('expenses-table-body');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="8" style="padding:24px;text-align:center;color:var(--text-muted);">Loading…</td></tr>`;
  try {
    const f = getFilters();
    const { from, to } = getRange(currentPage);
    const sortVal = document.getElementById('expenses-sort')?.value || 'date-desc';
    const [col, dir] = sortVal.split('-');

    let q = supabase.from('expenses')
      .select('*,trips(gr_number,start_location,end_location),vehicles(vehicle_number),drivers(name),companies(name)', { count:'exact' })
      .order(col, { ascending: dir === 'asc' })
      .range(from, to);

    if (f.dateFrom) q = q.gte('date', f.dateFrom);
    if (f.dateTo)   q = q.lte('date', f.dateTo);
    if (f.vehicleId) q = q.eq('vehicle_id', f.vehicleId);
    if (f.driverId)  q = q.eq('driver_id', f.driverId);
    if (f.companyId) q = q.eq('company_id', f.companyId);
    if (f.categoryId) q = q.eq('expense_category', f.categoryId);

    const { data, count, error } = await q;
    if (error) throw error;

    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><span class="empty-icon"><i data-lucide="banknote" class="icon-inline"></i></span><div class="empty-title">No expenses</div><div class="empty-sub">Add expenses linked to trips</div></div></td></tr>`;
    } else {
      const catColors = { Fuel:'badge-yellow', Toll:'badge-blue', 'Driver Salary':'badge-purple', Maintenance:'badge-orange', Other:'badge-gray' };
      tbody.innerHTML = data.map((e, i) => {
        let context = '—';
        if (e.trips) context = e.trips.gr_number || e.trips.start_location + '→' + e.trips.end_location;
        else if (e.vehicles) context = 'Truck: ' + e.vehicles.vehicle_number;
        else if (e.drivers) context = 'Driver: ' + e.drivers.name;
        else if (e.companies) context = 'Company: ' + e.companies.name;

        return `<tr>
          <td class="td-primary">${from+i+1}</td>
          <td>${formatDate(e.date)}</td>
          <td><span class="badge ${catColors[e.expense_category] || 'badge-gray'}">${e.expense_category || 'Other'}</span></td>
          <td>${context}</td>
          <td class="td-amount kpi-negative">${formatCurrency(e.amount)}</td>
          <td>${e.vendor || '—'}</td>
          <td style="font-size:12px;color:var(--text-muted);">${e.notes || '—'}</td>
          <td>
            <div style="display:flex;gap:6px;">
              <button class="btn btn-ghost btn-xs" onclick="window.expensesModule.openEditModal(${e.id})"><i data-lucide="edit-2" class="icon-inline" style="width:14px;height:14px;"></i></button>
              <button class="btn btn-danger btn-xs" onclick="window.expensesModule.deleteExpense(${e.id})"><i data-lucide="trash-2" class="icon-inline" style="width:14px;height:14px;"></i></button>
            </div>
          </td>
        </tr>`;
      }).join('');
      refreshIcons();
    }
    renderPagination('expenses-pagination', count || 0, currentPage, (p) => { currentPage = p; fetchExpenses(); });
  } catch(err) {
    tbody.innerHTML = `<tr><td colspan="8" style="color:var(--red);padding:16px;">${err.message}</td></tr>`;
  }
}

async function loadCharts() {
  try {
    const { data: exps } = await supabase.from('expenses').select('amount,expense_category,date');
    const byCategory = {};
    const byMonth = {};
    (exps||[]).forEach(e => {
      const c = e.expense_category || 'Other';
      const m = e.date?.slice(0,7) || 'unknown';
      byCategory[c] = (byCategory[c] || 0) + parseFloat(e.amount || 0);
      byMonth[m]    = (byMonth[m]    || 0) + parseFloat(e.amount || 0);
    });

    // Donut chart
    const catCanvas = document.getElementById('chart-exp-category');
    if (catCanvas) {
      if (catChart) { catChart.destroy(); catChart = null; }
      const catLabels = Object.keys(byCategory);
      const catValues = Object.values(byCategory);
      const catColors = ['#f97316','#ef4444','#a855f7','#3b82f6','#06b6d4'];
      catChart = new Chart(catCanvas, {
        type: 'doughnut',
        data: { labels: catLabels, datasets: [{ data: catValues, backgroundColor: catColors, borderWidth: 0, hoverOffset: 8 }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { color: '#94a3b8', boxWidth: 12, font: { size: 11 } } },
            tooltip: { callbacks: { label: ctx => ` ₹${ctx.raw?.toLocaleString('en-IN')}` } }
          }
        }
      });
    }

    // Monthly line chart
    const monthCanvas = document.getElementById('chart-exp-monthly');
    if (monthCanvas) {
      if (monthlyExpChart) { monthlyExpChart.destroy(); monthlyExpChart = null; }
      const months = Object.keys(byMonth).sort().slice(-12);
      const vals   = months.map(m => byMonth[m]);
      monthlyExpChart = new Chart(monthCanvas, {
        type: 'bar',
        data: {
          labels: months.map(m => { const [y,mo]=m.split('-'); return new Date(y,mo-1).toLocaleString('en-IN',{month:'short',year:'2-digit'}); }),
          datasets: [{ label: 'Expenses', data: vals, backgroundColor: 'rgba(239,68,68,0.65)', borderRadius: 6 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color:'#64748b', font:{size:10} }, grid: { color:'rgba(255,255,255,0.04)' } },
            y: { ticks: { color:'#64748b', font:{size:10}, callback: v => '₹'+formatCompactNumber(v) }, grid: { color:'rgba(255,255,255,0.04)' } }
          }
        }
      });
    }
  } catch(err) { console.error('[Expense Charts]', err); }
}

function openAddModal() { openModal(null); }
function openEditModal(id) { openModal(id); }

function openModal(editId = null) {
  const tripOpts = trips.map(t => `<option value="${t.id}">${t.gr_number || t.id}: ${t.start_location||''}→${t.end_location||''}</option>`).join('');
  const catOpts = ['Fuel','Toll','Driver Salary','Maintenance','Loan Repayment','Other'].map(c => `<option>${c}</option>`).join('');
  const html = `
    <div class="modal-overlay" id="expense-modal" onclick="if(event.target.id==='expense-modal')closeModal('expense-modal')">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title"><i data-lucide="banknote" class="icon-inline"></i> ${editId ? 'Edit Expense' : 'Add Expense'}</span>
          <button class="modal-close" onclick="closeModal('expense-modal')">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Category</label>
              <select class="form-control" id="em-cat">${catOpts}</select>
            </div>
            <div class="form-group">
              <label class="form-label">Amount (₹)</label>
              <input class="form-control" type="number" id="em-amount" placeholder="0">
            </div>
            <div class="form-group">
              <label class="form-label">Date</label>
              <input class="form-control" type="date" id="em-date" value="${todayISO()}">
            </div>
            <div class="form-group">
              <label class="form-label">Vendor</label>
              <input class="form-control" id="em-vendor" placeholder="e.g. Petrol pump name">
            </div>
            <div class="form-group form-full">
              <label class="form-label">Link to Trip (optional)</label>
              <select class="form-control" id="em-trip">
                <option value="">No trip</option>${tripOpts}
              </select>
            </div>
            <div class="form-group form-full">
              <label class="form-label">Notes</label>
              <textarea class="form-control" id="em-notes" placeholder="Optional notes…"></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal('expense-modal')">Cancel</button>
          <button class="btn btn-primary" onclick="window.expensesModule.saveExpense(${editId||'null'})"><i data-lucide="save" class="icon-inline"></i> Save</button>
        </div>
      </div>
    </div>`;
  document.getElementById('expenses-modal-container').innerHTML = html;
  refreshIcons();
  if (editId) prefillExpense(editId);
}

async function prefillExpense(id) {
  const { data } = await supabase.from('expenses').select('*').eq('id', id).single();
  if (!data) return;
  document.getElementById('em-cat').value    = data.expense_category || 'Other';
  document.getElementById('em-amount').value = data.amount || '';
  document.getElementById('em-date').value   = data.date || todayISO();
  document.getElementById('em-vendor').value = data.vendor || '';
  document.getElementById('em-trip').value   = data.trip_id || '';
  document.getElementById('em-notes').value  = data.notes || '';
}

async function saveExpense(editId) {
  const payload = {
    expense_category: document.getElementById('em-cat').value,
    category:         document.getElementById('em-cat').value,
    amount:           parseFloat(document.getElementById('em-amount').value) || 0,
    date:             document.getElementById('em-date').value,
    vendor:           document.getElementById('em-vendor').value.trim(),
    trip_id:          document.getElementById('em-trip').value || null,
    notes:            document.getElementById('em-notes').value.trim(),
  };
  try {
    let error;
    if (editId) {
      ({ error } = await supabase.from('expenses').update(payload).eq('id', editId));
    } else {
      ({ error } = await supabase.from('expenses').insert([payload]));
    }
    if (error) throw error;
    closeModal('expense-modal');
    toast(editId ? 'Expense updated' : 'Expense added ✓');
    await Promise.all([fetchExpenses(), loadKPIs(), loadCharts()]);
  } catch(err) { toast(err.message, 'error'); }
}

async function deleteExpense(id) {
  if (!confirmAction('Delete this expense?')) return;
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) { toast(error.message, 'error'); return; }
  toast('Expense deleted');
  await fetchExpenses();
}

function exportCSV() { exportTableToCSV('expenses-table-body', 'expenses.csv'); }

function closeModal(id) { const el = document.getElementById(id); if (el) el.remove(); }
window.closeModal = closeModal;

module.exports = { load, fetchExpenses, openAddModal, openEditModal, saveExpense, deleteExpense, exportCSV };
