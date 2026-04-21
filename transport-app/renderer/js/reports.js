/* renderer/js/reports.js — Reports & Analytics Module */
'use strict';
const { supabase } = require('./supabase-client');
const { formatCurrency, formatDate, refreshIcons, formatCompactNumber } = require('./utils');
const { getFilters } = require('./filters');

let monthlyChart = null;
let truckChart   = null;

async function load() {
  await Promise.all([loadKPIs(), loadMonthlyChart(), loadTruckChart(), loadVehicleTable(), loadMonthlyTable()]);
  refreshIcons();
}

async function loadKPIs() {
  const el = document.getElementById('rep-kpi-grid');
  if (!el) return;
  el.innerHTML = '<div class="kpi-card skeleton" style="height:90px;border-radius:14px;"></div>'.repeat(5);

  try {
    const f = getFilters();
    let q = supabase.from('trips').select('id,freight_amount');
    if (f.vehicleId) q = q.eq('vehicle_id', f.vehicleId);
    if (f.companyId) q = q.eq('company_id', f.companyId);
    if (f.driverId)  q = q.eq('driver_id', f.driverId);
    if (f.status)    q = q.eq('status', f.status);
    if (f.dateFrom)  q = q.gte('trip_date', f.dateFrom);
    if (f.dateTo)    q = q.lte('trip_date', f.dateTo);
    
    const { data: trips } = await q;
    const tripIds = (trips || []).map(t => t.id);
    const totalRevenue = (trips || []).reduce((s, t) => s + parseFloat(t.freight_amount || 0), 0);

    // Use direct expense query to match Expense Manager & Dashboard
    let eq = supabase.from('expenses').select('amount');
    if (f.dateFrom)  eq = eq.gte('date', f.dateFrom);
    if (f.dateTo)    eq = eq.lte('date', f.dateTo);
    if (f.vehicleId) eq = eq.eq('vehicle_id', f.vehicleId);
    if (f.driverId)  eq = eq.eq('driver_id', f.driverId);
    if (f.companyId) eq = eq.eq('company_id', f.companyId);
    if (f.categoryId) eq = eq.eq('expense_category', f.categoryId);
    
    const { data: exps } = await eq;
    const totalExpenses = (exps || []).reduce((s, e) => s + parseFloat(e.amount || 0), 0);

    const netProfit    = totalRevenue - totalExpenses;
    const margin       = totalRevenue > 0 ? ((netProfit/totalRevenue)*100).toFixed(1) : 0;
    const avgProfit    = (trips||[]).length > 0 ? netProfit / (trips||[]).length : 0;

    // Total outstanding
    const { data: payPending } = await supabase.from('payments').select('amount').in('payment_status', ['Pending','Partial']);
    const outstanding = (payPending || []).reduce((s, p) => s + parseFloat(p.amount || 0), 0);

    el.innerHTML = `
      <div class="kpi-card" style="--kpi-color:var(--accent);">
        <span class="kpi-icon"><i data-lucide="coins" class="icon-inline"></i></span><div class="kpi-label">Total Revenue</div>
        <div class="kpi-value">${formatCurrency(totalRevenue)}</div>
        <div class="kpi-sub">${(trips||[]).length} trips</div>
      </div>
      <div class="kpi-card" style="--kpi-color:var(--red);">
        <span class="kpi-icon"><i data-lucide="banknote" class="icon-inline"></i></span><div class="kpi-label">Total Expenses</div>
        <div class="kpi-value kpi-negative">${formatCurrency(totalExpenses)}</div>
        <div class="kpi-sub">All categories</div>
      </div>
      <div class="kpi-card" style="--kpi-color:${netProfit>=0?'var(--green)':'var(--red)'};">
        <span class="kpi-icon"><i data-lucide="bar-chart-2" class="icon-inline"></i></span><div class="kpi-label">Net Profit</div>
        <div class="kpi-value ${netProfit>=0?'kpi-positive':'kpi-negative'}">${formatCurrency(netProfit)}</div>
        <div class="kpi-sub">Revenue − Expenses</div>
      </div>
      <div class="kpi-card" style="--kpi-color:var(--blue);">
        <span class="kpi-icon"><i data-lucide="trending-down" class="icon-inline"></i></span><div class="kpi-label">Profit Margin</div>
        <div class="kpi-value">${margin}%</div>
        <div class="kpi-sub">Of total revenue</div>
      </div>
      <div class="kpi-card" style="--kpi-color:var(--purple);">
        <span class="kpi-icon"><i data-lucide="truck" class="icon-inline"></i></span><div class="kpi-label">Avg Profit / Trip</div>
        <div class="kpi-value">${formatCurrency(avgProfit)}</div>
        <div class="kpi-sub">Per delivery</div>
      </div>
    `;
    refreshIcons();
  } catch(err) {
    el.innerHTML = `<div style="color:var(--red);padding:16px;">${err.message}</div>`;
  }
}

async function loadMonthlyChart() {
  try {
    const f = getFilters();
    let q = supabase.from('trips').select('trip_date,freight_amount,expenses(amount,category)');
    
    // Apply filters
    if (f.vehicleId) q = q.eq('vehicle_id', f.vehicleId);
    if (f.companyId) q = q.eq('company_id', f.companyId);
    if (f.driverId)  q = q.eq('driver_id', f.driverId);
    if (f.status)    q = q.eq('status', f.status);
    if (f.dateFrom)  q = q.gte('trip_date', f.dateFrom);
    else {
      // Default to last 12 months if no date filter
      q = q.gte('trip_date', new Date(new Date().setFullYear(new Date().getFullYear()-1)).toISOString().split('T')[0]);
    }
    if (f.dateTo)    q = q.lte('trip_date', f.dateTo);

    const { data: trips } = await q.order('trip_date');

    const monthly = {};
    (trips||[]).forEach(t => {
      const m = t.trip_date?.slice(0,7);
      if (!m) return;
      if (!monthly[m]) monthly[m] = { revenue:0, expenses:0, trips:0 };
      monthly[m].revenue  += parseFloat(t.freight_amount || 0);
      monthly[m].trips    += 1;
    });

    const labels = Object.keys(monthly).sort();

    // Fetch and merge expenses accurately
    let eq = supabase.from('expenses').select('amount, date');
    if (f.vehicleId) eq = eq.eq('vehicle_id', f.vehicleId);
    if (f.companyId) eq = eq.eq('company_id', f.companyId);
    if (f.driverId)  eq = eq.eq('driver_id', f.driverId);
    if (f.categoryId) eq = eq.eq('expense_category', f.categoryId);
    
    // Use same 12-month default as trips if no date filter
    const startDate = f.dateFrom || new Date(new Date().setFullYear(new Date().getFullYear()-1)).toISOString().split('T')[0];
    const { data: allExps } = await eq.gte('date', startDate);

    (allExps || []).forEach(e => {
        const m = e.date?.slice(0, 7);
        if (m && monthly[m]) {
            monthly[m].expenses += parseFloat(e.amount || 0);
        } else if (m && !f.dateFrom) {
            // Only add if within the 12 month range or relevant
            if (!monthly[m]) monthly[m] = { revenue: 0, expenses: 0, trips: 0 };
            monthly[m].expenses += parseFloat(e.amount || 0);
        }
    });

    const finalLabels = Object.keys(monthly).sort();
    const revenues= finalLabels.map(m => monthly[m].revenue);
    const costs   = finalLabels.map(m => monthly[m].expenses);
    const profits = finalLabels.map((m,i) => revenues[i] - costs[i]);

    const canvas = document.getElementById('chart-rep-monthly');
    if (!canvas) return;
    if (monthlyChart) { monthlyChart.destroy(); monthlyChart = null; }
    monthlyChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: finalLabels.map(m => { const [y,mo]=m.split('-'); return new Date(y,mo-1).toLocaleString('en-IN',{month:'short',year:'2-digit'}); }),
        datasets: [
          { label:'Revenue',  data:revenues, backgroundColor:'rgba(249,115,22,0.7)', borderRadius:4, borderSkipped:false },
          { label:'Expenses', data:costs,    backgroundColor:'rgba(239,68,68,0.6)',  borderRadius:4, borderSkipped:false },
          { label:'Profit',   data:profits,  type:'line', borderColor:'#22c55e', fill:false, tension:0.4, pointRadius:4 },
        ]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins: { legend:{ labels:{ color:'#94a3b8', boxWidth:12, font:{size:11} } } },
        scales: {
          x:{ ticks:{color:'#64748b',font:{size:10}}, grid:{color:'rgba(255,255,255,0.04)'} },
          y:{ ticks:{color:'#64748b',font:{size:10},callback:v=>'₹'+formatCompactNumber(v)}, grid:{color:'rgba(255,255,255,0.04)'} }
        }
      }
    });
  } catch(err) { console.error('[Rep Monthly Chart]', err); }
}

async function loadTruckChart() {
  try {
    const f = getFilters();
    let q = supabase.from('trips').select('vehicle_id, freight_amount, expenses(amount,category), vehicles(vehicle_number)');
    if (f.vehicleId) q = q.eq('vehicle_id', f.vehicleId);
    if (f.companyId) q = q.eq('company_id', f.companyId);
    if (f.driverId)  q = q.eq('driver_id', f.driverId);
    if (f.status)    q = q.eq('status', f.status);
    if (f.dateFrom)  q = q.gte('trip_date', f.dateFrom);
    if (f.dateTo)    q = q.lte('trip_date', f.dateTo);

    const { data: trips } = await q;

    // Group by vehicle
    const vehicleData = {};
    (trips || []).forEach(t => {
      const vnum = t.vehicles?.vehicle_number;
      if (!vnum) return;
      if (!vehicleData[vnum]) vehicleData[vnum] = { freight: 0, profit: 0, expenses: 0 };
      vehicleData[vnum].freight += parseFloat(t.freight_amount || 0);
    });

    // Fetch expenses per vehicle for accuracy
    let eq = supabase.from('expenses').select('amount, vehicles(vehicle_number)');
    if (f.dateFrom)  eq = eq.gte('date', f.dateFrom);
    if (f.dateTo)    eq = eq.lte('date', f.dateTo);
    if (f.vehicleId) eq = eq.eq('vehicle_id', f.vehicleId);
    if (f.driverId)  eq = eq.eq('driver_id', f.driverId);
    if (f.categoryId) eq = eq.eq('expense_category', f.categoryId);
    
    const { data: allExps } = await eq;
    (allExps || []).forEach(e => {
        const vnum = e.vehicles?.vehicle_number;
        if (!vnum) return;
        if (!vehicleData[vnum]) vehicleData[vnum] = { freight: 0, profit: 0, expenses: 0 };
        vehicleData[vnum].expenses += parseFloat(e.amount || 0);
    });

    Object.keys(vehicleData).forEach(v => {
        vehicleData[v].profit = vehicleData[v].freight - vehicleData[v].expenses;
    });

    const labels = Object.keys(vehicleData);
    if (labels.length === 0) return;
    const profits = labels.map(l => vehicleData[l].profit);
    const freights = labels.map(l => vehicleData[l].freight);

    const canvas = document.getElementById('chart-rep-trucks');
    if (!canvas) return;
    if (truckChart) { truckChart.destroy(); truckChart = null; }
    truckChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label:'Freight',   data:freights, backgroundColor:'rgba(249,115,22,0.6)', borderRadius:4, borderSkipped:false },
          { label:'Net Profit',data:profits,  backgroundColor:profits.map(p=>p>=0?'rgba(34,197,94,0.7)':'rgba(239,68,68,0.7)'), borderRadius:4, borderSkipped:false },
        ]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ labels:{ color:'#94a3b8', boxWidth:12, font:{size:11} } } },
        scales:{
          x:{ ticks:{color:'#64748b',font:{size:10}}, grid:{color:'rgba(255,255,255,0.04)'} },
          y:{ ticks:{color:'#64748b',font:{size:10},callback:v=>'₹'+formatCompactNumber(v)}, grid:{color:'rgba(255,255,255,0.04)'} }
        }
      }
    });
  } catch(err) { console.error('[Truck Chart]', err); }
}

async function loadVehicleTable() {
  const tbody = document.getElementById('rep-vehicles-body');
  if (!tbody) return;
  try {
    const f = getFilters();
    let q = supabase.from('trips').select('vehicle_id, freight_amount, expenses(amount,category), vehicles(vehicle_number)');
    if (f.vehicleId) q = q.eq('vehicle_id', f.vehicleId);
    if (f.companyId) q = q.eq('company_id', f.companyId);
    if (f.driverId)  q = q.eq('driver_id', f.driverId);
    if (f.status)    q = q.eq('status', f.status);
    if (f.dateFrom)  q = q.gte('trip_date', f.dateFrom);
    if (f.dateTo)    q = q.lte('trip_date', f.dateTo);

    const { data: tripsData } = await q;

    const grouped = {};
    (tripsData || []).forEach(t => {
      const vnum = t.vehicles?.vehicle_number;
      if (!vnum) return;
      if (!grouped[vnum]) grouped[vnum] = { trips: 0, freight: 0, expenses: 0 };
      grouped[vnum].trips += 1;
      grouped[vnum].freight += parseFloat(t.freight_amount || 0);
    });

    // Merge expenses
    let eq = supabase.from('expenses').select('amount, vehicles(vehicle_number)');
    if (f.dateFrom)  eq = eq.gte('date', f.dateFrom);
    if (f.dateTo)    eq = eq.lte('date', f.dateTo);
    if (f.vehicleId) eq = eq.eq('vehicle_id', f.vehicleId);
    if (f.driverId)  eq = eq.eq('driver_id', f.driverId);
    if (f.categoryId) eq = eq.eq('expense_category', f.categoryId);
    const { data: allExps } = await eq;

    (allExps || []).forEach(e => {
        const vnum = e.vehicles?.vehicle_number;
        if (vnum && grouped[vnum]) {
            grouped[vnum].expenses += parseFloat(e.amount || 0);
        } else if (vnum && !f.vehicleId) {
            if (!grouped[vnum]) grouped[vnum] = { trips: 0, freight: 0, expenses: 0 };
            grouped[vnum].expenses += parseFloat(e.amount || 0);
        }
    });

    tbody.innerHTML = Object.keys(grouped).map(vnum => {
      const v = grouped[vnum];
      const profit   = v.freight - v.expenses;
      const margin   = v.freight > 0 ? ((profit/v.freight)*100).toFixed(1) : 0;
      return `<tr>
        <td class="td-primary"><i data-lucide="truck" class="icon-inline"></i> ${vnum}</td>
        <td>${v.trips}</td>
        <td class="td-amount" style="color:var(--accent);">${formatCurrency(v.freight)}</td>
        <td class="td-amount" style="color:var(--red);">${formatCurrency(v.expenses)}</td>
        <td class="td-amount ${profit>=0?'profit-positive':'profit-negative'}">${formatCurrency(profit)}</td>
        <td>${margin}%</td>
      </tr>`;
    }).join('') || `<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--text-muted);">No data for selected filters</td></tr>`;
    refreshIcons();
  } catch(err) { console.error('[Vehicle Table]',err); }
}

async function loadMonthlyTable() {
  const tbody = document.getElementById('rep-monthly-body');
  if (!tbody) return;
  try {
    const f = getFilters();
    let q = supabase.from('trips').select('trip_date,freight_amount,status,expenses(amount,category)');
    if (f.vehicleId) q = q.eq('vehicle_id', f.vehicleId);
    if (f.companyId) q = q.eq('company_id', f.companyId);
    if (f.driverId)  q = q.eq('driver_id', f.driverId);
    if (f.status)    q = q.eq('status', f.status);
    if (f.dateFrom)  q = q.gte('trip_date', f.dateFrom);
    if (f.dateTo)    q = q.lte('trip_date', f.dateTo);

    const { data: trips } = await q.order('trip_date');

    const monthly = {};
    (trips||[]).forEach(t => {
      const m = t.trip_date?.slice(0,7);
      if (!m) return;
      if (!monthly[m]) monthly[m] = { trips:0, revenue:0, expenses:0 };
      monthly[m].trips   += 1;
      monthly[m].revenue += parseFloat(t.freight_amount||0);
    });

    // Merge monthly expenses
    let eq = supabase.from('expenses').select('amount, date');
    if (f.vehicleId) eq = eq.eq('vehicle_id', f.vehicleId);
    if (f.companyId) eq = eq.eq('company_id', f.companyId);
    if (f.driverId)  eq = eq.eq('driver_id', f.driverId);
    if (f.categoryId) eq = eq.eq('expense_category', f.categoryId);
    const { data: allExps } = await eq.gte('date', f.dateFrom || '2000-01-01');

    (allExps || []).forEach(e => {
        const m = e.date?.slice(0, 7);
        if (m && monthly[m]) {
            monthly[m].expenses += parseFloat(e.amount || 0);
        } else if (m && !f.dateFrom) {
            if (!monthly[m]) monthly[m] = { trips: 0, revenue: 0, expenses: 0 };
            monthly[m].expenses += parseFloat(e.amount || 0);
        }
    });

    const months = Object.keys(monthly).sort().reverse().slice(0, 24);
    tbody.innerHTML = months.map(m => {
      const d    = monthly[m];
      const profit = d.revenue - d.expenses;
      const margin = d.revenue > 0 ? ((profit/d.revenue)*100).toFixed(1) : 0;
      const [y,mo] = m.split('-');
      const label = new Date(y, mo-1).toLocaleString('en-IN', { month:'long', year:'numeric' });
      return `<tr>
        <td class="td-primary">${label}</td>
        <td>${d.trips}</td>
        <td class="td-amount" style="color:var(--accent);">${formatCurrency(d.revenue)}</td>
        <td class="td-amount" style="color:var(--red);">${formatCurrency(d.expenses)}</td>
        <td class="td-amount ${profit>=0?'profit-positive':'profit-negative'}">${formatCurrency(profit)}</td>
        <td>${margin}%</td>
      </tr>`;
    }).join('') || `<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--text-muted);">No data for selected filters</td></tr>`;
  } catch(err) { console.error('[Monthly Table]', err); }
}

function exportAll() {
  // Export both tables
  const { exportTableToCSV } = require('./utils');
  exportTableToCSV('rep-vehicles-body', 'vehicle_performance.csv');
  setTimeout(() => exportTableToCSV('rep-monthly-body', 'monthly_summary.csv'), 500);
}

module.exports = { load, exportAll };
