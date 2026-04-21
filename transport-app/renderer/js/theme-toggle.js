/* renderer/js/theme-toggle.js */
'use strict';

function initTheme() {
  const savedTheme = localStorage.getItem('app-theme') || 'theme-light';
  document.body.className = savedTheme;
  updateButtons(savedTheme);

  document.getElementById('theme-light-btn')?.addEventListener('click', () => setTheme('theme-light'));
  document.getElementById('theme-dark-btn')?.addEventListener('click', () => setTheme('theme-dark'));
}

function setTheme(theme) {
  document.body.className = theme;
  localStorage.setItem('app-theme', theme);
  updateButtons(theme);
}

function updateButtons(theme) {
  const lightBtn = document.getElementById('theme-light-btn');
  const darkBtn  = document.getElementById('theme-dark-btn');
  if (!lightBtn || !darkBtn) return;

  if (theme === 'theme-light') {
    lightBtn.className = 'btn btn-secondary';
    darkBtn.className  = 'btn btn-ghost';
  } else {
    lightBtn.className = 'btn btn-ghost';
    darkBtn.className  = 'btn btn-secondary';
  }
}

module.exports = { initTheme };
