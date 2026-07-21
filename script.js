'use strict';

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

function renderBook() {
  document.getElementById('abertura').innerHTML = openingContent;
  document.getElementById('introducao').innerHTML = introductionContent;
  document.getElementById('conclusao').innerHTML = conclusionContent;

  ui.chapters.innerHTML = BOOK_PARTS.map(part => `
    <section id="${part.id}" class="part-opening chapter" data-title="${part.title}">
      <p class="chapter-kicker">${part.title.split(' — ')[0]}</p>
      <h2>${part.title.split(' — ')[1]}</h2>
    </section>
    ${part.chapters.map((chapter, index) => {
      const previous = index > 0 ? part.chapters[index - 1] : null;
      const next = index < part.chapters.length - 1 ? part.chapters[index + 1] : null;
      return `<section id="${chapter.id}" class="chapter" data-title="Capítulo ${chapter.number} — ${chapter.title}">
        <header class="chapter-opening"><p class="chapter-kicker">Capítulo ${String(chapter.number).padStart(2, '0')}</p><h2>${chapter.title}</h2></header>
        ${chapter.content}
        ${CHAPTER_NOTEBOOKS[chapter.id] || ''}
        <nav class="chapter-navigation" aria-label="Navegação entre capítulos">
          ${previous ? `<a href="#${previous.id}">← ${previous.title}</a>` : '<span></span>'}
          ${next ? `<a href="#${next.id}">${next.title} →</a>` : '<span></span>'}
        </nav>
      </section>`;
    }).join('')}
  `).join('');

  const tocItems = [
    { id: 'capa', title: 'Capa' },
    { id: 'abertura', title: 'Nota ao leitor' },
    { id: 'introducao', title: 'Introdução' },
    ...BOOK_PARTS.flatMap(part => [
      { id: part.id, title: part.title, part: true },
      ...part.chapters.map(chapter => ({ id: chapter.id, title: `${chapter.number}. ${chapter.title}` }))
    ]),
    { id: 'conclusao', title: 'Conclusão', part: true }
  ];
  ui.toc.innerHTML = tocItems.map(item => `<a href="#${item.id}"${item.part ? ' class="part-link"' : ''}>${item.title}</a>`).join('');
}

function initializeBook() {
  renderBook();
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
