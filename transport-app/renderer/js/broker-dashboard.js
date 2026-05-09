/* renderer/js/broker-dashboard.js — Broker Analytics Module */
'use strict';
const { supabase } = require('./supabase-client');
const { formatCurrency, formatDate, refreshIcons, formatCompactNumber } = require('./utils');
const { getFilters } = require('./filters');

let transporterChart = null;
let directionChart = null;

async function load() {
  await Promise.all([loadKPIs(), loadRecentActivity(), loadCharts()]);
  refreshIcons();
}

async function loadKPIs() {
  try {
    const f = getFilters();
    let qTrips = supabase.from('outsourced_trips').select('freight_received, freight_paid, direction');
    let qExp   = supabase.from('broker_expenses').select('amount');

    if (f.dateFrom) {
       qTrips = qTrips.gte('trip_date', f.dateFrom);
       qExp   = qExp.gte('expense_date', f.dateFrom);
    }
    if (f.dateTo) {
       qTrips = qTrips.lte('trip_date', f.dateTo);
       qExp   = qExp.lte('expense_date', f.dateTo);
    }

    const [rTrips, rExp] = await Promise.all([qTrips, qExp]);
    const trips = rTrips.data || [];
    const expenses = rExp.data || [];

    let totalRecv = 0;
    let totalPaid = 0;
    trips.forEach(t => {
      totalRecv += parseFloat(t.freight_received || 0);
      totalPaid += parseFloat(t.freight_paid || 0);
    });

    const totalExp = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    const netProfit = totalRecv - totalPaid - totalExp;
    const marginPercent = totalRecv > 0 ? ((netProfit / totalRecv) * 100).toFixed(1) : 0;

    document.getElementById('bd-total-trips').textContent = trips.length;
    document.getElementById('bd-revenue').textContent     = formatCurrency(totalRecv);
    document.getElementById('bd-payouts').textContent     = formatCurrency(totalPaid);
    document.getElementById('bd-expenses').textContent    = formatCurrency(totalExp);
    document.getElementById('bd-profit').textContent      = formatCurrency(netProfit);
    document.getElementById('bd-margin').textContent      = `Margin: ${marginPercent}%`;

    const profitEl = document.getElementById('bd-profit');
    if (profitEl) profitEl.style.color = netProfit >= 0 ? 'var(--green)' : 'var(--red)';

  } catch (err) {
    console.error('[Broker Dashboard KPI]', err);
  }
}

async function loadRecentActivity() {
  const tbody = document.getElementById('broker-dash-recent-body');
  if (!tbody) return;
  try {
    const { data } = await supabase.from('outsourced_trips')
      .select('*')
      .order('trip_date', { ascending: false })
      .limit(10);

    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center">No recent activity</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(r => {
      const margin = parseFloat(r.freight_received || 0) - parseFloat(r.freight_paid || 0);
      const party = r.direction === 'outbound' ? (r.broker_name || r.transporter_name) : (r.transporter_name || r.broker_name);
      return `<tr>
        <td>${formatDate(r.trip_date)}</td>
        <td class="td-primary">${party || '—'}</td>
        <td>${r.from_location || ''} → ${r.to_location || ''}</td>
        <td class="td-amount" style="color:var(--green);">${formatCurrency(r.freight_received)}</td>
        <td class="td-amount" style="color:var(--red);">${formatCurrency(r.freight_paid)}</td>
        <td class="td-amount ${margin >= 0 ? 'profit-positive' : 'profit-negative'}">${formatCurrency(margin)}</td>
      </tr>`;
    }).join('');
  } catch (err) {
    console.error('[Broker Recent Activity]', err);
  }
}

async function loadCharts() {
  try {
    const { data: trips } = await supabase.from('outsourced_trips').select('direction, transporter_name, freight_paid');
    if (!trips) return;

    // Direction Chart (Outbound vs Inbound)
    const counts = { outbound: 0, inbound: 0 };
    trips.forEach(t => { if (counts[t.direction] !== undefined) counts[t.direction]++; });

    const dirCanvas = document.getElementById('chart-broker-direction');
    if (dirCanvas) {
      if (directionChart) directionChart.destroy();
      directionChart = new Chart(dirCanvas, {
        type: 'pie',
        data: {
          labels: ['Outbound', 'Inbound'],
          datasets: [{ data: [counts.outbound, counts.inbound], backgroundColor: ['#3b82f6', '#f97316'], borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }

    // Top Transporters Chart
    const transData = {};
    trips.forEach(t => {
      if (!t.transporter_name) return;
      transData[t.transporter_name] = (transData[t.transporter_name] || 0) + parseFloat(t.freight_paid || 0);
    });
    const sortedTrans = Object.entries(transData).sort((a,b) => b[1] - a[1]).slice(0, 5);

    const transCanvas = document.getElementById('chart-broker-transporters');
    if (transCanvas) {
      if (transporterChart) transporterChart.destroy();
      transporterChart = new Chart(transCanvas, {
        type: 'bar',
        data: {
          labels: sortedTrans.map(x => x[0]),
          datasets: [{ label: 'Total Payout (₹)', data: sortedTrans.map(x => x[1]), backgroundColor: 'rgba(59,130,246,0.7)', borderRadius: 4 }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } }
        }
      });
    }

  } catch (err) {
    console.error('[Broker Charts]', err);
  }
}

module.exports = { load };
