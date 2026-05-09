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
  
  try {
    const f = getFilters();
    const dateFrom = f.dateFrom || firstDayOfMonth();
    const dateTo   = f.dateTo   || todayISO();

    const fetchTrips = supabase.from('trips').select('freight_amount').gte('trip_date', dateFrom).lte('trip_date', dateTo);
    const fetchOut   = supabase.from('outsourced_trips').select('freight_received, freight_paid').gte('trip_date', dateFrom).lte('trip_date', dateTo);
    const fetchExp   = supabase.from('expenses').select('amount').gte('date', dateFrom).lte('date', dateTo);
    const fetchBExp  = supabase.from('broker_expenses').select('amount').gte('expense_date', dateFrom).lte('expense_date', dateTo);

    const [rTrips, rOut, rExp, rBExp] = await Promise.allSettled([fetchTrips, fetchOut, fetchExp, fetchBExp]);

    const trips = rTrips.status === 'fulfilled' ? (rTrips.value.data || []) : [];
    const outsourced = rOut.status === 'fulfilled' ? (rOut.value.data || []) : [];
    const fleetExpenses = rExp.status === 'fulfilled' ? (rExp.value.data || []) : [];
    const brokerExpenses = rBExp.status === 'fulfilled' ? (rBExp.value.data || []) : [];

    let totalRevenue = 0;
    let totalExpenses = 0;
    let totalTripsCount = trips.length + outsourced.length;

    trips.forEach(t => totalRevenue += parseFloat(t.freight_amount || 0));
    outsourced.forEach(o => totalRevenue += parseFloat(o.freight_received || 0));
    fleetExpenses.forEach(e => totalExpenses += parseFloat(e.amount || 0));
    brokerExpenses.forEach(e => totalExpenses += parseFloat(e.amount || 0));
    outsourced.forEach(o => totalExpenses += parseFloat(o.freight_paid || 0));

    const netProfit    = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;
    const avgProfit    = totalTripsCount > 0 ? netProfit / totalTripsCount : 0;

    el.innerHTML = `
      <div class="kpi-card" style="--kpi-color:var(--accent);">
        <span class="kpi-icon"><i data-lucide="coins" class="icon-inline"></i></span>
        <div class="kpi-label">Total Revenue</div>
        <div class="kpi-value">₹${totalRevenue.toLocaleString('en-IN')}</div>
        <div class="kpi-sub">${totalTripsCount} trips this period</div>
      </div>
      <div class="kpi-card" style="--kpi-color:var(--red);">
        <span class="kpi-icon"><i data-lucide="banknote" class="icon-inline"></i></span>
        <div class="kpi-label">Total Expenses</div>
        <div class="kpi-value">₹${totalExpenses.toLocaleString('en-IN')}</div>
        <div class="kpi-sub">Incl. Broker Exp.</div>
      </div>
      <div class="kpi-card" style="--kpi-color:${netProfit >= 0 ? 'var(--green)' : 'var(--red)'};">
        <span class="kpi-icon"><i data-lucide="bar-chart-2" class="icon-inline"></i></span>
        <div class="kpi-label">Net Profit</div>
        <div class="kpi-value ${netProfit >= 0 ? 'kpi-positive' : 'kpi-negative'}">₹${netProfit.toLocaleString('en-IN')}</div>
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
        <div class="kpi-sub">${totalTripsCount} total trips</div>
      </div>
    `;
    refreshIcons();
  } catch (err) {
    console.error('[Dashboard KPI]', err);
    el.innerHTML = `<div style="color:var(--red);padding:16px;">Error loading KPIs: ${err.message}</div>`;
  }
}

async function loadRecentTrips() {
  const tbody = document.getElementById('dash-trips-body');
  if (!tbody) return;
  try {
    const [tripsRes, outRes] = await Promise.all([
      supabase.from('trips').select('id, trip_date, start_location, end_location, freight_amount, status, vehicles(vehicle_number), expenses(amount)').order('trip_date', { ascending: false }).limit(5),
      supabase.from('outsourced_trips').select('id, trip_date, from_location, to_location, freight_received, freight_paid, payment_status').order('trip_date', { ascending: false }).limit(5)
    ]);

    const combined = [
      ...(tripsRes.data || []).map(t => ({
        date: t.trip_date, route: `${t.start_location || ''} → ${t.end_location || ''}`,
        vehicle: t.vehicles?.vehicle_number || 'Fleet', freight: t.freight_amount,
        expenses: (t.expenses || []).reduce((s, e) => s + parseFloat(e.amount || 0), 0), status: t.status
      })),
      ...(outRes.data || []).map(o => ({
        date: o.trip_date, route: `${o.from_location || ''} → ${o.to_location || ''}`,
        vehicle: 'Outsourced', freight: o.freight_received, expenses: o.freight_paid, status: o.payment_status
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

    if (combined.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-title">No trips yet</div></div></td></tr>`;
      return;
    }

    tbody.innerHTML = combined.map(t => {
      const profit = parseFloat(t.freight || 0) - parseFloat(t.expenses || 0);
      return `<tr>
        <td class="td-primary">${formatDate(t.date)}</td>
        <td>${t.route}</td>
        <td>${t.vehicle}</td>
        <td class="td-amount">${formatCurrency(t.freight)}</td>
        <td class="td-amount">${formatCurrency(t.expenses)}</td>
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
    const oneYearAgo = new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0];
    const [tripsRes, outRes] = await Promise.all([
      supabase.from('trips').select('trip_date, freight_amount, expenses(amount)').gte('trip_date', oneYearAgo),
      supabase.from('outsourced_trips').select('trip_date, freight_received, freight_paid').gte('trip_date', oneYearAgo)
    ]);
    const monthlyData = {};
    (tripsRes.data || []).forEach(t => {
      const m = t.trip_date?.slice(0, 7); if (!m) return;
      if (!monthlyData[m]) monthlyData[m] = { revenue: 0, expenses: 0 };
      monthlyData[m].revenue += parseFloat(t.freight_amount || 0);
      monthlyData[m].expenses += (t.expenses || []).reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    });
    (outRes.data || []).forEach(o => {
      const m = o.trip_date?.slice(0, 7); if (!m) return;
      if (!monthlyData[m]) monthlyData[m] = { revenue: 0, expenses: 0 };
      monthlyData[m].revenue += parseFloat(o.freight_received || 0);
      monthlyData[m].expenses += parseFloat(o.freight_paid || 0);
    });
    const labels = Object.keys(monthlyData).sort();
    const canvas = document.getElementById('chart-monthly');
    if (!canvas) return;
    if (monthlyChart) monthlyChart.destroy();
    monthlyChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels.map(m => { const [y, mo] = m.split('-'); return new Date(y, mo-1).toLocaleString('en-IN', { month: 'short', year: '2-digit' }); }),
        datasets: [
          { label: 'Revenue', data: labels.map(m => monthlyData[m].revenue), borderColor: '#f97316', tension: 0.4 },
          { label: 'Expenses', data: labels.map(m => monthlyData[m].expenses), borderColor: '#ef4444', tension: 0.4 },
          { label: 'Profit', data: labels.map(m => monthlyData[m].revenue - monthlyData[m].expenses), borderColor: '#22c55e', tension: 0.4 },
        ]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  } catch (err) { console.error('[Monthly Chart]', err); }
}

async function loadVehicleChart() {
  try {
    const { data: vehicles } = await supabase.from('vehicles').select('vehicle_number, trips(freight_amount, expenses(amount))').limit(10);
    if (!vehicles || vehicles.length === 0) return;
    const canvas = document.getElementById('chart-vehicles');
    if (!canvas) return;
    if (vehicleChart) vehicleChart.destroy();
    vehicleChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: vehicles.map(v => v.vehicle_number),
        datasets: [{ label: 'Net Profit', data: vehicles.map(v => {
          const freight = (v.trips || []).reduce((s, t) => s + parseFloat(t.freight_amount || 0), 0);
          const expenses = (v.trips || []).reduce((s, t) => s + (t.expenses || []).reduce((ss, e) => ss + parseFloat(e.amount || 0), 0), 0);
          return freight - expenses;
        }), backgroundColor: 'rgba(34,197,94,0.7)' }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  } catch (err) { console.error('[Vehicles Chart]', err); }
}

module.exports = { load };
