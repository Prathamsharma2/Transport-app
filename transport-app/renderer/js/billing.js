/* renderer/js/billing.js — Invoicing & Billing System */
'use strict';
const { supabase } = require('./supabase-client');
const { formatCurrency, formatDate, toast, refreshIcons } = require('./utils');

async function load() {
  await loadKPIs();
  await loadBillsTable();
  refreshIcons();
}

async function loadKPIs() {
  const container = document.getElementById('billing-kpi-grid');
  if (!container) return;

  try {
    const { data: trips, error } = await supabase.from('trips').select('billing_status, freight_amount');
    if (error) throw error;

    const billed = trips.filter(t => t.billing_status === 'Billed');
    const pending = trips.filter(t => t.billing_status === 'Pending' || !t.billing_status);
    
    const billedTotal  = billed.reduce((s, t) => s + parseFloat(t.freight_amount || 0), 0);
    const pendingTotal = pending.reduce((s, t) => s + parseFloat(t.freight_amount || 0), 0);

    container.innerHTML = `
      <div class="kpi-card" style="--kpi-color:var(--green);">
        <div class="kpi-label">Total Billed</div>
        <div class="kpi-value">${formatCurrency(billedTotal)}</div>
        <div class="kpi-sub">${billed.length} Invoices</div>
      </div>
      <div class="kpi-card" style="--kpi-color:var(--red);">
        <div class="kpi-label">Pending Invoices</div>
        <div class="kpi-value">${formatCurrency(pendingTotal)}</div>
        <div class="kpi-sub">${pending.length} Trips to Bill</div>
      </div>
    `;
  } catch(err) { console.error('Billing KPI Error:', err); }
}

async function loadBillsTable() {
  const tbody = document.getElementById('bills-body');
  if (!tbody) return;

  try {
    const sortVal = document.getElementById('billing-sort')?.value || 'trip_date-desc';
    const [col, dir] = sortVal.split('-');

    let q = supabase
      .from('trips')
      .select('*, companies(name)')
      .eq('billing_status', 'Billed')
      .order(col, { ascending: dir === 'asc' });

    const searchTerm = document.getElementById('billing-search')?.value.toLowerCase();
    if (searchTerm) {
      q = q.or(`bill_number.ilike.%${searchTerm}%,gr_number.ilike.%${searchTerm}%`);
    }

    const { data, error } = await q;

    if (error) throw error;

    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:40px;">No invoices generated yet. Go to Trip Management to create one.</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(t => `
      <tr>
        <td>${formatDate(t.trip_date)}</td>
        <td><strong>${t.bill_number || 'B-'+t.id}</strong></td>
        <td>${t.companies?.name || '—'}</td>
        <td class="td-amount">${formatCurrency(t.freight_amount)}</td>
        <td><span class="badge badge-green">Billed</span></td>
        <td>
          <button class="btn btn-ghost btn-xs" onclick="window.billingModule.openBillPreview(${t.id})"><i data-lucide="printer" class="icon-inline"></i> Reprint</button>
        </td>
      </tr>
    `).join('');
  } catch(err) { tbody.innerHTML = `<tr><td colspan="6" style="color:var(--red);">${err.message}</td></tr>`; }
}

/**
 * Core Printing Logic
 * Opens a new window with a professional Lorry Receipt (LR) format matching DHILLON ROADLINES style.
 */
async function openBillPreview(tripId) {
  try {
    const { data: t, error } = await supabase.from('trips')
      .select('*, vehicles(vehicle_number), drivers(name), companies(*)')
      .eq('id', tripId)
      .single();

    if (error) throw error;

    const billNo = t.bill_number || `DRL/LR/${t.id}`;
    if (t.billing_status !== 'Billed') {
      await supabase.from('trips').update({ billing_status: 'Billed', bill_number: billNo }).eq('id', tripId);
      if (window.billingModule) window.billingModule.load();
    }

    // Convert potential strings to numbers for safe math
    const freight = parseFloat(t.freight_amount || 0);
    const advance = parseFloat(t.advance_amount || 0);
    const weight = parseFloat(t.weight || 0);
    const biltyCharges = 20;
    const rate = weight > 0 ? (freight / weight) : 0;
    const totalDue = (freight + biltyCharges) - advance;

    // Use a hidden iframe for printing to avoid popup blockers
    let printFrame = document.getElementById('print-iframe');
    if (!printFrame) {
      printFrame = document.createElement('iframe');
      printFrame.id = 'print-iframe';
      printFrame.style.display = 'none';
      document.body.appendChild(printFrame);
    }

    const html = `
      <html>
      <head>
        <title>LR - ${billNo}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
          body { font-family: 'Inter', sans-serif; padding: 10px; color: #000; background: #fff; line-height: 1.2; }
          .lr-container { border: 2px solid #000; padding: 15px; max-width: 900px; margin: auto; position: relative; }
          
          /* Header Section */
          .header-row { display: flex; align-items: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 15px; }
          .logo-box { width: 85px; height: 85px; border: 2px solid #000; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; font-size: 9px; font-weight: 900; margin-right: 15px; }
          .logo-box strong { font-size: 22px; display: block; margin-bottom: -3px; }
          
          .co-info { flex: 1; text-align: center; }
          .co-name { font-size: 42px; font-weight: 900; color: #dc2626; margin: 0; line-height: 0.9; letter-spacing: -1px; }
          .co-tagline { font-size: 14px; font-weight: 800; color: #1e40af; margin-top: 6px; text-transform: uppercase; }
          .co-addr { font-size: 10px; font-weight: 700; color: #334155; margin-top: 4px; }
          
          .header-meta { text-align: right; font-size: 10px; font-weight: 800; line-height: 1.4; width: 220px; }
          
          /* Body Grid */
          .main-grid { display: grid; grid-template-columns: 1.5fr 1fr; border: 1px solid #000; margin-bottom: 10px; }
          .grid-col { border-right: 1px solid #000; }
          .grid-col:last-child { border-right: none; }
          
          .entry-box { border-bottom: 1px solid #000; padding: 5px 8px; min-height: 35px; }
          .entry-box:last-child { border-bottom: none; }
          .e-label { font-size: 9px; font-weight: 900; color: #475569; text-transform: uppercase; display: block; margin-bottom: 2px; }
          .e-val { font-size: 13px; font-weight: 700; color: #000; }
          
          .blue-strip { background: #1e40af; color: #fff; text-align: center; font-size: 10px; font-weight: 900; padding: 3px; }
          .red-serial { color: #dc2626; font-size: 20px; font-weight: 900; text-align: center; padding: 5px; background: #fef2f2; border: 1px solid #fee2e2; }

          /* Table */
          .lr-table { width: 100%; border-collapse: collapse; border: 1px solid #000; margin-bottom: 10px; }
          .lr-table th { border: 1px solid #000; padding: 5px; font-size: 9px; font-weight: 900; background: #f8fafc; }
          .lr-table td { border: 1px solid #000; padding: 10px; font-size: 13px; font-weight: 700; vertical-align: top; }
          
          .mid-section { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
          .info-box { border: 1px solid #000; padding: 8px; font-size: 9px; line-height: 1.3; }
          .info-box strong { text-decoration: underline; }
          
          /* Footer Calc */
          .footer-flex { display: flex; border: 1px solid #000; }
          .bank-dtls { flex: 1.5; border-right: 1px solid #000; padding: 8px; font-size: 10px; }
          .calc-dtls { flex: 1; }
          .calc-item { display: flex; justify-content: space-between; padding: 4px 10px; border-bottom: 1px solid #000; font-size: 11px; font-weight: 800; }
          .calc-item:last-child { border-bottom: none; background: #fef2f2; font-size: 13px; color: #dc2626; }

          .sign-row { display: flex; justify-content: space-between; margin-top: 25px; padding: 0 15px; font-size: 10px; font-weight: 800; }
          .sign-area { border-top: 1px solid #000; width: 180px; text-align: center; padding-top: 5px; }
          
          .tax-stamp { position: absolute; left: -25px; top: 120px; color: #dc2626; font-size: 12px; font-weight: 900; transform: rotate(-90deg); opacity: 0.8; }

          @media print {
            .no-print { display: none !important; }
            body { padding: 0; }
            .lr-container { border: 2px solid #000 !important; width: 100%; max-width: 100%; margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="lr-container">
          <div class="tax-stamp">SALE TAX COPY</div>
          
          <div class="header-row">
            <div class="logo-box">
              ALWAR
              <strong>DRL</strong>
              ROADLINES
            </div>
            <div class="co-info">
              <h1 class="co-name">DHILLON ROADLINES</h1>
              <p class="co-tagline">Fleet Owners & Transport Contractors</p>
              <p class="co-addr">Bhakthal Ki Choki, M.I.A. Main Road, Alwar - 301030 (Raj.)</p>
            </div>
            <div class="header-meta">
              Mob: 8239301111, 9461998295<br>
              GSTIN: 08CLPPS9775N1ZM<br>
              PAN No: CLPPS9775N<br>
              RTO Reg: RJ02-CR ACT-2017-0032
            </div>
          </div>

          <div class="main-grid">
            <div class="grid-col">
               <div class="entry-box">
                 <span class="e-label">Consignor (From):</span>
                 <span class="e-val">${t.consignor || t.companies?.name || '—'}</span>
               </div>
               <div class="entry-box" style="height:50px;">
                 <span class="e-label">Consignee (To):</span>
                 <span class="e-val">${t.consignee || '—'}</span>
               </div>
               <div class="entry-box">
                 <span class="e-label">Delivery At:</span>
                 <span class="e-val">${t.end_location || '—'}</span>
               </div>
            </div>
            <div class="grid-col">
               <div class="blue-strip">LORRY NO.</div>
               <div class="e-val" style="text-align:center; padding:5px; font-size:16px;">${t.vehicles?.vehicle_number || '—'}</div>
               <div class="blue-strip" style="background:#dc2626;">SERIAL NO. / LR NO.</div>
               <div class="red-serial">${t.id + 5000}</div>
               <div class="blue-strip">DATE</div>
               <div class="e-val" style="text-align:center; padding:5px;">${formatDate(t.trip_date)}</div>
            </div>
          </div>

          <table class="lr-table">
            <thead>
              <tr>
                <th width="12%">No. PKGS</th>
                <th width="48%">DESCRIPTION (Said to contain)</th>
                <th width="15%">WEIGHT (ACT)</th>
                <th width="12%">RATE</th>
                <th width="13%">AMOUNT (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr style="height:150px;">
                <td style="text-align:center;">1</td>
                <td>
                  <div style="font-size:14px;">${t.goods_description || 'General Cargo'}</div>
                  <div style="font-size:10px; margin-top:8px; color:#64748b;">GR NO: ${t.gr_number || '—'}</div>
                </td>
                <td style="text-align:center;">${weight || '—'} kg</td>
                <td style="text-align:center;">${rate.toFixed(2)}</td>
                <td style="text-align:right;">${freight.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>

          <div class="mid-section">
            <div class="info-box">
              <strong>INSURANCE</strong><br>
              The customer has stated that -<br>
              - He has NOT insured the consignment<br>
              - He HAS insured the consignment<br>
              Company: __________________________<br>
              Policy No: ____________ Date: ________
            </div>
            <div class="info-box">
              <strong>DECLARATION</strong><br>
              The Consignor hereby expressly declares that the particulars furnished by him or his agents in the forwarding note are correct. No prohibited articles are included and he accepts the conditions of carriage at Owner's Risk.
            </div>
          </div>

          <div class="footer-flex">
            <div class="bank-dtls">
               <div style="font-weight:900; margin-bottom:4px;">BANK DETAILS: DHILLON ROADLINES</div>
               HDFC Bank, M.I.A., Alwar<br>
               A/c No: <strong>28557763000000598</strong><br>
               IFSC: <strong>HDFC0002857</strong><br>
               <div style="font-size:9px; margin-top:8px;">* GST Tax will be paid by Consignor/Consignee as applicable.</div>
            </div>
            <div class="calc-dtls">
              <div class="calc-item"><span>Freight</span> <span>${freight.toLocaleString('en-IN')}</span></div>
              <div class="calc-item"><span>Bilty Charges</span> <span>20.00</span></div>
              <div class="calc-item" style="color:#22c55e;"><span>Advance</span> <span>-${advance.toLocaleString('en-IN')}</span></div>
              <div class="calc-item"><span>TOTAL DUE</span> <span>₹ ${totalDue.toLocaleString('en-IN')}</span></div>
            </div>
          </div>

          <div class="sign-row">
            <div class="sign-area">Signature of Consignor</div>
            <div class="sign-area" style="border:none; text-align:right;">
               For <strong>DHILLON ROADLINES</strong><br><br><br>
               <span style="border-top:1px solid #000; padding:5px 20px;">Auth. Signatory</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const doc = printFrame.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    // Wait for content (especially Google Fonts) to load before printing
    setTimeout(() => {
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();
    }, 500);
  } catch(err) {
    toast('Printing failed: ' + err.message, 'error');
  }
}


/**
 * Manual Bill Creation
 */
async function openManualBillModal() {
  try {
    const { data: cos, error } = await supabase.from('companies').select('id,name').order('name');
    if (error) throw error;
    
    const coOpts = (cos || []).map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    
    const d = new Date();
    const yr = d.getFullYear().toString().slice(-2);
    const rand = Math.floor(1000 + Math.random() * 9000);
    const suggestedBillNo = `MB/${yr}/${rand}`;

    const html = `
      <div class="modal-overlay" id="manual-bill-modal" onclick="if(event.target.id==='manual-bill-modal')window.billingModule.closeBillingModal()">
        <div class="modal modal-lg">
          <div class="modal-header">
            <span class="modal-title"><i data-lucide="file-plus" class="icon-inline"></i> Create Manual Bill</span>
            <button class="modal-close" onclick="window.billingModule.closeBillingModal()">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-grid">
              <div class="form-group"><label class="form-label">Bill Number</label><input class="form-control" id="mb-no" value="${suggestedBillNo}"></div>
              <div class="form-group"><label class="form-label">Billing Date</label><input class="form-control" type="date" id="mb-date" value="${new Date().toISOString().split('T')[0]}"></div>
              <div class="form-group"><label class="form-label">Company / Party</label><select class="form-control" id="mb-company"><option value="">Select Company</option>${coOpts}</select></div>
              <div class="form-group"><label class="form-label">Freight Amount (₹)</label><input class="form-control" type="number" id="mb-amount" placeholder="0"></div>
              <div class="form-group"><label class="form-label">Consignor</label><input class="form-control" id="mb-consignor" placeholder="Sender Name"></div>
              <div class="form-group"><label class="form-label">Consignee</label><input class="form-control" id="mb-consignee" placeholder="Receiver Name"></div>
              <div class="form-group"><label class="form-label">From Location</label><input class="form-control" id="mb-from" placeholder="Origin"></div>
              <div class="form-group"><label class="form-label">To Location</label><input class="form-control" id="mb-to" placeholder="Destination"></div>
              <div class="form-group form-full"><label class="form-label">Goods Description</label><textarea class="form-control" id="mb-goods" placeholder="Items..."></textarea></div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="window.billingModule.closeBillingModal()">Cancel</button>
            <button class="btn btn-primary" onclick="window.billingModule.saveManualBill()">Generate & Save Bill</button>
          </div>
        </div>
      </div>`;
    
    const container = document.getElementById('billing-modal-container');
    if (!container) throw new Error('Billing modal container not found in DOM');
    
    container.innerHTML = html;
    refreshIcons();
  } catch(err) {
    toast('Modal Error: ' + err.message, 'error');
  }
}

async function saveManualBill() {
  const payload = {
    trip_date: document.getElementById('mb-date').value,
    bill_number: document.getElementById('mb-no').value.trim(),
    company_id: document.getElementById('mb-company').value || null,
    freight_amount: parseFloat(document.getElementById('mb-amount').value) || 0,
    consignor: document.getElementById('mb-consignor').value.trim(),
    consignee: document.getElementById('mb-consignee').value.trim(),
    start_location: document.getElementById('mb-from').value.trim(),
    end_location: document.getElementById('mb-to').value.trim(),
    goods_description: document.getElementById('mb-goods').value.trim(),
    billing_status: 'Billed',
    status: 'Completed', // Manual bills are usually completed services
    trip_type: 'manual'
  };

  if (!payload.bill_number || !payload.freight_amount) {
    toast('Bill Number and Amount are required', 'warning');
    return;
  }

  try {
    const { data, error } = await supabase.from('trips').insert([payload]).select().single();
    if (error) throw error;
    
    closeBillingModal();
    toast('Manual bill created successfully ✓');
    load(); // Reload table and KPIs
    
    // Optionally open print preview immediately
    openBillPreview(data.id);
  } catch(err) {
    toast(err.message, 'error');
  }
}

function closeBillingModal() {
  const el = document.getElementById('manual-bill-modal');
  if (el) el.remove();
}

module.exports = { load, openBillPreview, openManualBillModal, saveManualBill, closeBillingModal };
