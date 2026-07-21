'use strict';

const BOOK_PARTS = [];

const ui = {
  root: document.documentElement,
  chapters: document.getElementById('bookChapters'),
  toc: document.getElementById('toc'),
  sidebar: document.getElementById('sidebar'),
  menu: document.getElementById('menuButton'),
  theme: document.getElementById('themeButton'),
  print: document.getElementById('printButton'),
  progress: document.getElementById('progressBar'),
  top: document.getElementById('topButton'),
  search: document.getElementById('searchInput'),
  searchStatus: document.getElementById('searchStatus'),
  dialog: document.getElementById('searchDialog'),
  results: document.getElementById('searchResults'),
  closeSearch: document.getElementById('closeSearch')
};

function setTheme(theme) {
  ui.root.dataset.theme = theme;
  ui.theme.textContent = theme === 'dark' ? 'Tema claro' : 'Tema escuro';
  localStorage.setItem('pm-book-theme', theme);
}

function updateReadingPosition() {
  const max = document.documentElement.scrollHeight - innerHeight;
  const ratio = max > 0 ? scrollY / max : 0;
  ui.progress.style.width = `${Math.min(100, ratio * 100)}%`;
  ui.top.classList.toggle('visible', scrollY > 700);
  localStorage.setItem('pm-book-position', String(scrollY));
}

function initializeBook() {
  setTheme(localStorage.getItem('pm-book-theme') || 'light');
  const position = Number(localStorage.getItem('pm-book-position') || 0);
  if (!location.hash && position > 0) requestAnimationFrame(() => scrollTo(0, position));
}

ui.menu.addEventListener('click', () => {
  const open = ui.sidebar.classList.toggle('open');
  ui.menu.setAttribute('aria-expanded', String(open));
});
ui.theme.addEventListener('click', () => setTheme(ui.root.dataset.theme === 'dark' ? 'light' : 'dark'));
ui.print.addEventListener('click', () => print());
ui.top.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));
addEventListener('scroll', updateReadingPosition, { passive: true });
initializeBook();
