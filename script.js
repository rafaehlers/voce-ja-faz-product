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
  BOOK_PARTS.sort((a, b) => Number(a.id.split('-')[1]) - Number(b.id.split('-')[1]));
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
    { id: 'capa-imagem', title: 'Capa' },
    { id: 'capa', title: 'Folha de rosto' },
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

function findFirstTermOccurrence(entry) {
  const plural = entry[0].endsWith('s')
    ? ''
    : entry[0].match(/[^aeiou]y$/i)
      ? `${entry[0].slice(0, -1)}ies`
      : entry[0].match(/(x|z|ch|sh)$/i)
        ? `${entry[0]}es`
        : `${entry[0]}s`;
  const aliases = [entry[0], plural, entry[1]].filter(Boolean).sort((a, b) => b.length - a.length);
  const sections = document.querySelectorAll('.chapter:not(.part-opening):not(#capa-imagem):not(#capa):not(#capitulo-28)');

  for (const section of sections) {
    const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent || parent.closest('a, button, script, style, .term-popover, .chapter-navigation')) continue;

      for (const alias of aliases) {
        const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = node.textContent.match(new RegExp(`(^|[^\\p{L}\\p{N}_])(${escaped})(?![\\p{L}\\p{N}_])`, 'iu'));
        if (match) {
          const prefixLength = match[1].length;
          return { node, index: match.index + prefixLength, length: match[2].length, label: match[2] };
        }
      }
    }
  }
  return null;
}

function enhanceGlossaryTerms() {
  const orderedEntries = [...GLOSSARY].sort((a, b) => Math.max(b[0].length, b[1]?.length || 0) - Math.max(a[0].length, a[1]?.length || 0));
  const popover = document.createElement('aside');
  popover.id = 'termPopover';
  popover.className = 'term-popover';
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-modal', 'false');
  popover.setAttribute('aria-labelledby', 'termPopoverTitle');
  popover.hidden = true;
  document.body.append(popover);

  let activeTrigger = null;
  let hideTimer = 0;
  let suppressFocusOpen = false;

  const clearPendingHide = () => clearTimeout(hideTimer);
  const positionPopover = trigger => {
    const margin = 16;
    const gap = 10;
    const triggerRect = trigger.getBoundingClientRect();
    const width = Math.min(720, innerWidth - margin * 2);
    popover.style.width = `${width}px`;
    const height = popover.offsetHeight;
    const roomBelow = innerHeight - triggerRect.bottom - margin;
    const roomAbove = triggerRect.top - margin;
    const left = Math.min(innerWidth - width - margin, Math.max(margin, triggerRect.left + triggerRect.width / 2 - width / 2));
    const top = roomBelow >= height
      ? triggerRect.bottom + gap
      : roomAbove >= height
        ? triggerRect.top - height - gap
        : margin;
    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
  };
  const hidePopover = ({ restoreFocus = false } = {}) => {
    clearPendingHide();
    if (!activeTrigger) return;
    const previousTrigger = activeTrigger;
    previousTrigger.setAttribute('aria-expanded', 'false');
    activeTrigger = null;
    popover.hidden = true;
    if (restoreFocus) {
      suppressFocusOpen = true;
      previousTrigger.focus();
      suppressFocusOpen = false;
    }
  };
  const scheduleHide = () => {
    clearPendingHide();
    hideTimer = setTimeout(() => hidePopover(), 180);
  };
  const showPopover = (trigger, entry) => {
    clearPendingHide();
    if (activeTrigger && activeTrigger !== trigger) activeTrigger.setAttribute('aria-expanded', 'false');
    activeTrigger = trigger;
    trigger.setAttribute('aria-expanded', 'true');
    popover.innerHTML = termPopoverHtml(entry);
    popover.hidden = false;
    positionPopover(trigger);
    popover.querySelector('.term-popover-close').addEventListener('click', () => hidePopover({ restoreFocus: true }));
    popover.querySelector('a').addEventListener('click', () => hidePopover());
  };

  popover.addEventListener('pointerenter', clearPendingHide);
  popover.addEventListener('pointerleave', scheduleHide);
  popover.addEventListener('focusin', clearPendingHide);
  popover.addEventListener('focusout', event => {
    if (!popover.contains(event.relatedTarget)) scheduleHide();
  });

  orderedEntries.forEach(entry => {
    const occurrence = findFirstTermOccurrence(entry);
    if (!occurrence) return;

    const { node, index, length, label } = occurrence;
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'term-link';
    trigger.textContent = label;
    trigger.setAttribute('aria-label', `${label}: mostrar tradução e explicação`);
    trigger.setAttribute('aria-controls', 'termPopover');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.addEventListener('pointerenter', () => showPopover(trigger, entry));
    trigger.addEventListener('pointerleave', scheduleHide);
    trigger.addEventListener('focus', () => {
      if (!suppressFocusOpen) showPopover(trigger, entry);
    });
    trigger.addEventListener('blur', event => {
      if (!popover.contains(event.relatedTarget)) scheduleHide();
    });
    trigger.addEventListener('click', event => {
      event.stopPropagation();
      showPopover(trigger, entry);
      if (event.detail === 0) popover.querySelector('.term-popover-close').focus();
    });

    const before = node.textContent.slice(0, index);
    const after = node.textContent.slice(index + length);
    node.replaceWith(document.createTextNode(before), trigger, document.createTextNode(after));
  });

  document.addEventListener('pointerdown', event => {
    if (activeTrigger && !popover.contains(event.target) && event.target !== activeTrigger) hidePopover();
  });
  addEventListener('resize', () => { if (activeTrigger) positionPopover(activeTrigger); });
  addEventListener('scroll', () => { if (activeTrigger && !popover.matches(':hover')) hidePopover(); }, { passive: true });
  addEventListener('keydown', event => {
    if (event.key === 'Escape' && activeTrigger) hidePopover({ restoreFocus: true });
  });
}

function setupSectionObserver() {
  const links = new Map([...ui.toc.querySelectorAll('a')].map(link => [link.hash.slice(1), link]));
  const observer = new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    links.forEach(link => link.classList.remove('active'));
    const link = links.get(visible.target.id);
    if (link) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'location');
      links.forEach(other => { if (other !== link) other.removeAttribute('aria-current'); });
    }
  }, { rootMargin: '-20% 0px -65% 0px', threshold: [0, .15, .5] });
  document.querySelectorAll('.chapter').forEach(section => observer.observe(section));
}

function plainText(element) {
  return element.textContent.replace(/\s+/g, ' ').trim();
}

function runSearch(query) {
  const normalized = query.trim().toLocaleLowerCase('pt-BR');
  if (normalized.length < 2) {
    ui.searchStatus.textContent = '';
    ui.dialog.hidden = true;
    return;
  }
  const matches = [...document.querySelectorAll('.chapter')].flatMap(section => {
    const text = plainText(section);
    const lower = text.toLocaleLowerCase('pt-BR');
    const index = lower.indexOf(normalized);
    if (index < 0) return [];
    const start = Math.max(0, index - 72);
    const end = Math.min(text.length, index + normalized.length + 125);
    return [{ id: section.id, title: section.dataset.title || 'Seção', excerpt: `${start ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}` }];
  }).slice(0, 40);

  ui.searchStatus.textContent = `${matches.length} resultado${matches.length === 1 ? '' : 's'}`;
  ui.results.innerHTML = matches.length ? matches.map(item => `<a class="search-result" href="#${item.id}"><strong>${item.title}</strong><span>${item.excerpt}</span></a>`).join('') : '<p class="search-empty">Nenhuma ocorrência encontrada.</p>';
  ui.dialog.hidden = false;
}

function closeSearchDialog() {
  ui.dialog.hidden = true;
  ui.search.focus();
}

function initializeBook() {
  renderBook();
  enhanceGlossaryTerms();
  setupSectionObserver();
  setTheme(localStorage.getItem('pm-book-theme') || 'light');
  const position = Number(localStorage.getItem('pm-book-position') || 0);
  if (!location.hash && position > 0) requestAnimationFrame(() => scrollTo(0, position));
}

ui.menu.addEventListener('click', () => {
  const open = ui.sidebar.classList.toggle('open');
  ui.menu.setAttribute('aria-expanded', String(open));
});
ui.toc.addEventListener('click', event => {
  if (event.target.closest('a')) {
    ui.sidebar.classList.remove('open');
    ui.menu.setAttribute('aria-expanded', 'false');
  }
});
ui.theme.addEventListener('click', () => setTheme(ui.root.dataset.theme === 'dark' ? 'light' : 'dark'));
ui.print.addEventListener('click', () => print());
ui.top.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));
ui.search.addEventListener('input', event => runSearch(event.target.value));
ui.search.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeSearchDialog();
});
ui.results.addEventListener('click', event => {
  if (event.target.closest('a')) ui.dialog.hidden = true;
});
ui.closeSearch.addEventListener('click', closeSearchDialog);
ui.dialog.addEventListener('click', event => {
  if (event.target === ui.dialog) closeSearchDialog();
});
addEventListener('keydown', event => {
  if (event.key === 'Escape' && !ui.dialog.hidden) closeSearchDialog();
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    ui.search.focus();
  }
});
addEventListener('scroll', updateReadingPosition, { passive: true });
initializeBook();
