/* renderer/js/vehicles.js — Vehicles Management Module */
'use strict';
const { supabase } = require('./supabase-client');
const { formatCurrency, formatDate, toast, confirmAction, todayISO, refreshIcons, statusBadge } = require('./utils');

let searchTerm = '';

async function load() {
  await loadVehicles();
  refreshIcons();
}

const onSearch = (val) => { searchTerm = val.toLowerCase(); loadVehicles(); };

async function loadVehicles() {
  const grid = document.getElementById('vehicles-grid');
  if (!grid) return;
  try {
    const sortVal = document.getElementById('vehicles-sort')?.value || 'vehicle_number-asc';
    const [col, dir] = sortVal.split('-');
    let q = supabase.from('vehicles').select('*,trips(id),maintenance_logs(cost)').order(col, { ascending: dir === 'asc' });
    if (searchTerm) q = q.ilike('vehicle_number', `%${searchTerm}%`);
    const { data, error } = await q;
    if (error) throw error;
    
    grid.innerHTML = (data || []).map(v => {
      const totalTrips = (v.trips || []).length;
      const maintCost  = (v.maintenance_logs || []).reduce((s, m) => s + parseFloat(m.cost || 0), 0);
      const statusColor = v.status === 'Available' ? 'badge-green' : v.status === 'Assigned' ? 'badge-yellow' : 'badge-red';
      return `
        <div class="vehicle-card">
          <div class="vehicle-card-top">
            <div class="vehicle-card-header">
              <div class="vehicle-number"><i data-lucide="truck" class="icon-inline" style="width:16px;height:16px;"></i> ${v.vehicle_number}</div>
              <div class="vehicle-meta">${[v.type, v.make, v.model].filter(Boolean).join(' · ') || '—'}</div>
            </div>
            <span class="badge ${statusColor}">${v.status || 'Available'}</span>
            ${v.is_active === false ? '<span class="badge badge-red">Inactive</span>' : '<span class="badge badge-green">Active</span>'}
          </div>
          <div class="vehicle-stats">
            <div class="vehicle-stat">
              <span class="stat-label">Total Trips</span>
              <span class="stat-value" style="color:var(--accent);">${totalTrips}</span>
            </div>
            <div class="vehicle-stat">
              <span class="stat-label">Maint. Cost</span>
              <span class="stat-value" style="color:var(--red);">${formatCurrency(maintCost)}</span>
            </div>
            <div class="vehicle-stat">
              <span class="stat-label">Last Maint.</span>
              <span class="stat-value">${formatDate(v.last_maintenance) || '—'}</span>
            </div>
          </div>
          <div class="vehicle-card-actions">
            <button class="btn btn-ghost btn-sm" onclick="window.vehiclesModule.openVehicleDetails(${v.id})"><i data-lucide="eye" class="icon-inline" style="width:14px;height:14px;"></i> Details</button>
            <button class="btn btn-ghost btn-sm" onclick="window.vehiclesModule.openVehicleModal(${v.id})"><i data-lucide="edit-2" class="icon-inline" style="width:14px;height:14px;"></i> Edit</button>
            <button class="btn btn-ghost btn-sm" onclick="window.vehiclesModule.openMaintenanceModal(${v.id},'${v.vehicle_number}')"><i data-lucide="wrench" class="icon-inline" style="width:14px;height:14px;"></i> Maint.</button>
            <button class="btn btn-danger btn-sm" style="padding:5px 10px;" onclick="window.vehiclesModule.deleteVehicle(${v.id})"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
          </div>
        </div>`;
    }).join('') || `<div class="empty-state" style="grid-column:1/-1;"><span class="empty-icon"><i data-lucide="truck" class="icon-inline"></i></span><div class="empty-title">No vehicles found</div></div>`;
    refreshIcons();
  } catch(err) {
    grid.innerHTML = `<div style="color:var(--red);padding:16px;">${err.message}</div>`;
  }
}

function openVehicleModal(editId = null) {
  const html = `
    <div class="modal-overlay" id="vehicle-modal" onclick="if(event.target.id==='vehicle-modal')closeModal('vehicle-modal')">
      <div class="modal modal-lg">
        <div class="modal-header">
          <span class="modal-title"><i data-lucide="truck" class="icon-inline"></i> ${editId ? 'Edit Vehicle' : 'Add Vehicle'}</span>
          <button class="modal-close" onclick="closeModal('vehicle-modal')">✕</button>
        </div>
        <div class="modal-body" style="max-height:75vh; overflow-y:auto;">
          <div class="form-grid">
            <div class="form-group"><label class="form-label">Registration Number*</label><input class="form-control" id="v-number" placeholder="Registration Number"></div>
            <div class="form-group"><label class="form-label">Vehicle Type*</label>
              <select class="form-control" id="v-type">
                <option>12W Truck</option><option>6W Truck</option><option>Trailer</option><option>Pick-up</option><option>Other</option>
              </select>
            </div>
            <div class="form-group"><label class="form-label">Ownership Type*</label>
              <select class="form-control" id="v-ownership"><option value="Own">Own</option><option value="Attached">Attached</option></select>
            </div>
            <div class="form-group"><label class="form-label">Year*</label><input class="form-control" type="number" id="v-year" placeholder="Building Year"></div>
            <div class="form-group"><label class="form-label">Vehicle Make*</label><input class="form-control" id="v-make" placeholder="Tata, Leyland, BharatBenz…"></div>
            
            <div class="form-group"><label class="form-label">Color</label><input class="form-control" id="v-color" placeholder="Enter Color"></div>
            <div class="form-group"><label class="form-label">Model</label><input class="form-control" id="v-model" placeholder="Enter Model"></div>
            <div class="form-group"><label class="form-label">Horse Power</label><input class="form-control" id="v-hp" placeholder="Enter Horse Power"></div>
            <div class="form-group"><label class="form-label">Fuel Type</label>
               <select class="form-control" id="v-fuel"><option>Diesel</option><option>CNG</option><option>Electric</option></select>
            </div>
            <div class="form-group"><label class="form-label">Expected Mileage (KMPL)</label><input class="form-control" type="number" step="0.1" id="v-mileage" placeholder="0.0"></div>
            
            <div class="form-group"><label class="form-label">VIN (Chassis Number)</label><input class="form-control" id="v-vin" placeholder="Enter VIN"></div>
            <div class="form-group"><label class="form-label">Registration Expiry Date</label><input class="form-control" type="date" id="v-expiry"></div>
            <div class="form-group">
              <label class="form-label">Is Active*</label>
              <div style="display:flex;align-items:center;gap:10px;height:40px;">
                <label class="switch"><input type="checkbox" id="v-active" checked><span class="slider round"></span></label>
                <span id="v-active-label" style="font-weight:600;font-size:12px;">Active</span>
              </div>
            </div>
            <div class="form-group"><label class="form-label">Current Odometer Reading</label><input class="form-control" type="number" id="v-odometer" placeholder="Current km joined"></div>
            <div class="form-group form-full"><label class="form-label">Notes</label><textarea class="form-control" id="v-notes" placeholder="Any additional info…"></textarea></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal('vehicle-modal')">Cancel</button>
          <button class="btn btn-primary" onclick="window.vehiclesModule.saveVehicle(${editId||'null'})"><i data-lucide="save" class="icon-inline"></i> Save Vehicle</button>
        </div>
      </div>
    </div>`;
  document.getElementById('vehicles-modal-container').innerHTML = html;
  refreshIcons();
  if (editId) prefillVehicle(editId);
}

async function prefillVehicle(id) {
  const { data } = await supabase.from('vehicles').select('*').eq('id', id).single();
  if (!data) return;
  document.getElementById('v-number').value    = data.vehicle_number || '';
  document.getElementById('v-type').value      = data.type || '';
  document.getElementById('v-ownership').value = data.ownership_type || 'Own';
  document.getElementById('v-year').value      = data.year || '';
  document.getElementById('v-make').value      = data.make || '';
  document.getElementById('v-color').value     = data.color || '';
  document.getElementById('v-model').value     = data.model || '';
  document.getElementById('v-hp').value        = data.horse_power || '';
  document.getElementById('v-fuel').value      = data.fuel_type || 'Diesel';
  document.getElementById('v-mileage').value   = data.expected_mileage || '';
  document.getElementById('v-vin').value       = data.vin || '';
  document.getElementById('v-expiry').value    = data.registration_expiry || '';
  document.getElementById('v-active').checked  = data.is_active !== false;
  document.getElementById('v-odometer').value  = data.current_odometer || '';
  document.getElementById('v-notes').value     = data.notes || '';
}

async function saveVehicle(editId) {
  const payload = {
    vehicle_number: document.getElementById('v-number').value.trim().toUpperCase(),
    type:           document.getElementById('v-type').value,
    ownership_type: document.getElementById('v-ownership').value,
    year:           parseInt(document.getElementById('v-year').value) || null,
    make:           document.getElementById('v-make').value.trim(),
    color:          document.getElementById('v-color').value.trim(),
    model:          document.getElementById('v-model').value.trim(),
    horse_power:    document.getElementById('v-hp').value.trim(),
    fuel_type:      document.getElementById('v-fuel').value,
    expected_mileage: parseFloat(document.getElementById('v-mileage').value) || null,
    vin:            document.getElementById('v-vin').value.trim(),
    registration_expiry: document.getElementById('v-expiry').value || null,
    is_active:      document.getElementById('v-active').checked,
    current_odometer: parseInt(document.getElementById('v-odometer').value) || null,
    notes:          document.getElementById('v-notes').value.trim(),
    status:         (editId ? 'Existing' : 'Available')
  };
  if (!payload.vehicle_number) { toast('Vehicle number required', 'warning'); return; }
  try {
    let error;
    if (editId) { ({ error } = await supabase.from('vehicles').update(payload).eq('id', editId)); }
    else        { ({ error } = await supabase.from('vehicles').insert([payload])); }
    if (error) throw error;
    closeModal('vehicle-modal');
    toast(editId ? 'Vehicle updated' : 'Vehicle added ✓');
    await loadVehicles();
  } catch(err) { toast(err.message, 'error'); }
}

async function deleteVehicle(id) {
  if (!confirmAction('Delete this vehicle?')) return;
  const { error } = await supabase.from('vehicles').delete().eq('id', id);
  if (error) { toast(error.message, 'error'); return; }
  toast('Vehicle deleted');
  await loadVehicles();
}

function openMaintenanceModal(vehicleId, vehicleNo) {
  const html = `
    <div class="modal-overlay" id="maint-modal" onclick="if(event.target.id==='maint-modal')closeModal('maint-modal')">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title"><i data-lucide="wrench" class="icon-inline"></i> Maintenance — ${vehicleNo}</span>
          <button class="modal-close" onclick="closeModal('maint-modal')">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group"><label class="form-label">Date</label><input class="form-control" type="date" id="m-date" value="${todayISO()}"></div>
            <div class="form-group"><label class="form-label">Type</label>
              <select class="form-control" id="m-type">
                <option>Oil Change</option><option>Tyre</option><option>Service</option><option>Repair</option><option>Other</option>
              </select></div>
            <div class="form-group"><label class="form-label">Cost (₹)</label><input class="form-control" type="number" id="m-cost" placeholder="0"></div>
            <div class="form-group"><label class="form-label">Vendor</label><input class="form-control" id="m-vendor" placeholder="Workshop name"></div>
            <div class="form-group form-full"><label class="form-label">Notes</label><textarea class="form-control" id="m-notes" placeholder="Describe the work done…"></textarea></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal('maint-modal')">Cancel</button>
          <button class="btn btn-primary" onclick="window.vehiclesModule.saveMaintenance(${vehicleId})"><i data-lucide="save" class="icon-inline"></i> Log</button>
        </div>
      </div>
    </div>`;
  document.getElementById('vehicles-modal-container').innerHTML = html;
  refreshIcons();
}

async function saveMaintenance(vehicleId) {
  const payload = {
    vehicle_id: vehicleId,
    maintenance_date: document.getElementById('m-date').value,
    maintenance_type: document.getElementById('m-type').value,
    cost:   parseFloat(document.getElementById('m-cost').value) || 0,
    vendor: document.getElementById('m-vendor').value.trim(),
    notes:  document.getElementById('m-notes').value.trim(),
  };
  if (!payload.cost) { toast('Enter cost', 'warning'); return; }
  try {
    const { error: mErr } = await supabase.from('maintenance_logs').insert([payload]);
    if (mErr) throw mErr;
    await supabase.from('expenses').insert([{
      vehicle_id: vehicleId,
      amount: payload.cost,
      category: 'Maintenance',
      date: payload.maintenance_date,
      vendor: payload.vendor,
      notes: payload.notes
    }]);
    await supabase.from('vehicles').update({ last_maintenance: payload.maintenance_date }).eq('id', vehicleId);
    closeModal('maint-modal');
    toast('Maintenance logged ✓');
    await loadVehicles();
  } catch(err) { toast(err.message, 'error'); }
}

async function openVehicleDetails(id, startTab = 'trips') {
  try {
    const [vRes, tripsRes, maintRes, fuelRes] = await Promise.all([
      supabase.from('vehicles').select('*').eq('id', id).single(),
      supabase.from('trips').select('*').eq('vehicle_id', id),
      supabase.from('maintenance_logs').select('*').eq('vehicle_id', id),
      supabase.from('fuel_logs').select('*').eq('vehicle_id', id)
    ]);

    if (vRes.error) throw vRes.error;
    const v = vRes.data;
    const trips  = (tripsRes.data || []).sort((a,b) => new Date(b.trip_date) - new Date(a.trip_date));
    const maints = (maintRes.data || []).sort((a,b) => new Date(b.maintenance_date) - new Date(a.maintenance_date));
    const fuels  = (fuelRes.data || []).sort((a,b) => new Date(b.log_date) - new Date(a.log_date));

    const html = `
      <div class="modal-overlay" id="vd-modal" onclick="if(event.target.id==='vd-modal')closeModal('vd-modal')">
        <div class="modal modal-xl">
          <div class="modal-header">
            <span class="modal-title"><i data-lucide="truck" class="icon-inline"></i> ${v.vehicle_number} — Unified View</span>
            <button class="modal-close" onclick="closeModal('vd-modal')">✕</button>
          </div>
          <div class="modal-body" style="padding:0;">
            <div class="tab-bar" style="margin: 15px 20px;">
              <button class="tab-btn ${startTab==='trips'?'active':''}" onclick="switchVDTab('trips', this)">Trips</button>
              <button class="tab-btn ${startTab==='maint'?'active':''}" onclick="switchVDTab('maint', this)">Maintenance</button>
              <button class="tab-btn ${startTab==='fuel'?'active':''}" onclick="switchVDTab('fuel', this)">Fuel Tracking</button>
            </div>

            <div id="vd-tab-trips" class="tab-panel ${startTab==='trips'?'active':''}" style="padding:0 20px 20px;">
              <div class="table-wrapper"><table style="width:100%;">
                <thead><tr><th>Date</th><th>Route</th><th>Freight</th><th>Status</th></tr></thead>
                <tbody>
                  ${trips.map(t => `<tr><td>${formatDate(t.trip_date)}</td><td>${t.start_location} → ${t.end_location}</td><td>${formatCurrency(t.freight_amount)}</td><td>${statusBadge(t.status)}</td></tr>`).join('') || '<tr><td colspan="4" class="text-center">No trip history</td></tr>'}
                </tbody>
              </table></div>
            </div>

            <div id="vd-tab-maint" class="tab-panel ${startTab==='maint'?'active':''}" style="padding:0 20px 20px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
                <h4 style="margin:0;">Maintenance Logs</h4>
                <button class="btn btn-primary btn-sm" onclick="window.vehiclesModule.openMaintenanceModal(${v.id},'${v.vehicle_number}')">+ Log Maint.</button>
              </div>
              <div class="table-wrapper"><table style="width:100%;">
                <thead><tr><th>Date</th><th>Type</th><th>Vendor</th><th>Cost</th></tr></thead>
                <tbody>
                  ${maints.map(m => `<tr><td>${formatDate(m.maintenance_date)}</td><td>${m.maintenance_type}</td><td>${m.vendor || '—'}</td><td class="td-amount" style="color:var(--red);">${formatCurrency(m.cost)}</td></tr>`).join('') || '<tr><td colspan="4" class="text-center">No logs found</td></tr>'}
                </tbody>
              </table></div>
            </div>

            <div id="vd-tab-fuel" class="tab-panel ${startTab==='fuel'?'active':''}" style="padding:0 20px 20px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
                <h4 style="margin:0;">Fuel Consumption</h4>
                <button class="btn btn-primary btn-sm" onclick="window.vehiclesModule.openFuelModal(${v.id},'${v.vehicle_number}')">+ Log Fuel</button>
              </div>
              <div class="table-wrapper"><table style="width:100%;">
                <thead><tr><th>Date</th><th>Qty (L)</th><th>Rate</th><th>Total</th><th>Odometer</th></tr></thead>
                <tbody>
                  ${fuels.map(f => `<tr><td>${formatDate(f.log_date)}</td><td>${f.quantity} L</td><td>₹${f.rate}</td><td class="td-amount">₹${f.amount}</td><td>${f.odometer || '—'}</td></tr>`).join('') || '<tr><td colspan="5" class="text-center">No fuel logs</td></tr>'}
                </tbody>
              </table></div>
            </div>

          </div>
          <div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal('vd-modal')">Close</button></div>
        </div>
      </div>`;
    document.getElementById('vehicles-modal-container').innerHTML = html;
    window.switchVDTab = (tab, btn) => {
      document.querySelectorAll('#vd-modal .tab-panel').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('#vd-modal .tab-btn').forEach(b => b.classList.remove('active'));
      const activePanel = document.getElementById('vd-tab-' + tab);
      if (activePanel) activePanel.classList.add('active');
      if (btn) btn.classList.add('active');
    };
    refreshIcons();
  } catch(err) { toast(err.message, 'error'); }
}

function openFuelModal(vehicleId, vehicleNo) {
  const html = `
    <div class="modal-overlay" id="fuel-modal" onclick="if(event.target.id==='fuel-modal')closeModal('fuel-modal')">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title"><i data-lucide="fuel" class="icon-inline"></i> Log Fuel — ${vehicleNo}</span>
          <button class="modal-close" onclick="closeModal('fuel-modal')">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group"><label class="form-label">Date</label><input class="form-control" type="date" id="f-date" value="${todayISO()}"></div>
            <div class="form-group"><label class="form-label">Quantity (Liters)</label><input class="form-control" type="number" id="f-qty" placeholder="0.00" oninput="calcFuelTotal()"></div>
            <div class="form-group"><label class="form-label">Rate (per L)</label><input class="form-control" type="number" id="f-rate" placeholder="0.00" oninput="calcFuelTotal()"></div>
            <div class="form-group"><label class="form-label">Total Amount (₹)</label><input class="form-control" type="number" id="f-amount" placeholder="0"></div>
            <div class="form-group"><label class="form-label">Odometer</label><input class="form-control" type="number" id="f-odo" placeholder="Current km"></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal('fuel-modal')">Cancel</button>
          <button class="btn btn-primary" onclick="window.vehiclesModule.saveFuel(${vehicleId})">Save Fuel Log</button>
        </div>
      </div>
    </div>`;
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container.firstElementChild);
  if(window.lucide) window.lucide.createIcons();
  window.calcFuelTotal = () => {
    const q = parseFloat(document.getElementById('f-qty').value) || 0;
    const r = parseFloat(document.getElementById('f-rate').value) || 0;
    document.getElementById('f-amount').value = (q * r).toFixed(2);
  };
}

async function saveFuel(vehicleId) {
  const payload = {
    vehicle_id: vehicleId,
    log_date: document.getElementById('f-date').value,
    quantity: parseFloat(document.getElementById('f-qty').value) || 0,
    rate:     parseFloat(document.getElementById('f-rate').value) || 0,
    amount:   parseFloat(document.getElementById('f-amount').value) || 0,
    odometer: parseInt(document.getElementById('f-odo').value) || null,
  };
  try {
    const { error } = await supabase.from('fuel_logs').insert([payload]);
    if (error) throw error;
    closeModal('fuel-modal');
    toast('Fuel log saved');
    openVehicleDetails(vehicleId, 'fuel'); // Reload details on fuel tab
  } catch(err) { toast(err.message, 'error'); }
}


module.exports = { load, onSearch, loadVehicles, openVehicleModal, saveVehicle, deleteVehicle, openMaintenanceModal, saveMaintenance, openVehicleDetails };
