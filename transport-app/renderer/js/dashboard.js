/* renderer/js/dashboard.js — Dashboard KPIs, Charts, Recent Trips */
'use strict';
const { supabase } = require('./supabase-client');
const { formatCurrency, formatDate, statusBadge, profitClass, firstDayOfMonth, todayISO, refreshIcons, formatCompactNumber } = require('./utils');
const { getFilters } = require('./filters');

let monthlyChart = null;
let vehicleChart = null;

async function load() {
  await Promise.all([loadKPIs(), loadRecentTrips(), loadCharts()]);
  refreshIcons();
}

async function loadKPIs() {
  const el = document.getElementById('dash-kpi-grid');
  if (!el) return;
  el.innerHTML = '';

  try {
    // Total freight (revenue) from trips this month
    const f = getFilters();
    const dateFrom = f.dateFrom || firstDayOfMonth();
    const dateTo   = f.dateTo   || todayISO();

    let q = supabase.from('trips').select('freight_amount, id');
    q = q.gte('trip_date', dateFrom).lte('trip_date', dateTo);
    if (f.vehicleId) q = q.eq('vehicle_id', f.vehicleId);
    if (f.companyId) q = q.eq('company_id', f.companyId);
    if (f.status)    q = q.eq('status', f.status);
    const { data: trips } = await q;

    const totalRevenue = (trips || []).reduce((s, t) => s + parseFloat(t.freight_amount || 0), 0);
    const totalTrips   = (trips || []).length;
    const tripIds      = (trips || []).map(t => t.id);

    // Total expenses for the period (all expenses, not just trip-linked)
    const { data: exps } = await supabase.from('expenses').select('amount').gte('date', dateFrom).lte('date', dateTo);
    const totalExpenses = (exps || []).reduce((s, e) => s + parseFloat(e.amount || 0), 0);

    const netProfit    = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;
    const avgProfit    = totalTrips > 0 ? netProfit / totalTrips : 0;

    el.innerHTML = `
      <div class="kpi-card" style="--kpi-color:var(--accent);">
        <span class="kpi-icon"><i data-lucide="coins" class="icon-inline"></i></span>
        <div class="kpi-label">Total Revenue</div>
        <div class="kpi-value" title="₹${totalRevenue.toLocaleString('en-IN')}">₹${totalRevenue.toLocaleString('en-IN')}</div>
        <div class="kpi-sub">${totalTrips} trips this period</div>
      </div>
      <div class="kpi-card" style="--kpi-color:var(--red);">
        <span class="kpi-icon"><i data-lucide="banknote" class="icon-inline"></i></span>
        <div class="kpi-label">Total Expenses</div>
        <div class="kpi-value" title="₹${totalExpenses.toLocaleString('en-IN')}">₹${totalExpenses.toLocaleString('en-IN')}</div>
        <div class="kpi-sub">Across all trips</div>
      </div>
      <div class="kpi-card" style="--kpi-color:${netProfit >= 0 ? 'var(--green)' : 'var(--red)'};">
        <span class="kpi-icon"><i data-lucide="bar-chart-2" class="icon-inline"></i></span>
        <div class="kpi-label">Net Profit</div>
        <div class="kpi-value ${netProfit >= 0 ? 'kpi-positive' : 'kpi-negative'}" title="₹${netProfit.toLocaleString('en-IN')}">₹${netProfit.toLocaleString('en-IN')}</div>
        <div class="kpi-sub">Margin: ${profitMargin}%</div>
      </div>
      <div class="kpi-card" style="--kpi-color:var(--blue);">
        <span class="kpi-icon"><i data-lucide="trending-down" class="icon-inline"></i></span>
        <div class="kpi-label">Profit Margin</div>
        <div class="kpi-value">${profitMargin}%</div>
        <div class="kpi-sub">Of total revenue</div>
      </div>
      <div class="kpi-card" style="--kpi-color:var(--purple);">
        <span class="kpi-icon"><i data-lucide="truck" class="icon-inline"></i></span>
        <div class="kpi-label">Avg Profit / Trip</div>
        <div class="kpi-value">₹${formatCompactNumber(avgProfit)}</div>
        <div class="kpi-sub">${totalTrips} total trips</div>
      </div>
    `;
  } catch (err) {
    console.error('[Dashboard KPI]', err);
    el.innerHTML = `<div style="color:var(--red);padding:16px;">${err.message}</div>`;
  }
}

async function loadRecentTrips() {
  const tbody = document.getElementById('dash-trips-body');
  if (!tbody) return;
  try {
    const { data: trips, error } = await supabase
      .from('trips')
      .select(`id, trip_date, start_location, end_location, freight_amount, status,
               vehicles(vehicle_number), drivers(name), expenses(amount)`)
      .order('trip_date', { ascending: false })
      .limit(10);
    if (error) throw error;
    if (!trips || trips.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><span class="empty-icon"><i data-lucide="truck" class="icon-inline"></i></span><div class="empty-title">No trips yet</div><div class="empty-sub">Create your first trip to get started</div></div></td></tr>`;
      return;
    }
    tbody.innerHTML = trips.map(t => {
      const expenses = (t.expenses || []).reduce((s, e) => s + parseFloat(e.amount || 0), 0);
      const profit   = parseFloat(t.freight_amount || 0) - expenses;
      return `<tr>
        <td class="td-primary">${formatDate(t.trip_date)}</td>
        <td>${t.start_location || '—'} → ${t.end_location || '—'}</td>
        <td>${t.vehicles?.vehicle_number || '—'}</td>
        <td class="td-amount">${formatCurrency(t.freight_amount)}</td>
        <td class="td-amount">${formatCurrency(expenses)}</td>
        <td class="td-amount ${profitClass(profit)}">${formatCurrency(profit)}</td>
        <td>${statusBadge(t.status)}</td>
      </tr>`;
    }).join('');
    refreshIcons();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:var(--red);padding:16px;">${err.message}</td></tr>`;
  }
}

async function loadCharts() {
  await Promise.all([loadMonthlyChart(), loadVehicleChart()]);
}

async function loadMonthlyChart() {
  try {
    const { data: trips } = await supabase
      .from('trips')
      .select('trip_date, freight_amount, expenses(amount)')
      .gte('trip_date', new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0])
      .order('trip_date');

    // Group by month
    const monthlyData = {};
    (trips || []).forEach(t => {
      const m = t.trip_date?.slice(0, 7);
      if (!m) return;
      if (!monthlyData[m]) monthlyData[m] = { revenue: 0, expenses: 0 };
      monthlyData[m].revenue   += parseFloat(t.freight_amount || 0);
      monthlyData[m].expenses  += (t.expenses || []).reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    });

    const labels  = Object.keys(monthlyData).sort();
    const revenue = labels.map(m => monthlyData[m].revenue);
    const costs   = labels.map(m => monthlyData[m].expenses);
    const profits = labels.map((m, i) => revenue[i] - costs[i]);

    const canvas = document.getElementById('chart-monthly');
    if (!canvas) return;
    if (monthlyChart) { monthlyChart.destroy(); monthlyChart = null; }
    monthlyChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels.map(m => { const [y, mo] = m.split('-'); return new Date(y, mo-1).toLocaleString('en-IN', { month: 'short', year: '2-digit' }); }),
        datasets: [
          { label: 'Revenue', data: revenue, borderColor: '#f97316', backgroundColor: 'rgba(249,115,22,0.1)', fill: true, tension: 0.4 },
          { label: 'Expenses', data: costs, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)', fill: true, tension: 0.4 },
          { label: 'Profit', data: profits, borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.08)', fill: true, tension: 0.4 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#94a3b8', boxWidth: 12, font: { size: 11 } } } },
        scales: {
          x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { ticks: { color: '#64748b', font: { size: 10 }, callback: v => '₹' + formatCompactNumber(v) }, grid: { color: 'rgba(255,255,255,0.04)' } }
        }
      }
    });
  } catch (err) { console.error('[Monthly Chart]', err); }
}

async function loadVehicleChart() {
  try {
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('vehicle_number, trips(freight_amount, expenses(amount))')
      .limit(10);

    if (!vehicles || vehicles.length === 0) return;
    const labels  = vehicles.map(v => v.vehicle_number);
    const profits = vehicles.map(v => {
      const freight  = (v.trips || []).reduce((s, t) => s + parseFloat(t.freight_amount || 0), 0);
      const expenses = (v.trips || []).reduce((s, t) => s + (t.expenses || []).reduce((ss, e) => ss + parseFloat(e.amount || 0), 0), 0);
      return freight - expenses;
    });

    const canvas = document.getElementById('chart-vehicles');
    if (!canvas) return;
    if (vehicleChart) { vehicleChart.destroy(); vehicleChart = null; }
    vehicleChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Net Profit',
          data: profits,
          backgroundColor: profits.map(p => p >= 0 ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)'),
          borderRadius: 6,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { ticks: { color: '#64748b', font: { size: 10 }, callback: v => '₹' + formatCompactNumber(v) }, grid: { color: 'rgba(255,255,255,0.04)' } }
        }
      }
    });
  } catch (err) { console.error('[Vehicles Chart]', err); }
}

module.exports = { load };
