// Hotel Mergera — small client-side helpers.
// No framework, no dependencies. Mobile menu, gallery filters, lightbox, language memory.

(() => {
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---- Mobile menu ----
  const menuToggle = $('[data-menu-toggle]');
  const menuPanel  = $('[data-menu-panel]');
  const menuClose  = $('[data-menu-close]');

  function openMenu() {
    if (!menuPanel) return;
    menuPanel.classList.remove('hidden');
    menuPanel.classList.add('flex');
    menuToggle?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeMenu() {
    if (!menuPanel) return;
    menuPanel.classList.add('hidden');
    menuPanel.classList.remove('flex');
    menuToggle?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
  menuToggle?.addEventListener('click', openMenu);
  menuClose?.addEventListener('click', closeMenu);
  menuPanel?.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') closeMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  // ---- Header shadow on scroll ----
  const header = $('[data-header]');
  if (header) {
    const onScroll = () => header.classList.toggle('shadow-nav', window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ---- Language dropdown (desktop header) ----
  const langDropdown = $('[data-lang-dropdown]');
  if (langDropdown) {
    const btn     = $('[data-lang-button]', langDropdown);
    const menu    = $('[data-lang-menu]', langDropdown);
    const chevron = $('[data-lang-chevron]', langDropdown);
    const openLang = () => {
      menu.classList.remove('hidden');
      menu.classList.add('animate-dropdownIn');
      btn.setAttribute('aria-expanded', 'true');
      chevron?.classList.add('rotate-180');
    };
    const closeLang = () => {
      menu.classList.add('hidden');
      menu.classList.remove('animate-dropdownIn');
      btn.setAttribute('aria-expanded', 'false');
      chevron?.classList.remove('rotate-180');
    };
    btn?.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.contains('hidden') ? openLang() : closeLang();
    });
    document.addEventListener('click', (e) => {
      if (!langDropdown.contains(e.target)) closeLang();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeLang();
    });
  }

  // ---- Language memory ----
  // Remember the user's last chosen language and offer it on the root index redirect.
  const langPills = $$('.lang-pill[hreflang]');
  langPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      try { localStorage.setItem('mergera-lang', pill.getAttribute('hreflang')); } catch (_) {}
    });
  });

  // ---- Gallery filters ----
  const filtersWrap = $('[data-gallery-filters]');
  const galleryGrid = $('[data-gallery-grid]');
  if (filtersWrap && galleryGrid) {
    filtersWrap.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-filter]');
      if (!btn) return;
      filtersWrap.querySelectorAll('button').forEach((b) => {
        b.classList.remove('is-active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('is-active');
      btn.setAttribute('aria-selected', 'true');
      const f = btn.dataset.filter;
      galleryGrid.querySelectorAll('[data-cat]').forEach((fig) => {
        fig.style.display = (f === 'all' || fig.dataset.cat === f) ? '' : 'none';
      });
    });
  }

  // ---- Hero slideshow (elegant crossfade on loop) ----
  const slideshow = $('[data-hero-slideshow]');
  if (slideshow) {
    const slides = $$('.hero-slide', slideshow);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (slides.length > 1 && !reduce) {
      let i = 0;
      setInterval(() => {
        slides[i].classList.replace('opacity-100', 'opacity-0');
        i = (i + 1) % slides.length;
        slides[i].classList.replace('opacity-0', 'opacity-100');
      }, 5500);
    }
  }

  // ---- Lightbox with prev/next navigation ----
  const overlay      = $('[data-lightbox-overlay]');
  const overlayImg   = $('[data-lightbox-img]');
  const overlayClose = $('[data-lightbox-close]');
  const overlayPrev  = $('[data-lightbox-prev]');
  const overlayNext  = $('[data-lightbox-next]');
  const overlayCount = $('[data-lightbox-counter]');
  if (overlay && overlayImg) {
    let group = [];   // currently navigable anchors
    let index = 0;

    const isVisible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

    const show = (i) => {
      if (!group.length) return;
      index = (i + group.length) % group.length; // wrap around
      const a = group[index];
      overlayImg.src = a.href;
      overlayImg.alt = a.querySelector('img')?.alt ?? '';
      if (overlayCount) overlayCount.textContent = `${index + 1} / ${group.length}`;
      const multi = group.length > 1;
      if (overlayPrev) overlayPrev.classList.toggle('hidden', !multi);
      if (overlayNext) overlayNext.classList.toggle('hidden', !multi);
    };

    const openLb = (clicked) => {
      // Build the group from all visible lightbox anchors (respects gallery filters).
      group = $$('a[data-lightbox]').filter(isVisible);
      const start = group.indexOf(clicked);
      show(start < 0 ? 0 : start);
      overlay.classList.remove('hidden');
      overlay.classList.add('flex');
      document.body.style.overflow = 'hidden';
    };
    const closeLb = () => {
      overlay.classList.add('hidden');
      overlay.classList.remove('flex');
      overlayImg.src = '';
      document.body.style.overflow = '';
    };

    $$('a[data-lightbox]').forEach((a) => {
      a.addEventListener('click', (e) => { e.preventDefault(); openLb(a); });
    });
    overlayPrev?.addEventListener('click', (e) => { e.stopPropagation(); show(index - 1); });
    overlayNext?.addEventListener('click', (e) => { e.stopPropagation(); show(index + 1); });
    overlayClose?.addEventListener('click', closeLb);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeLb(); });
    document.addEventListener('keydown', (e) => {
      if (overlay.classList.contains('hidden')) return;
      if (e.key === 'Escape') closeLb();
      else if (e.key === 'ArrowLeft') show(index - 1);
      else if (e.key === 'ArrowRight') show(index + 1);
    });
  }
})();
