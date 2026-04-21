/* renderer/js/utils.js — Shared helpers, formatters, toast notifications */
'use strict';

// ── Currency Formatter ──────────────────────────────────────
function formatCurrency(amount) {
  const n = parseFloat(amount) || 0;
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// ── Date Formatters ─────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateShort(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function firstDayOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
}

// ── Toast Notifications ─────────────────────────────────────
function toast(message, type = 'success', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  const iconMap = { success: '<i data-lucide="check-circle" class="icon-inline"></i>', error: '❌', warning: '⚠️', info: 'ℹ️' };
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${iconMap[type] || ''}</span><span>${message}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(24px)';
    el.style.transition = 'all 0.3s ease';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// ── Profit Color Class ───────────────────────────────────────
function profitClass(value) {
  const n = parseFloat(value) || 0;
  if (n > 0) return 'profit-positive';
  if (n < 0) return 'profit-negative';
  return 'profit-zero';
}

// ── Status Badge HTML ────────────────────────────────────────
function statusBadge(status) {
  if (!status) return '<span class="badge badge-gray">—</span>';
  const s = status.toLowerCase();
  let cls = 'badge-gray';
  if (['completed','paid','available','active'].includes(s)) cls = 'badge-green';
  else if (['pending','in progress','inprogress'].includes(s)) cls = 'badge-yellow';
  else if (['assigned','partial'].includes(s)) cls = 'badge-blue';
  else if (['cancelled','maintenance','overdue'].includes(s)) cls = 'badge-red';
  else if (['outsourced','inbound','outbound'].includes(s)) cls = 'badge-purple';
  return `<span class="badge ${cls}">${status}</span>`;
}

// ── Debounce ────────────────────────────────────────────────
function debounce(fn, ms = 300) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

// ── Build Query with Filters ─────────────────────────────────
function applyFilters(query, filters, tableAlias = '') {
  const pre = tableAlias ? tableAlias + '.' : '';
  if (filters.companyId) query = query.eq(`${pre}company_id`, filters.companyId);
  if (filters.vehicleId) query = query.eq(`${pre}vehicle_id`, filters.vehicleId);
  if (filters.status)    query = query.eq(`${pre}status`, filters.status);
  if (filters.dateFrom)  query = query.gte(`${pre}trip_date`, filters.dateFrom);
  if (filters.dateTo)    query = query.lte(`${pre}trip_date`, filters.dateTo);
  return query;
}

// ── Pagination Helper ────────────────────────────────────────
const PAGE_SIZE = 25;
function getRange(page) {
  const from = (page - 1) * PAGE_SIZE;
  return { from, to: from + PAGE_SIZE - 1 };
}

// ── Render Paginator ─────────────────────────────────────────
function renderPagination(containerId, total, currentPage, onPageChange) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const start = (currentPage - 1) * PAGE_SIZE + 1;
  const end = Math.min(currentPage * PAGE_SIZE, total);

  let btnHtml = '';
  for (let i = 1; i <= Math.min(totalPages, 7); i++) {
    btnHtml += `<button class="${i === currentPage ? 'active' : ''}" onclick="(${onPageChange.toString()})(${i})">${i}</button>`;
  }
  if (totalPages > 7) btnHtml += `<button disabled>...</button>`;

  el.innerHTML = `
    <span>${total === 0 ? 'No records' : `Showing ${start}\u2013${end} of ${total}`}</span>
    <div class="pagination-btns">
      <button onclick="(${onPageChange.toString()})(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>\u2039 Prev</button>
      ${btnHtml}
      <button onclick="(${onPageChange.toString()})(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>Next \u203a</button>
    </div>
  `;
}

// ── Export Table to CSV ──────────────────────────────────────
function exportTableToCSV(tableId, filename) {
  const table = document.getElementById(tableId);
  if (!table) return;
  const rows = [...table.querySelectorAll('tr')];
  const csv = rows.map(r =>
    [...r.querySelectorAll('th, td')].map(c => `"${c.innerText.replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename || 'export.csv';
  a.click(); URL.revokeObjectURL(url);
}

// ── Confirm Dialog ───────────────────────────────────────────
function confirmAction(message) {
  return confirm(message);
}

// ── Icon Helper ──────────────────────────────────────────────
function refreshIcons() {
  if (typeof lucide !== 'undefined' && lucide.createIcons) {
    lucide.createIcons();
  }
}

// ── Compact Number Formatter (with Lakhs support) ────────────
function formatCompactNumber(value) {
  const n = parseFloat(value) || 0;
  const absN = Math.abs(n);
  if (absN >= 10000000) return (n / 10000000).toFixed(2).replace(/\.00$/, '') + 'Cr';
  if (absN >= 100000)  return (n / 100000).toFixed(1).replace(/\.0$/, '') + 'L';
  if (absN >= 1000)    return (n / 1000).toFixed(0) + 'K';
  return n.toLocaleString('en-IN');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

module.exports = {
  formatCurrency, formatDate, formatDateShort, todayISO, firstDayOfMonth,
  toast, profitClass, statusBadge, debounce, applyFilters,
  getRange, PAGE_SIZE, renderPagination, exportTableToCSV, confirmAction,
  refreshIcons, formatCompactNumber, closeModal
};
