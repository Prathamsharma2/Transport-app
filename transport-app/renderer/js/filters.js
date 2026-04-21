/* renderer/js/filters.js — Global sticky filter bar component */
'use strict';
const { supabase } = require('./supabase-client');

// Global filter state
const filters = {
  companyId: '',
  vehicleId: '',
  driverId:  '',
  categoryId:'',
  dateFrom:  '',
  dateTo:    '',
  status:    ''
};

const listeners = [];

function onFilterChange(fn) { listeners.push(fn); }

function emitFilters() {
  listeners.forEach(fn => fn({ ...filters }));
}

function getFilters() { return { ...filters }; }

function resetFilters() {
  filters.companyId = '';
  filters.vehicleId = '';
  filters.driverId  = '';
  filters.categoryId= '';
  filters.dateFrom  = '';
  filters.dateTo    = '';
  filters.status    = '';
  // Reset UI
  const bar = document.getElementById('global-filter-bar');
  if (bar) {
    bar.querySelectorAll('select, input').forEach(el => { el.value = ''; });
  }
  emitFilters();
}
window.resetFilters = resetFilters;

async function initFilters() {
  const bar = document.getElementById('global-filter-bar');
  if (!bar) return;

  // Load companies
  const { data: companies } = await supabase.from('companies').select('id, name').order('name');
  const companyOpts = (companies || []).map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  // Load vehicles
  const { data: vehicles } = await supabase.from('vehicles').select('id, vehicle_number').order('vehicle_number');
  const vehicleOpts = (vehicles || []).map(v => `<option value="${v.id}">${v.vehicle_number}</option>`).join('');

  // Load drivers
  const { data: drivers } = await supabase.from('drivers').select('id, name').order('name');
  const driverOpts = (drivers || []).map(d => `<option value="${d.id}">${d.name}</option>`).join('');

  bar.innerHTML = `
    <div class="filter-group">
      <label>Date From</label>
      <input type="date" id="f-date-from">
    </div>
    <div class="filter-group">
      <label>Date To</label>
      <input type="date" id="f-date-to">
    </div>
    <div class="filter-group">
      <label>Company</label>
      <select id="f-company"><option value="">All Companies</option>${companyOpts}</select>
    </div>
    <div class="filter-group">
      <label>Truck</label>
      <select id="f-vehicle"><option value="">All Vehicles</option>${vehicleOpts}</select>
    </div>
    <div class="filter-group">
      <label>Driver</label>
      <select id="f-driver"><option value="">All Drivers</option>${driverOpts}</select>
    </div>
    <div class="filter-group">
      <label>Category</label>
      <select id="f-category">
        <option value="">All Categories</option>
        <option value="Fuel">Fuel</option>
        <option value="Toll">Toll</option>
        <option value="Driver Salary">Driver Salary</option>
        <option value="Maintenance">Maintenance</option>
        <option value="Loan Repayment">Loan Repayment</option>
        <option value="Other">Other</option>
      </select>
    </div>
    <div class="filter-group">
      <label>Status</label>
      <select id="f-status">
        <option value="">All Status</option>
        <option value="pending">Pending</option>
        <option value="Assigned">Assigned</option>
        <option value="In Progress">In Progress</option>
        <option value="Completed">Completed</option>
        <option value="Paid">Paid</option>
        <option value="Partial">Partial</option>
      </select>
    </div>
    <button class="filter-reset-btn" onclick="resetFilters()">✕ Reset</button>
  `;

  // Wire up events
  bar.querySelector('#f-date-from').addEventListener('change', e => { filters.dateFrom = e.target.value; emitFilters(); });
  bar.querySelector('#f-date-to').addEventListener('change', e => { filters.dateTo = e.target.value; emitFilters(); });
  bar.querySelector('#f-company').addEventListener('change', e => { filters.companyId = e.target.value; emitFilters(); });
  bar.querySelector('#f-vehicle').addEventListener('change', e => { filters.vehicleId = e.target.value; emitFilters(); });
  bar.querySelector('#f-driver').addEventListener('change', e => { filters.driverId = e.target.value; emitFilters(); });
  bar.querySelector('#f-category').addEventListener('change', e => { filters.categoryId = e.target.value; emitFilters(); });
  bar.querySelector('#f-status').addEventListener('change', e => { filters.status = e.target.value; emitFilters(); });
}

module.exports = { initFilters, getFilters, onFilterChange, resetFilters };
