/* renderer/js/pending-trips.js — Urgent / Incomplete Work Dashboard */
'use strict';
const { supabase } = require('./supabase-client');
const { formatCurrency, formatDate, statusBadge, refreshIcons } = require('./utils');
const { getFilters, onFilterChange } = require('./filters');

// Attach listener once to keep data fresh when global filters change
onFilterChange(() => {
  const page = document.getElementById('page-pending-trips');
  if (page && page.style.display !== 'none') {
    load();
  }
});

async function load() {
  await loadKPIs();
  await loadPendingTable();
  refreshIcons();
}

async function loadKPIs() {
  const container = document.getElementById('pending-kpi-grid');
  if (!container) return;

  try {
    const f = getFilters();
    let q = supabase.from('trips').select('status, freight_amount');
    
    // Apply filters to KPIs
    if (f.dateFrom) q = q.gte('trip_date', f.dateFrom);
    if (f.dateTo)   q = q.lte('trip_date', f.dateTo);
    if (f.companyId) q = q.eq('company_id', f.companyId);
    if (f.vehicleId) q = q.eq('vehicle_id', f.vehicleId);
    if (f.driverId)  q = q.eq('driver_id', f.driverId);

    const { data: all, error } = await q;
    if (error) throw error;

    const pending = all.filter(t => t.status?.toLowerCase() === 'pending').length;
    const assigned = all.filter(t => t.status?.toLowerCase() === 'assigned').length;
    const progress = all.filter(t => t.status?.toLowerCase() === 'in-progress' || t.status?.toLowerCase() === 'in progress').length;
    const totalIncomplete = pending + assigned + progress;

    container.innerHTML = `
      <div class="kpi-card" style="--kpi-color:var(--red);">
        <div class="kpi-label">Pending Confirmation</div>
        <div class="kpi-value">${pending}</div>
      </div>
      <div class="kpi-card" style="--kpi-color:var(--yellow);">
        <div class="kpi-label">Currently Assigned</div>
        <div class="kpi-value">${assigned}</div>
      </div>
      <div class="kpi-card" style="--kpi-color:var(--blue);">
        <div class="kpi-label">Trips In Progress</div>
        <div class="kpi-value">${progress}</div>
      </div>
      <div class="kpi-card" style="--kpi-color:var(--accent);">
        <div class="kpi-label">Total Incomplete</div>
        <div class="kpi-value">${totalIncomplete}</div>
      </div>
    `;
  } catch(err) { console.error('Pending KPI Error:', err); }
}

async function loadPendingTable() {
  const tbody = document.getElementById('pending-trips-body');
  if (!tbody) return;

  try {
    const f = getFilters();
    const sortVal = document.getElementById('pending-sort')?.value || 'trip_date-asc';
    const [col, dir] = sortVal.split('-');

    let q = supabase
      .from('trips')
      .select('*, vehicles(vehicle_number), drivers(name)')
      .not('status', 'ilike', 'completed')
      .order(col, { ascending: dir === 'asc' });

    // Apply global filters
    if (f.dateFrom) q = q.gte('trip_date', f.dateFrom);
    if (f.dateTo)   q = q.lte('trip_date', f.dateTo);
    if (f.companyId) q = q.eq('company_id', f.companyId);
    if (f.vehicleId) q = q.eq('vehicle_id', f.vehicleId);
    if (f.driverId)  q = q.eq('driver_id', f.driverId);
    if (f.status)    q = q.ilike('status', f.status);

    const { data, error } = await q;
    if (error) throw error;

    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:40px;">No pending trips match your filters.</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(t => `
      <tr>
        <td>${formatDate(t.trip_date)}</td>
        <td>${t.start_location || '—'} → ${t.end_location || '—'}</td>
        <td>${t.vehicles?.vehicle_number || '—'}</td>
        <td>${t.drivers?.name || '—'}</td>
        <td>${statusBadge(t.status)}</td>
        <td>
          <button class="btn btn-ghost btn-xs" onclick="navigate('trips'); window.tripsModule.openEditTrip(${t.id})">Update Trip</button>
        </td>
      </tr>
    `).join('');
  } catch(err) { tbody.innerHTML = `<tr><td colspan="6" style="color:var(--red);">${err.message}</td></tr>`; }
}

module.exports = { load };
