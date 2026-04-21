/* renderer/js/router.js — SPA page navigation */
'use strict';

const navConfig = [
  { id: 'dashboard',    label: 'Dashboard',       icon: 'layout-dashboard' },
  
  { category: 'People', items: [
    { id: 'ledger',      label: 'Company Ledger',     icon: 'users' },
    { id: 'outsourcing', label: 'Suppliers (Outsource)', icon: 'truck' },
    { id: 'drivers',     label: 'Drivers',            icon: 'user-square' },
  ]},

  { category: 'Bookings', items: [
    { id: 'trips',       label: 'Bookings (Trips)',   icon: 'book' },
    { id: 'pending-trips',label: 'Booking Schedule', icon: 'calendar-days' },
  ]},

  { category: 'Financials', items: [
    { id: 'billing',     label: 'Bills & Invoices',   icon: 'file-text' },
    { id: 'expenses',    label: 'Expense Manager',    icon: 'banknote' },
  ]},


  { category: 'Vehicles', items: [
    { id: 'vehicles',    label: 'Vehicles',           icon: 'truck' },
  ]},

  { category: 'Misc', items: [
    { id: 'reports',     label: 'Reports',            icon: 'bar-chart' },
    { id: 'settings',    label: 'Settings',           icon: 'settings' },
  ]},
];

let currentPage = null;
const pageCallbacks = {}; // page id → { onEnter, onLeave }

function registerPage(id, { onEnter, onLeave } = {}) {
  if (onEnter) pageCallbacks[id] = { onEnter, onLeave };
}

function navigate(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  if (currentPage && pageCallbacks[currentPage]?.onLeave) {
    pageCallbacks[currentPage].onLeave();
  }

  const page = document.getElementById('page-' + pageId);
  if (!page) { console.error('Page not found:', pageId); return; }
  page.classList.add('active');

  const navItem = document.querySelector(`.nav-item[data-page="${pageId}"]`);
  if (navItem) navItem.classList.add('active');

  // Toggle global filter bar visibility
  const filterBar = document.getElementById('global-filter-bar');
  if (filterBar) {
    if (['settings', 'login'].includes(pageId)) {
      filterBar.style.display = 'none';
    } else {
      filterBar.style.display = 'flex';
    }
  }

  // Find item in nested config
  let item = navConfig.find(n => n.id === pageId);
  if (!item) {
    for (const cat of navConfig) {
      if (cat.items) {
        const found = cat.items.find(i => i.id === pageId);
        if (found) { item = found; break; }
      }
    }
  }

  const titleEl = document.getElementById('topbar-title');
  if (titleEl && item) titleEl.innerHTML = `<i data-lucide="${item.icon}" class="icon-inline"></i> ${item.label}`;

  currentPage = pageId;
  if (pageCallbacks[pageId]?.onEnter) pageCallbacks[pageId].onEnter();
  if (window.lucide) window.lucide.createIcons();
}

function initRouter() {
  const navContainer = document.getElementById('nav-items');
  if (!navContainer) return;

  let html = '';
  navConfig.forEach(node => {
    if (node.category) {
      html += `<div class="nav-category">${node.category}</div>`;
      node.items.forEach(item => {
        html += `
          <div class="nav-item" data-page="${item.id}" onclick="navigate('${item.id}')">
            <i data-lucide="${item.icon}" class="nav-icon"></i>
            <span>${item.label}</span>
          </div>`;
      });
    } else {
      html += `
        <div class="nav-item" data-page="${node.id}" onclick="navigate('${node.id}')">
          <i data-lucide="${node.icon}" class="nav-icon"></i>
          <span>${node.label}</span>
        </div>`;
    }
  });

  navContainer.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
  window.navigate = navigate;
  navigate('dashboard');
}

module.exports = { initRouter, navigate, registerPage, navConfig };
