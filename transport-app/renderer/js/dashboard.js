/**
 * dashboard.js – Supabase-powered Dashboard Logic
 * Dhillon Roadlines TMS
 * Replaces ALL fetch() calls to localhost:4000/api/* with Supabase queries.
 * UI structure is UNCHANGED — same IDs, sections, modals, tables, RBAC, etc.
 */
const { ipcRenderer } = require('electron');

// ─────────────────────────────────────────────────────────────────
// CONSTANTS & STATE
// ─────────────────────────────────────────────────────────────────
const APP_VERSION = '2.1.0';
const PLATFORM = window.navigator.platform.toLowerCase().includes('mac') ? 'mac' : 'win';

// Auth check – use Supabase session
const user = JSON.parse(localStorage.getItem('user') || '{}');
let editingLoadId = null;

// Verify session on load
(async () => {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) {
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    }
})();

let currentTab = 'dashboard';

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────
function formatCurrency(amount) {
    return '₹' + Number(amount || 0).toLocaleString('en-IN');
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
}

// ─────────────────────────────────────────────────────────────────
// UI ELEMENTS
// ─────────────────────────────────────────────────────────────────
const sections = {
    'dashboard': document.getElementById('section-dashboard'),
    'loads': document.getElementById('section-loads'),
    'fleet': document.getElementById('section-fleet'),
    'drivers': document.getElementById('section-drivers'),
    'trips': document.getElementById('section-trips'),
    'finance': document.getElementById('section-finance'),
    'billing': document.getElementById('section-billing'),
    'reports': document.getElementById('section-reports'),
    'ledger': document.getElementById('section-ledger')
};

const links = {
    'dashboard': document.getElementById('link-dashboard'),
    'loads': document.getElementById('link-loads'),
    'fleet': document.getElementById('link-fleet'),
    'drivers': document.getElementById('link-drivers'),
    'trips': document.getElementById('link-trips'),
    'finance': document.getElementById('link-finance'),
    'billing': document.getElementById('link-billing'),
    'reports': document.getElementById('link-reports'),
    'ledger': document.getElementById('link-ledger')
};

const statsTotalTrips = document.getElementById('statsTotalTrips');
const statsActiveTrips = document.getElementById('statsActiveTrips');
const statsTotalRevenue = document.getElementById('statsTotalRevenue');
const statsTotalExpenses = document.getElementById('statsTotalExpenses');
const statsNetProfit = document.getElementById('statsNetProfit');
const signOutBtn = document.getElementById('signOutBtn');

// ─────────────────────────────────────────────────────────────────
// RBAC
// ─────────────────────────────────────────────────────────────────
function applyRBAC() {
    const role = user.role || 'driver';
    console.log('--- Applying RBAC for Role:', role);

    if (role === 'driver') {
        if (links['loads']) links['loads'].classList.add('hidden');
        if (links['fleet']) links['fleet'].classList.add('hidden');
        if (links['drivers']) links['drivers'].classList.add('hidden');
        if (links['finance']) links['finance'].classList.add('hidden');
        if (links['billing']) links['billing'].classList.add('hidden');
        if (links['reports']) links['reports'].classList.add('hidden');
    }

    const roleDisplay = document.getElementById('userRoleDisplay');
    const nameDisplay = document.getElementById('userNameDisplay');
    if (roleDisplay) roleDisplay.textContent = role.toUpperCase();
    if (nameDisplay) nameDisplay.textContent = user.username;
}

// ─────────────────────────────────────────────────────────────────
// TAB SWITCHING
// ─────────────────────────────────────────────────────────────────
function switchTab(tabId) {
    if (!sections[tabId]) {
        console.warn('Section for tab not implemented yet:', tabId);
        return;
    }
    Object.values(links).forEach(link => link?.classList.remove('active'));
    links[tabId]?.classList.add('active');
    Object.keys(sections).forEach(id => {
        sections[id]?.classList[id === tabId ? 'remove' : 'add']('hidden');
    });
    currentTab = tabId;
    loadTabData(tabId);
}

// ─────────────────────────────────────────────────────────────────
// MODAL HELPERS
// ─────────────────────────────────────────────────────────────────
function openModal(modalId) { document.getElementById(modalId)?.classList.remove('hidden'); }
function closeModal(modalId) { document.getElementById(modalId)?.classList.add('hidden'); }

// ─────────────────────────────────────────────────────────────────
// AUTO-UPDATE CHECK (via Supabase app_updates table)
// ─────────────────────────────────────────────────────────────────
async function checkForUpdates() {
    try {
        const { data } = await _supabase
            .from('app_updates')
            .select('*')
            .eq('platform', PLATFORM)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (!data) return;
        const isNewer = data.version > APP_VERSION;
        if (isNewer) {
            document.getElementById('updVersionText').textContent = data.version;
            document.getElementById('updNotesText').textContent = data.release_notes || 'New improvements available.';
            openModal('modalUpdate');

            document.getElementById('btnDoUpdate').onclick = () => {
                const btn = document.getElementById('btnDoUpdate');
                const btnLater = btn.previousElementSibling;
                const progressContainer = document.getElementById('updProgressContainer');
                const notes = document.getElementById('updNotes');

                // UI Feedback
                btn.disabled = true;
                btn.textContent = 'Preparing...';
                if (btnLater) btnLater.classList.add('hidden');
                notes.classList.add('hidden');
                progressContainer.classList.remove('hidden');

                // Trigger IPC Download
                const extension = PLATFORM === 'mac' ? 'dmg' : 'exe';
                ipcRenderer.send('download-update', { url: data.url, filename: `tms-update-${data.version}.${extension}` });
            };
        }

        // Listen for progress
        ipcRenderer.on('download-progress', (event, percent) => {
            document.getElementById('updPercentText').textContent = `${percent}%`;
            document.getElementById('updProgressBar').style.width = `${percent}%`;
            document.getElementById('btnDoUpdate').textContent = 'Downloading...';
        });

        // Listen for completion
        ipcRenderer.on('download-complete', (event, filePath) => {
            document.getElementById('updStatusLabel').textContent = 'Download Finished';
            document.getElementById('btnDoUpdate').textContent = 'Installing...';
            setTimeout(() => {
                ipcRenderer.send('install-update', filePath);
            }, 1000);
        });

        // Listen for errors
        ipcRenderer.on('download-error', (event, message) => {
            alert('Update Failed: ' + message);
            closeModal('modalUpdate');
        });
    } catch (err) {
        console.warn('Update check skipped:', err.message);
    }
}

// ─────────────────────────────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────────────────────────────
async function loadDashboardData() {
    try {
        const [
            { count: totalTrips },
            { count: activeTrips },
            { data: invoices },
            { data: expenses }
        ] = await Promise.all([
            _supabase.from('trips').select('*', { count: 'exact', head: true }),
            _supabase.from('trips').select('*', { count: 'exact', head: true }).neq('status', 'completed'),
            _supabase.from('invoices').select('amount'),
            _supabase.from('expenses').select('amount')
        ]);

        const totalRevenue = (invoices || []).reduce((s, r) => s + Number(r.amount || 0), 0);
        const totalExpenses = (expenses || []).reduce((s, r) => s + Number(r.amount || 0), 0);
        const netProfit = totalRevenue - totalExpenses;

        if (statsTotalTrips) statsTotalTrips.textContent = totalTrips || 0;
        if (statsActiveTrips) statsActiveTrips.textContent = activeTrips || 0;
        if (statsTotalRevenue) statsTotalRevenue.textContent = formatCurrency(totalRevenue);
        if (statsTotalExpenses) statsTotalExpenses.textContent = formatCurrency(totalExpenses);
        if (statsNetProfit) statsNetProfit.textContent = formatCurrency(netProfit);
    } catch (err) {
        console.error('Dashboard stats error:', err);
    }
}

// ─────────────────────────────────────────────────────────────────
// FLEET AVAILABILITY SUMMARY
// ─────────────────────────────────────────────────────────────────
async function updateAvailabilitySummary() {
    try {
        const [
            { data: drivers },
            { data: vehicles }
        ] = await Promise.all([
            _supabase.from('drivers').select('status'),
            _supabase.from('vehicles').select('status')
        ]);

        const availDrivers = (drivers || []).filter(d => d.status === 'AVAILABLE').length;
        const busyDrivers = (drivers || []).filter(d => d.status === 'ON TRIP').length;
        const availVehicles = (vehicles || []).filter(v => v.status === 'AVAILABLE').length;
        const busyVehicles = (vehicles || []).filter(v => v.status === 'ON TRIP').length;

        const dCount = document.getElementById('countAvailDrivers');
        const dText = document.getElementById('textBusyDrivers');
        const vCount = document.getElementById('countAvailVehicles');
        const vText = document.getElementById('textBusyVehicles');

        if (dCount) dCount.textContent = `${availDrivers} Available`;
        if (dText) dText.textContent = `${busyDrivers} Currently On Trip`;
        if (vCount) vCount.textContent = `${availVehicles} Available`;
        if (vText) vText.textContent = `${busyVehicles} Currently On Trip`;

        // Update badges based on availability
        if (dCount) dCount.className = `badge badge-${availDrivers > 0 ? 'available' : 'busy'}`;
        if (vCount) vCount.className = `badge badge-${availVehicles > 0 ? 'available' : 'busy'}`;

    } catch (err) { console.error('Availability summary error:', err); }
}

// ─────────────────────────────────────────────────────────────────
// FLEET STATUS RECONCILIATION
// ─────────────────────────────────────────────────────────────────
async function syncFleetStatus() {
    try {
        const { data: activeTrips } = await _supabase.from('trips').select('driver_id, vehicle_id').eq('status', 'pending');
        const busyDriverIds = (activeTrips || []).map(t => t.driver_id).filter(id => id);
        const busyVehicleIds = (activeTrips || []).map(t => t.vehicle_id).filter(id => id);

        // Reset all to AVAILABLE
        await _supabase.from('drivers').update({ status: 'AVAILABLE' }).not('id', 'in', `(${busyDriverIds.join(',') || '0'})`);
        await _supabase.from('vehicles').update({ status: 'AVAILABLE' }).not('id', 'in', `(${busyVehicleIds.join(',') || '0'})`);

        // Mark current as ON TRIP
        if (busyDriverIds.length) await _supabase.from('drivers').update({ status: 'ON TRIP' }).in('id', busyDriverIds);
        if (busyVehicleIds.length) await _supabase.from('vehicles').update({ status: 'ON TRIP' }).in('id', busyVehicleIds);

        await updateAvailabilitySummary();
    } catch (err) { console.error('Fleet sync error:', err); }
}

// ─────────────────────────────────────────────────────────────────
// UNIVERSAL DATA LOADING
// ─────────────────────────────────────────────────────────────────
async function loadTabData(tabId) {
    try {
        if (tabId === 'dashboard') {
            await loadDashboardData();
            await syncFleetStatus(); // Reconcile on dashboard load
        } else if (tabId === 'loads') {
            const { data } = await _supabase.from('loads').select('*').order('id', { ascending: false });
            renderTable('table-loads', data || [], ['id', 'pickup', 'drop_location', 'gr', 'weight', 'fright', 'bal', 'status', 'price']);
        } else if (tabId === 'fleet') {
            const { data } = await _supabase.from('vehicles').select('*').order('id', { ascending: false });
            renderTable('table-vehicles', data || [], ['id', 'vehicle_number', 'type', 'capacity']);
        } else if (tabId === 'drivers') {
            const { data } = await _supabase.from('drivers').select('*').order('id', { ascending: false });
            renderTable('table-drivers', data || [], ['id', 'name', 'phone', 'status']);
        } else if (tabId === 'trips') {
            await syncFleetStatus(); // Reconcile before loading trips
            const { data } = await _supabase
                .from('trips')
                .select('*, loads(pickup, drop_location), vehicles(vehicle_number), drivers(name)')
                .order('id', { ascending: false });

            // Flatten joined data for table rendering
            const flat = (data || []).map(t => ({
                ...t,
                vehicle_number: t.vehicles?.vehicle_number || '-',
                driver_name: t.drivers?.name || '-',
                pickup: t.loads?.pickup || '-',
                drop_location: t.loads?.drop_location || '-'
            }));
            renderTable('table-trips', flat, ['id', 'vehicle_number', 'driver_name', 'pickup', 'drop_location', 'status', 'actions']);
        } else if (tabId === 'finance') {
            const { data: expenses } = await _supabase
                .from('expenses')
                .select('*, trips(id)')
                .order('id', { ascending: false });

            const expenseList = expenses || [];
            const total = expenseList.reduce((s, e) => s + Number(e.amount || 0), 0);

            const fuel = expenseList
                .filter(e => e.category?.toLowerCase() === 'fuel')
                .reduce((s, e) => s + Number(e.amount || 0), 0);
            const maint = expenseList
                .filter(e => e.category?.toLowerCase() === 'maintenance')
                .reduce((s, e) => s + Number(e.amount || 0), 0);

            document.getElementById('finTotalExpenses').textContent = formatCurrency(total);
            document.getElementById('finFuelCosts').textContent = formatCurrency(fuel);
            document.getElementById('finMaintCosts').textContent = formatCurrency(maint);

            const flatExp = expenseList.map(e => ({
                ...e,
                vehicle_number: `Trip #${e.trip_id || '-'}`,
                description: e.type || '-'
            }));
            renderTable('table-expenses', flatExp, ['id', 'date', 'vehicle_number', 'category', 'description', 'amount']);
        } else if (tabId === 'billing') {
            const { data } = await _supabase
                .from('invoices')
                .select('*, trips(status, loads(pickup, drop_location))')
                .order('id', { ascending: false });

            const flat = (data || []).map(inv => ({
                ...inv,
                pickup: inv.trips?.loads?.pickup || '-',
                drop_location: inv.trips?.loads?.drop_location || '-',
                trip_status: inv.trips?.status || '-'
            }));
            renderTable('table-billing', flat, ['id', 'trip_id', 'pickup', 'drop_location', 'amount', 'status', 'trip_status', 'actions']);
        } else if (tabId === 'reports') {
            fetchAnalytics();
        } else if (tabId === 'ledger') {
            loadLedgerData();
        }
    } catch (err) {
        console.error(`Failed to load tab: ${tabId}`, err);
    }
}

// ─────────────────────────────────────────────────────────────────
// TABLE RENDERER
// ─────────────────────────────────────────────────────────────────
function renderTable(tableId, data, fields) {
    const table = document.getElementById(tableId);
    if (!table) return;
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';

    if (!data.length) {
        tbody.innerHTML = '<tr><td colspan="100%" style="text-align:center; padding: 40px; color: #a0a0a0;">No records found.</td></tr>';
        return;
    }

    data.forEach(row => {
        const tr = document.createElement('tr');
        fields.forEach(field => {
            const td = document.createElement('td');

            if (field === 'actions') {
                td.innerHTML = '';
                if (tableId === 'table-trips' && row.status?.toLowerCase() !== 'completed') {
                    td.innerHTML = `<button class="btn-action" onclick="event.stopPropagation(); completeTrip(${row.id})"><i class="fas fa-check"></i> Complete</button>`;
                } else if (tableId === 'table-billing') {
                    td.innerHTML = `
                        <div style="display:flex; gap:8px;">
                            <button class="btn-action" onclick="event.stopPropagation(); toggleInvoiceStatus(${row.id}, '${row.status}')">
                                <i class="fas fa-${row.status?.toLowerCase() === 'paid' ? 'times' : 'check'}"></i>
                                ${row.status?.toLowerCase() === 'paid' ? 'Unpaid' : 'Paid'}
                            </button>
                            <button class="btn-secondary-action" onclick="event.stopPropagation(); printInvoice(${row.id})">
                                <i class="fas fa-print"></i> Print
                            </button>
                        </div>`;
                }
                tr.appendChild(td);
                return;
            }

            let value = row[field] === null || row[field] === undefined ? '-' : row[field];

            if (['price', 'amount', 'fright', 'revenue', 'expenses', 'profit'].includes(field)) {
                td.textContent = formatCurrency(value);
                if (field === 'profit') td.style.color = value >= 0 ? '#16a34a' : '#ff3e60';
            } else if (field === 'status' || field === 'trip_status') {
                const statusKey = (value + '').toLowerCase().replace(' ', '');
                td.innerHTML = `<span class="badge badge-${statusKey}">${(value + '').toUpperCase()}</span>`;
            } else if (field === 'pickup' && row.drop_location) {
                td.textContent = `${row.pickup} ➔ ${row.drop_location}`;
            } else if (['created_at', 'date'].includes(field)) {
                td.textContent = formatDate(value);
            } else if (field === 'name' && tableId === 'table-drivers') {
                td.innerHTML = `<div style="display:flex; align-items:center; gap:12px;">
                    <div class="table-icon table-icon-bg"><i class="fas fa-user-tie"></i></div>
                    <span style="font-weight:600;">${value}</span>
                </div>`;
            } else if (field === 'vehicle_number' && tableId === 'table-vehicles') {
                td.innerHTML = `<div style="display:flex; align-items:center; gap:12px;">
                    <div class="table-icon table-icon-bg" style="color:#ff3e60; background:#fff5f6;"><i class="fas fa-truck"></i></div>
                    <span style="font-weight:700;">${value}</span>
                </div>`;
            } else if (tableId === 'table-ledger') {
                if (['date', 'gr', 'box', 'bal', 'sur', 'shortage'].includes(field)) td.style.color = '#ef4444';
                if (['truck_no', 'weight', 'payment'].includes(field)) td.style.color = '#22c55e';
                if (field === 'fright') td.style.color = '#06b6d4';
                if (field === 'from_to') td.style.color = '#9333ea';
                td.textContent = value;
            } else {
                td.textContent = value;
            }

            tr.appendChild(td);
        });

        // Row click handlers
        if (tableId === 'table-loads') tr.onclick = () => openLoadDetails(row.id);
        else if (tableId === 'table-drivers') tr.onclick = () => openDriverProfile(row.id);
        else if (tableId === 'table-trips') tr.onclick = () => openTripSummary(row.id);

        tbody.appendChild(tr);
    });
}

// ─────────────────────────────────────────────────────────────────
// DETAIL MODALS
// ─────────────────────────────────────────────────────────────────
async function openLoadDetails(id) {
    try {
        const { data: load, error } = await _supabase
            .from('loads').select('*').eq('id', id).single();

        if (error || !load) return alert('Load not found');

        document.getElementById('detLoadTitle').textContent = `Load #${load.id}`;
        document.getElementById('detOrigin').textContent = load.pickup || '-';
        document.getElementById('detDestination').textContent = load.drop_location || '-';
        document.getElementById('detWeight').textContent = `${load.weight || 0} Tons`;
        document.getElementById('detConsignor').textContent = load.consignor || 'N/A';
        document.getElementById('detConsignee').textContent = load.consignee || 'N/A';
        document.getElementById('detGR').textContent = load.gr || '-';
        document.getElementById('detFreight').textContent = formatCurrency(load.fright);
        document.getElementById('detPayment').textContent = formatCurrency(load.payment);
        document.getElementById('detShortage').textContent = `${load.shortage || 0} KG`;
        document.getElementById('detBalance').textContent = formatCurrency((load.fright || 0) - (load.payment || 0));
        document.getElementById('detBox').textContent = load.box || '-';

        const badge = document.getElementById('detStatusBadge');
        badge.textContent = (load.status || 'PENDING').toUpperCase();
        badge.className = `badge badge-${(load.status || 'pending').toLowerCase()}`;

        // Edit button
        const btnEdit = document.getElementById('btnEditLoad');
        if (btnEdit) {
            btnEdit.onclick = () => {
                closeModal('modalLoadDetails');
                editingLoadId = load.id;
                document.getElementById('loadPickup').value = load.pickup || '';
                document.getElementById('loadDrop').value = load.drop_location || '';
                document.getElementById('loadWeight').value = load.weight || 0;
                document.getElementById('loadConsignor').value = load.consignor || '';
                document.getElementById('loadConsignee').value = load.consignee || '';
                document.getElementById('loadGR').value = load.gr || '';
                document.getElementById('loadStation').value = load.station || '';
                document.getElementById('loadFreight').value = load.fright || 0;
                document.getElementById('loadPayment').value = load.payment || 0;
                document.getElementById('loadBox').value = load.box || '';
                document.getElementById('loadFromTo').value = load.from_to || '';
                document.getElementById('loadShortage').value = load.shortage || 0;
                document.getElementById('loadSur').value = load.sur || 0;
                document.getElementById('loadBalance').value = (load.fright || 0) - (load.payment || 0);

                // Change Modal UI to EDIT mode
                const modalTitle = document.querySelector('#modalCreateLoad h3');
                const submitBtn = document.querySelector('#formCreateLoad button[type="submit"]');
                if (modalTitle) modalTitle.textContent = 'Edit Load Details';
                if (submitBtn) submitBtn.textContent = 'Update Load Details';

                openModal('modalCreateLoad');
            };
        }

        // Delete button
        const btnDelete = document.getElementById('btnDeleteLoad');
        if (btnDelete) {
            btnDelete.onclick = async () => {
                if (confirm(`Delete Load #${load.id}?`)) {
                    await _supabase.from('loads').delete().eq('id', load.id);
                    closeModal('modalLoadDetails');
                    loadTabData('loads');
                }
            };
        }

        openModal('modalLoadDetails');
    } catch (err) { console.error('Load details error:', err); }
}

async function openDriverProfile(id) {
    try {
        const { data: driver, error } = await _supabase
            .from('drivers').select('*').eq('id', id).single();

        if (error || !driver) return alert('Driver not found');

        document.getElementById('detDriName').textContent = driver.name;
        document.getElementById('detDriPhone').textContent = driver.phone || '-';
        document.getElementById('detDriLicense').textContent = driver.license_number || 'Not Provided';
        document.getElementById('detDriAadhaar').textContent = driver.aadhaar_number || 'Not Provided';
        document.getElementById('detDriJoined').textContent = formatDate(driver.joined_date);

        const badge = document.getElementById('detDriStatus');
        badge.textContent = (driver.status || 'AVAILABLE').toUpperCase();
        badge.className = `badge badge-${(driver.status || 'available').toLowerCase()}`;

        openModal('modalDriverProfile');
    } catch (err) { console.error('Driver profile error:', err); }
}

async function openTripSummary(id) {
    try {
        const { data: trip, error } = await _supabase
            .from('trips')
            .select('*, loads(pickup, drop_location), vehicles(vehicle_number, type), drivers(name, phone)')
            .eq('id', id)
            .single();

        if (error || !trip) return alert('Trip not found');

        // Fetch financials
        const [{ data: expList }, { data: invList }] = await Promise.all([
            _supabase.from('expenses').select('amount, category, type').eq('trip_id', id),
            _supabase.from('invoices').select('amount').eq('trip_id', id)
        ]);

        const totalRevenue = (invList || []).reduce((s, r) => s + Number(r.amount || 0), 0);
        const totalExpenses = (expList || []).reduce((s, r) => s + Number(r.amount || 0), 0);
        const profit = totalRevenue - totalExpenses;

        document.getElementById('sumTripTitle').textContent = `Trip Summary #${trip.id}`;

        const badge = document.getElementById('sumTripStatus');
        badge.textContent = (trip.status || 'PENDING').toUpperCase();
        badge.className = `badge badge-${(trip.status || 'pending').toLowerCase()}`;

        document.getElementById('sumVehNumber').textContent = trip.vehicles?.vehicle_number || '-';
        document.getElementById('sumVehType').textContent = trip.vehicles?.type || '-';
        document.getElementById('sumDriName').textContent = trip.drivers?.name || '-';
        document.getElementById('sumDriPhone').textContent = trip.drivers?.phone || '-';
        document.getElementById('sumLoadTitle').textContent = `Load → ${trip.loads?.pickup || '-'} ➔ ${trip.loads?.drop_location || '-'}`;
        document.getElementById('sumOrigin').textContent = trip.loads?.pickup || '-';
        document.getElementById('sumDestination').textContent = trip.loads?.drop_location || '-';

        document.getElementById('sumRevenue').textContent = formatCurrency(totalRevenue);
        document.getElementById('sumExpenses').textContent = formatCurrency(totalExpenses);
        document.getElementById('sumProfit').textContent = formatCurrency(profit);
        document.getElementById('sumProfit').style.color = profit >= 0 ? '#16a34a' : '#ff3e60';

        // Expense list table
        const listDiv = document.getElementById('sumExpenseList');
        if (!expList || expList.length === 0) {
            listDiv.innerHTML = 'No expenses recorded.';
        } else {
            let html = '<table style="width:100%; margin-top:8px; font-size:11px;">';
            expList.forEach(exp => {
                html += `<tr>
                    <td style="padding:4px 0; color:#64748b;">${exp.category || '-'} – ${exp.type || ''}</td>
                    <td style="padding:4px 0; text-align:right; font-weight:600;">${formatCurrency(exp.amount)}</td>
                </tr>`;
            });
            html += '</table>';
            listDiv.innerHTML = html;
        }

        const auditEl = document.getElementById('sumAuditInfo');
        if (auditEl) {
            auditEl.textContent = trip.status?.toLowerCase() === 'completed'
                ? `This trip was completed on ${formatDate(trip.updated_at)}.`
                : `Trip was started on ${formatDate(trip.created_at)} and is currently in progress.`;
        }

        openModal('modalTripSummary');
    } catch (err) { console.error('Trip summary error:', err); }
}

// ─────────────────────────────────────────────────────────────────
// TRIP ACTIONS
// ─────────────────────────────────────────────────────────────────
async function completeTrip(id) {
    if (!confirm(`Mark Trip #${id} as COMPLETED?`)) return;
    try {
        const { error } = await _supabase
            .from('trips')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq('id', id);
        if (error) throw error;

        // Fetch full trip details to release driver/vehicle and sync Ledger
        const { data: trip } = await _supabase
            .from('trips')
            .select('*, vehicles(id, vehicle_number), drivers(id), loads(*)')
            .eq('id', id)
            .single();

        if (trip) {
            // RELEASE DRIVER & VEHICLE
            if (trip.driver_id) {
                await _supabase.from('drivers').update({ status: 'AVAILABLE' }).eq('id', trip.driver_id);
            }
            if (trip.vehicle_id) {
                await _supabase.from('vehicles').update({ status: 'AVAILABLE' }).eq('id', trip.vehicle_id);
            }
            await syncFleetStatus(); // Reconcile after completion

            if (trip.loads) {
                const now = new Date();
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const dateStr = `${now.getDate()}-${monthNames[now.getMonth()]}-${String(now.getFullYear()).slice(2)}`;

                const ledgerData = {
                    date: dateStr,
                    truck_no: trip.vehicles?.vehicle_number || '-',
                    station: trip.loads.station || trip.loads.pickup || '-',
                    gr: trip.loads.gr || '-',
                    weight: trip.loads.weight ? String(trip.loads.weight) : '-',
                    fright: String(trip.loads.fright || 0),
                    payment: String(trip.loads.payment || 0),
                    box: trip.loads.box || '-',
                    from_to: trip.loads.from_to || `${trip.loads.pickup} to ${trip.loads.drop_location}`,
                    bal: String(trip.loads.bal || 0),
                    sur: String(trip.loads.sur || 0),
                    shortage: String(trip.loads.shortage || 0)
                };
                await _supabase.from('ledger_entries').insert(ledgerData);
            }
        }

        loadTabData('trips');
    } catch (err) { alert('Error completing trip: ' + err.message); }
}

// ─────────────────────────────────────────────────────────────────
// BILLING ACTIONS
// ─────────────────────────────────────────────────────────────────
async function toggleInvoiceStatus(id, currentStatus) {
    const next = currentStatus?.toLowerCase() === 'paid' ? 'unpaid' : 'paid';
    try {
        await _supabase.from('invoices').update({ status: next }).eq('id', id);
        loadTabData('billing');
    } catch (err) { alert('Error updating status'); }
}

async function printInvoice(id) {
    try {
        const { data: inv, error } = await _supabase
            .from('invoices')
            .select('*, trips(*, vehicles(vehicle_number), loads(pickup, drop_location, consignor, consignee))')
            .eq('id', id)
            .single();

        if (error || !inv) return alert('Invoice not found');

        document.getElementById('printBillNo').textContent = inv.id;
        document.getElementById('printBillDate').textContent = formatDate(inv.created_at);
        document.getElementById('printConsignor').textContent = inv.trips?.loads?.consignor || 'N/A';
        document.getElementById('printOrigin').textContent = inv.trips?.loads?.pickup || '-';
        document.getElementById('printConsignee').textContent = inv.trips?.loads?.consignee || 'N/A';
        document.getElementById('printDest').textContent = inv.trips?.loads?.drop_location || '-';
        document.getElementById('printLoadTitle').textContent = 'Transportation Cargo';
        document.getElementById('printBoxBrand').textContent = inv.trips?.loads?.box ? `Box/Brand: ${inv.trips.loads.box}` : '';
        document.getElementById('printWeight').textContent = inv.trips?.loads?.weight ? `${inv.trips.loads.weight} Tons` : '-';
        document.getElementById('printRate').textContent = `₹${inv.rate || 0}`;
        document.getElementById('printVehNo').textContent = inv.trips?.vehicles?.vehicle_number || '-';
        document.getElementById('printFreight').textContent = formatCurrency(inv.freight);
        document.getElementById('printAdvance').textContent = `${formatCurrency(inv.advance)}`;
        document.getElementById('printOther').textContent = formatCurrency(inv.other_charges);
        document.getElementById('printTotal').textContent = formatCurrency(inv.balance || inv.amount);

        const printArea = document.getElementById('printable-bill');
        printArea.classList.remove('hidden');

        // Let the DOM update before invoking print dialog
        setTimeout(() => {
            window.print();
            printArea.classList.add('hidden');
        }, 150);
    } catch (err) { alert('Error generating print view'); }
}

// ─────────────────────────────────────────────────────────────────
// ANALYTICS / REPORTS
// ─────────────────────────────────────────────────────────────────
let reportFilter = 'month';

function setReportFilter(type) {
    reportFilter = type;
    document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    fetchAnalytics();
}

async function fetchAnalytics() {
    let from = document.getElementById('repFilterFrom').value;
    let to = document.getElementById('repFilterTo').value;

    if (!from || !to) {
        const now = new Date();
        if (reportFilter === 'today') {
            from = now.toISOString().split('T')[0];
            to = from;
        } else if (reportFilter === 'month') {
            from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            to = now.toISOString().split('T')[0];
        } else if (reportFilter === 'year') {
            from = `${now.getFullYear()}-01-01`;
            to = now.toISOString().split('T')[0];
        }
    }

    try {
        // Fetch trips created in range with their invoices and expenses
        const { data: trips } = await _supabase
            .from('trips')
            .select('id, status, created_at, updated_at, vehicles(vehicle_number), invoices(amount), expenses(amount)')
            .gte('created_at', `${from}T00:00:00`)
            .lte('created_at', `${to}T23:59:59`);

        const breakdown = (trips || []).map(t => {
            const revenue = (t.invoices || []).reduce((s, r) => s + Number(r.amount || 0), 0);
            const expenses = (t.expenses || []).reduce((s, r) => s + Number(r.amount || 0), 0);
            return {
                id: t.id,
                created_at: t.created_at,
                vehicle_number: t.vehicles?.vehicle_number || '-',
                revenue,
                expenses,
                profit: revenue - expenses,
                status: t.status
            };
        });

        const totalRevenue = breakdown.reduce((s, r) => s + r.revenue, 0);
        const totalExpenses = breakdown.reduce((s, r) => s + r.expenses, 0);
        const netProfit = totalRevenue - totalExpenses;
        const margin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

        document.getElementById('repTotalRevenue').textContent = formatCurrency(totalRevenue);
        document.getElementById('repTotalExpenses').textContent = formatCurrency(totalExpenses);
        document.getElementById('repNetProfit').textContent = formatCurrency(netProfit);
        document.getElementById('repMargin').textContent = `Margin: ${margin}%`;
        document.getElementById('repTripCount').textContent = `Showing ${breakdown.length} trips`;

        renderTable('table-reports', breakdown, ['id', 'created_at', 'vehicle_number', 'revenue', 'expenses', 'profit', 'status']);
    } catch (err) {
        console.error('Analytics error:', err);
    }
}

// ─────────────────────────────────────────────────────────────────
// LEDGER
// ─────────────────────────────────────────────────────────────────
async function loadLedgerData() {
    try {
        const monthFilter = document.getElementById('ledgerMonthFilter')?.value || '';
        const yearFilter = document.getElementById('ledgerYearFilter')?.value || '';

        const { data, error } = await _supabase
            .from('ledger_entries')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;

        let filteredData = data || [];

        // Filter by text date (e.g., '1-Mar-26')
        if (monthFilter || yearFilter) {
            filteredData = filteredData.filter(row => {
                const parts = (row.date || '').split('-');
                if (parts.length >= 3) {
                    const rowMonth = parts[1]; // e.g., 'Mar'
                    const rowYear = parts[2];  // e.g., '26'
                    const matchMonth = !monthFilter || rowMonth.toLowerCase() === monthFilter.toLowerCase();
                    const matchYear = !yearFilter || rowYear === yearFilter;
                    return matchMonth && matchYear;
                }
                return true;
            });
        }

        // Calculate Totals
        let totalFreight = 0;
        let totalPayment = 0;
        let totalShortage = 0;
        filteredData.forEach(row => {
            totalFreight += Number(String(row.fright).replace(/[^0-9.-]+/g, "")) || 0;
            totalPayment += Number(String(row.payment).replace(/[^0-9.-]+/g, "")) || 0;
            totalShortage += Number(String(row.shortage).replace(/[^0-9.-]+/g, "")) || 0;
        });

        // Update UI Summary
        const subtitle = document.getElementById('ledgerSubtitle');
        if (subtitle) {
            const mText = monthFilter ? document.getElementById('ledgerMonthFilter').options[document.getElementById('ledgerMonthFilter').selectedIndex].text : 'All Months';
            const yText = yearFilter ? '20' + yearFilter : 'All Years';
            subtitle.textContent = `Sheet Data: ${mText} ${yearFilter ? yText : ''}`;
        }

        const formatBoldCur = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
        document.getElementById('ledgerTotalFright').textContent = formatBoldCur(totalFreight);
        document.getElementById('ledgerTotalPayment').textContent = formatBoldCur(totalPayment);
        document.getElementById('ledgerTotalShortage').textContent = formatBoldCur(totalShortage);

        renderTable('table-ledger', filteredData, ['date', 'truck_no', 'station', 'gr', 'weight', 'fright', 'payment', 'box', 'from_to', 'bal', 'sur', 'shortage']);
    } catch (err) {
        console.error('Ledger error:', err);
    }
}

// ─────────────────────────────────────────────────────────────────
// DROPDOWN HELPER
// ─────────────────────────────────────────────────────────────────
async function populateDropdown(selectId, table, labelFn, filter = null, valueField = 'id') {
    const select = document.getElementById(selectId);
    if (!select) return;
    try {
        let query = _supabase.from(table).select('*');
        if (filter) {
            Object.keys(filter).forEach(key => {
                query = query.eq(key, filter[key]);
            });
        }
        const { data } = await query.order('id', { ascending: false });
        select.innerHTML = '<option value="">-- Select --</option>';
        (data || []).forEach(item => {
            const opt = document.createElement('option');
            opt.value = item[valueField];
            opt.textContent = typeof labelFn === 'function' ? labelFn(item) : item[labelFn];
            select.appendChild(opt);
        });
    } catch (err) { console.error(`Failed to populate ${selectId}`, err); }
}

// ─────────────────────────────────────────────────────────────────
// GENERIC FORM HANDLER
// ─────────────────────────────────────────────────────────────────
const setupSupabaseForm = (formId, table, tabToRefresh, getBody, modalId) => {
    const form = document.getElementById(formId);
    if (!form) return;
    form.onsubmit = async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        const body = getBody();

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Processing...';

            const { error } = await _supabase.from(table).insert(body);
            if (error) throw error;

            // Close the correct modal
            const overlay = modalId || form.closest('.modal-overlay')?.id;
            if (overlay) closeModal(overlay);
            form.reset();
            loadTabData(tabToRefresh);
        } catch (err) {
            console.error(`Form error: ${formId}`, err);
            alert('Action Failed: ' + (err.message || 'Unknown error'));
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    };
};

// ─────────────────────────────────────────────────────────────────
// FORM: CREATE LOAD (has custom bal calculation, set up separately)
// ─────────────────────────────────────────────────────────────────
const formCreateLoad = document.getElementById('formCreateLoad');
if (formCreateLoad) {
    formCreateLoad.onsubmit = async (e) => {
        e.preventDefault();
        const submitBtn = formCreateLoad.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;

        const freight = parseInt(document.getElementById('loadFreight').value) || 0;
        const payment = parseInt(document.getElementById('loadPayment').value) || 0;
        const loadData = {
            pickup: document.getElementById('loadPickup').value,
            drop_location: document.getElementById('loadDrop').value,
            weight: parseInt(document.getElementById('loadWeight').value) || 0,
            price: 0,
            truck_type: 'General Cargo',
            consignor: document.getElementById('loadConsignor').value || 'Not Assigned',
            consignee: document.getElementById('loadConsignee').value || 'Not Assigned',
            gr: document.getElementById('loadGR').value || '-',
            station: document.getElementById('loadStation').value || '-',
            fright: freight,
            payment: payment,
            box: document.getElementById('loadBox').value || '-',
            from_to: document.getElementById('loadFromTo').value || '-',
            shortage: parseInt(document.getElementById('loadShortage').value) || 0,
            sur: parseInt(document.getElementById('loadSur').value) || 0,
            bal: freight - payment,
            status: 'PENDING'
        };

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = editingLoadId ? 'Updating...' : 'Creating...';

            let error;
            if (editingLoadId) {
                const { error: err } = await _supabase.from('loads').update(loadData).eq('id', editingLoadId);
                error = err;
            } else {
                const { error: err } = await _supabase.from('loads').insert(loadData);
                error = err;
            }

            if (error) throw error;

            // Sync to KOGM Ledger automatically
            const now = new Date();
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const dateStr = `${now.getDate()}-${monthNames[now.getMonth()]}-${String(now.getFullYear()).slice(2)}`;
            const ledgerData = {
                date: dateStr,
                truck_no: loadData.truck_type,
                station: loadData.station,
                gr: loadData.gr,
                weight: loadData.weight + 'KG',
                fright: String(loadData.fright || 0),
                payment: String(loadData.payment || 0),
                box: loadData.box,
                from_to: loadData.from_to,
                bal: String(loadData.bal || 0),
                sur: String(loadData.sur || 0),
                shortage: String(loadData.shortage || 0)
            };
            await _supabase.from('ledger_entries').insert(ledgerData);

            closeModal('modalCreateLoad');
            formCreateLoad.reset();
            editingLoadId = null; // Clear edit mode
            loadTabData('loads');
            loadLedgerData(); // Refresh ledger in background
        } catch (err) {
            alert('Creation Failed: ' + err.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    };
}

// ─────────────────────────────────────────────────────────────────
// REGISTER INDIVIDUAL FORMS
// ─────────────────────────────────────────────────────────────────

// Vehicle Form
setupSupabaseForm('formCreateVehicle', 'vehicles', 'fleet', () => ({
    vehicle_number: document.getElementById('vehNumber').value,
    type: document.getElementById('vehType').value,
    capacity: parseInt(document.getElementById('vehCapacity').value) || 0,
    make: document.getElementById('vehMake').value,
    model: document.getElementById('vehModel').value
}), 'modalCreateVehicle');

// Driver Form
setupSupabaseForm('formCreateDriver', 'drivers', 'drivers', () => {
    const joined = document.getElementById('driJoined').value;
    return {
        name: document.getElementById('driName').value,
        phone: document.getElementById('driPhone').value,
        license_number: document.getElementById('driLicense').value || null,
        aadhaar_number: document.getElementById('driAadhaar').value || null,
        joined_date: joined || null,
        status: 'AVAILABLE'
    };
}, 'modalCreateDriver');

// Trip Form (Custom handler for earlier invoice creation)
const formCreateTrip = document.getElementById('formCreateTrip');
if (formCreateTrip) {
    formCreateTrip.onsubmit = async (e) => {
        e.preventDefault();
        const submitBtn = formCreateTrip.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        const loadId = parseInt(document.getElementById('tripLoadId').value);

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Assigning...';

            const tripBody = {
                load_id: loadId,
                vehicle_id: parseInt(document.getElementById('tripVehicleId').value),
                driver_id: parseInt(document.getElementById('tripDriverId').value),
                status: 'pending',
                created_by: user.id || null
            };

            const { data: trip, error: tripErr } = await _supabase
                .from('trips')
                .insert(tripBody)
                .select()
                .single();

            if (tripErr) throw tripErr;

            // MARK DRIVER & VEHICLE AS BUSY (ON TRIP)
            await _supabase.from('drivers').update({ status: 'ON TRIP' }).eq('id', tripBody.driver_id);
            await _supabase.from('vehicles').update({ status: 'ON TRIP' }).eq('id', tripBody.vehicle_id);
            await syncFleetStatus(); // Reconcile after assignment

            // Immediately create invoice for this trip
            const { data: load } = await _supabase
                .from('loads')
                .select('*')
                .eq('id', loadId)
                .single();

            if (load) {
                const invoiceData = {
                    trip_id: trip.id,
                    amount: (load.fright || 0) + (load.sur || 0) - (load.payment || 0),
                    rate: load.price || 0,
                    freight: load.fright || 0,
                    advance: load.payment || 0,
                    other_charges: load.sur || 0,
                    status: 'pending'
                };
                await _supabase.from('invoices').insert(invoiceData);
            }

            closeModal('modalCreateTrip');
            formCreateTrip.reset();
            loadTabData('trips');
        } catch (err) {
            alert('Trip Assignment Failed: ' + err.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    };
}

// Expense Form
setupSupabaseForm('formCreateExpense', 'expenses', 'finance', () => ({
    trip_id: parseInt(document.getElementById('expTripId').value),
    category: document.getElementById('expCategory').value,
    date: document.getElementById('expDate').value || new Date().toISOString().split('T')[0],
    type: document.getElementById('expDesc').value,
    amount: parseInt(document.getElementById('expAmount').value)
}), 'modalCreateExpense');



// ─────────────────────────────────────────────────────────────────
// BUTTON OPEN-MODAL HANDLERS
// ─────────────────────────────────────────────────────────────────
const registerOpenModal = (btnId, modalId, onOpen) => {
    const btn = document.getElementById(btnId);
    if (btn) btn.onclick = () => {
        if (onOpen) onOpen();
        openModal(modalId);
    };
};

registerOpenModal('btnCreateLoad', 'modalCreateLoad', () => {
    editingLoadId = null; // Ensure we are in CREATE mode
    const modalTitle = document.querySelector('#modalCreateLoad h3');
    const submitBtn = document.querySelector('#formCreateLoad button[type="submit"]');
    if (modalTitle) modalTitle.textContent = 'Create New Load';
    if (submitBtn) submitBtn.textContent = 'Create Load';
    formCreateLoad.reset();
});
registerOpenModal('btnCreateVehicle', 'modalCreateVehicle');
registerOpenModal('btnCreateDriver', 'modalCreateDriver');
registerOpenModal('btnCreateTrip', 'modalCreateTrip', () => {
    populateDropdown('tripLoadId', 'loads', l => `${l.pickup} ➔ ${l.drop_location} (#${l.id})`);
    populateDropdown('tripVehicleId', 'vehicles', v => `${v.vehicle_number} (${v.type})`, { status: 'AVAILABLE' });
    populateDropdown('tripDriverId', 'drivers', d => d.name, { status: 'AVAILABLE' });
});
registerOpenModal('btnCreateExpense', 'modalCreateExpense', () => {
    populateDropdown('expTripId', 'trips', t => `Trip #${t.id}`);
});

// ─────────────────────────────────────────────────────────────────
// SIGN OUT
// ─────────────────────────────────────────────────────────────────
if (signOutBtn) {
    signOutBtn.onclick = async (e) => {
        e.preventDefault();
        await _supabase.auth.signOut();
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    };
}

// ─────────────────────────────────────────────────────────────────
// SIDEBAR NAV LISTENERS
// ─────────────────────────────────────────────────────────────────
Object.keys(links).forEach(tabId => {
    if (links[tabId]) {
        links[tabId].addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(tabId);
        });
    }
});

// ─────────────────────────────────────────────────────────────────
// PHONE VALIDATION
// ─────────────────────────────────────────────────────────────────
const setupPhoneValidation = (inputId, hintId) => {
    const input = document.getElementById(inputId);
    const hint = document.getElementById(hintId);
    if (!input || !hint) return;
    input.oninput = () => {
        input.value = input.value.replace(/\D/g, '');
        if (input.value.length > 0 && input.value.length < 10) {
            hint.classList.remove('hidden');
        } else {
            hint.classList.add('hidden');
        }
    };
};
setupPhoneValidation('driPhone', 'driPhoneHint');

// ─────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────
(async function syncOldTrips() {
    try {
        const { data: existing } = await _supabase.from('ledger_entries').select('*').like('date', '%Apr%');
        if (!existing || existing.length === 0) {
            const { data: trip } = await _supabase.from('trips').select('*, vehicles(vehicle_number), loads(*)').eq('id', 1).single();
            if (trip && trip.loads) {
                const now = new Date();
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const dateStr = `${now.getDate()}-${monthNames[now.getMonth()]}-${String(now.getFullYear()).slice(2)}`;

                const ledgerData = {
                    date: dateStr,
                    truck_no: trip.vehicles?.vehicle_number || '-',
                    station: trip.loads.station || trip.loads.pickup || '-',
                    gr: trip.loads.gr || '-',
                    weight: trip.loads.weight ? String(trip.loads.weight) : '-',
                    fright: String(trip.loads.fright || 0),
                    payment: String(trip.loads.payment || 0),
                    box: trip.loads.box || '-',
                    from_to: trip.loads.from_to || `${trip.loads.pickup} to ${trip.loads.drop_location}`,
                    bal: String(trip.loads.bal || 0),
                    sur: String(trip.loads.sur || 0),
                    shortage: String(trip.loads.shortage || 0)
                };
                await _supabase.from('ledger_entries').insert(ledgerData);
                console.log('Retroactively synced Trip 1 to ledger for April.');
                if (currentTab === 'ledger') loadLedgerData();
            }
        }
    } catch (err) {
        console.error('Retroactive sync error:', err);
    }
})();

window.onload = () => {
    applyRBAC();
    loadTabData('dashboard');
    checkForUpdates();
};

/* Live Auto-Calculation for Load Creation Balance */
const calculateLoadBalance = () => {
    const fNode = document.getElementById('loadFreight');
    const pNode = document.getElementById('loadPayment');
    const bNode = document.getElementById('loadBalance');
    if (fNode && pNode && bNode) {
        const freight = parseFloat(fNode.value) || 0;
        const payment = parseFloat(pNode.value) || 0;
        bNode.value = freight - payment;
    }
};
const lfInput = document.getElementById('loadFreight');
const lpInput = document.getElementById('loadPayment');
if (lfInput) lfInput.addEventListener('input', calculateLoadBalance);
if (lpInput) lpInput.addEventListener('input', calculateLoadBalance);
