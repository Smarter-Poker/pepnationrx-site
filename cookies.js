/* PepNationRx — cookie consent banner + preferences modal
 * Vanilla JS, design-system aware, light + dark, a11y first.
 * Public API:
 *   window.pnrx.cookies.open()    -> open preferences modal
 *   window.pnrx.cookies.reset()   -> clear stored consent & show banner
 *   window.pnrx.cookies.get()     -> read current consent {version, ts, categories}
 *   window.pnrx.cookies.set(cats) -> programmatic write (used internally)
 * Storage key: localStorage['pnrx-cookie-consent']
 *   { version:1, ts:<epoch ms>, categories:{essential,functional,analytics,marketing} }
 * Essential is always true; theme preference (pnrx-theme) is "Functional".
 * Future trackers MUST gate on window.pnrx.cookies.get().categories.analytics etc.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'pnrx-cookie-consent';
  var VERSION = 1;
  var pnrx = (window.pnrx = window.pnrx || {});

  /* ---------- storage ------------------------------------------------------ */
  function read() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var v = JSON.parse(raw);
      if (!v || v.version !== VERSION) return null;
      v.categories = Object.assign(
        { essential: true, functional: false, analytics: false, marketing: false },
        v.categories || {}
      );
      v.categories.essential = true;
      return v;
    } catch (e) { return null; }
  }
  function write(cats) {
    var payload = {
      version: VERSION,
      ts: Date.now(),
      categories: {
        essential: true,
        functional: !!cats.functional,
        analytics: !!cats.analytics,
        marketing: !!cats.marketing
      }
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch (e) {}
    dispatch(payload);
    return payload;
  }
  function dispatch(payload) {
    try {
      window.dispatchEvent(new CustomEvent('pnrx:cookie-consent', { detail: payload }));
    } catch (e) {}
  }

  /* ---------- styles ------------------------------------------------------- */
  var CSS = [
    '.pnrx-cookie-bar{position:fixed;left:16px;right:16px;bottom:16px;z-index:9000;',
    'background:var(--pnrx-color-surface);color:var(--pnrx-color-fg);',
    'border:1px solid var(--pnrx-color-border);border-radius:var(--pnrx-radius-lg,18px);',
    'box-shadow:var(--pnrx-shadow-lift);padding:18px 20px;',
    'display:flex;flex-wrap:wrap;align-items:center;gap:14px;',
    'font-family:var(--pnrx-font-body,inherit);max-width:1100px;margin:0 auto}',
    '.pnrx-cookie-bar__copy{flex:1 1 320px;min-width:260px}',
    '.pnrx-cookie-bar__title{font-weight:800;font-size:15px;margin:0 0 4px;color:var(--pnrx-color-fg)}',
    '.pnrx-cookie-bar__body{font-size:13px;line-height:1.55;color:var(--pnrx-color-fg-muted);margin:0}',
    '.pnrx-cookie-bar__body a{color:var(--pnrx-color-primary);text-decoration:underline}',
    '.pnrx-cookie-bar__actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}',
    '.pnrx-cookie-btn{appearance:none;border:0;cursor:pointer;font-family:inherit;',
    'font-weight:700;font-size:13px;line-height:1;padding:10px 14px;border-radius:var(--pnrx-radius-sm,8px);',
    'transition:transform .15s,box-shadow .15s,background .15s}',
    '.pnrx-cookie-btn:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(8,145,178,.35)}',
    '.pnrx-cookie-btn--primary{background:linear-gradient(145deg,var(--pnrx-color-secondary),var(--pnrx-color-primary-deep));color:#fff}',
    '.pnrx-cookie-btn--primary:hover{transform:translateY(-1px)}',
    '.pnrx-cookie-btn--ghost{background:transparent;color:var(--pnrx-color-fg);',
    'box-shadow:inset 0 0 0 1.5px var(--pnrx-color-border)}',
    '.pnrx-cookie-btn--ghost:hover{background:var(--pnrx-color-surface-tint)}',
    '.pnrx-cookie-btn--link{background:transparent;color:var(--pnrx-color-primary);text-decoration:underline;padding:10px 6px}',
    '.pnrx-cookie-overlay{position:fixed;inset:0;z-index:9100;background:rgba(8,24,30,.55);',
    'display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)}',
    '.pnrx-cookie-modal{background:var(--pnrx-color-surface);color:var(--pnrx-color-fg);',
    'width:100%;max-width:560px;max-height:calc(100vh - 40px);overflow:auto;',
    'border:1px solid var(--pnrx-color-border);border-radius:var(--pnrx-radius-xl,22px);',
    'box-shadow:var(--pnrx-shadow-lift);padding:24px 24px 18px}',
    '.pnrx-cookie-modal__head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:8px}',
    '.pnrx-cookie-modal__title{font-size:19px;font-weight:800;color:var(--pnrx-color-fg);margin:0}',
    '.pnrx-cookie-modal__intro{font-size:13px;color:var(--pnrx-color-fg-muted);line-height:1.55;margin:0 0 14px}',
    '.pnrx-cookie-modal__close{appearance:none;background:transparent;border:0;color:var(--pnrx-color-fg-muted);',
    'font-size:22px;line-height:1;cursor:pointer;padding:4px 8px;border-radius:8px}',
    '.pnrx-cookie-modal__close:hover{background:var(--pnrx-color-surface-tint);color:var(--pnrx-color-fg)}',
    '.pnrx-cookie-modal__close:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(8,145,178,.35)}',
    '.pnrx-cookie-cat{border:1px solid var(--pnrx-color-border);border-radius:var(--pnrx-radius-md,14px);',
    'padding:14px 14px 12px;margin-bottom:10px;background:var(--pnrx-color-bg)}',
    '.pnrx-cookie-cat__head{display:flex;align-items:center;justify-content:space-between;gap:12px}',
    '.pnrx-cookie-cat__name{font-weight:700;font-size:14px;color:var(--pnrx-color-fg);margin:0}',
    '.pnrx-cookie-cat__locked{font-size:11px;color:var(--pnrx-color-fg-subtle);font-weight:600;text-transform:uppercase;letter-spacing:.06em}',
    '.pnrx-cookie-cat__desc{font-size:12.5px;color:var(--pnrx-color-fg-muted);line-height:1.5;margin:6px 0 0}',
    '.pnrx-cookie-switch{position:relative;display:inline-block;width:38px;height:22px;flex-shrink:0}',
    '.pnrx-cookie-switch input{opacity:0;width:0;height:0;position:absolute}',
    '.pnrx-cookie-switch__slider{position:absolute;cursor:pointer;inset:0;background:var(--pnrx-color-border);',
    'border-radius:999px;transition:background .2s}',
    '.pnrx-cookie-switch__slider::before{content:"";position:absolute;height:16px;width:16px;left:3px;top:3px;',
    'background:#fff;border-radius:50%;transition:transform .2s}',
    '.pnrx-cookie-switch input:checked + .pnrx-cookie-switch__slider{background:var(--pnrx-color-primary)}',
    '.pnrx-cookie-switch input:checked + .pnrx-cookie-switch__slider::before{transform:translateX(16px)}',
    '.pnrx-cookie-switch input:focus-visible + .pnrx-cookie-switch__slider{box-shadow:0 0 0 3px rgba(8,145,178,.35)}',
    '.pnrx-cookie-switch input:disabled + .pnrx-cookie-switch__slider{opacity:.7;cursor:not-allowed}',
    '.pnrx-cookie-modal__actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;margin-top:14px}',
    '@media (max-width:560px){',
      '.pnrx-cookie-bar{padding:16px;left:12px;right:12px;bottom:12px}',
      '.pnrx-cookie-bar__actions{width:100%;justify-content:flex-end}',
      '.pnrx-cookie-modal__actions{justify-content:stretch}',
      '.pnrx-cookie-modal__actions .pnrx-cookie-btn{flex:1 1 auto}',
    '}'
  ].join('');

  function injectStyles() {
    if (document.getElementById('pnrx-cookie-styles')) return;
    var s = document.createElement('style');
    s.id = 'pnrx-cookie-styles';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ---------- copy --------------------------------------------------------- */
  var CATEGORIES = [
    {
      key: 'essential',
      name: 'Essential',
      locked: true,
      desc: 'Required for the site to work — session, sign-in, security, load-balancing, and remembering choices you make during the same visit. Always on.'
    },
    {
      key: 'functional',
      name: 'Functional',
      locked: false,
      desc: 'Remembers preferences such as your light or dark theme between visits. Turning this off will reset preferences each time you return.'
    },
    {
      key: 'analytics',
      name: 'Analytics',
      locked: false,
      desc: 'Helps us understand which pages are useful so we can improve the experience. We do not currently run analytics; this control will gate any future analytics that are added.'
    },
    {
      key: 'marketing',
      name: 'Marketing',
      locked: false,
      desc: 'Used to measure ad performance and to support targeted advertising on other sites. We do not currently run marketing tags; this control will gate any future marketing tools.'
    }
  ];

  /* ---------- DOM helpers -------------------------------------------------- */
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (k === 'class') n.className = attrs[k];
        else if (k === 'html') n.innerHTML = attrs[k];
        else if (k.indexOf('on') === 0 && typeof attrs[k] === 'function') n.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] === true) n.setAttribute(k, '');
        else if (attrs[k] != null && attrs[k] !== false) n.setAttribute(k, attrs[k]);
      }
    }
    (children || []).forEach(function (c) {
      if (c == null) return;
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return n;
  }

  /* ---------- banner ------------------------------------------------------- */
  var bar = null;
  function renderBar() {
    if (bar) return;
    injectStyles();
    bar = el('div', {
      'class': 'pnrx-cookie-bar',
      'role': 'region',
      'aria-label': 'Cookie consent',
      'data-pnrx-cookie-bar': true
    }, [
      el('div', { 'class': 'pnrx-cookie-bar__copy' }, [
        el('p', { 'class': 'pnrx-cookie-bar__title' }, ['We value your privacy']),
        el('p', { 'class': 'pnrx-cookie-bar__body', 'html':
          'We use a small set of cookies to run this site, remember your preferences, and — if you allow it — to measure how it is used. Read our <a href="privacy.html">Privacy Policy</a> and <a href="consumer-health-data-privacy.html">Consumer Health Data Privacy Policy</a>.'
        })
      ]),
      el('div', { 'class': 'pnrx-cookie-bar__actions' }, [
        el('button', {
          'class': 'pnrx-cookie-btn pnrx-cookie-btn--ghost',
          'type': 'button',
          'onclick': function () { openModal(); }
        }, ['Customize']),
        el('button', {
          'class': 'pnrx-cookie-btn pnrx-cookie-btn--ghost',
          'type': 'button',
          'onclick': function () { rejectAll(); }
        }, ['Reject non-essential']),
        el('button', {
          'class': 'pnrx-cookie-btn pnrx-cookie-btn--primary',
          'type': 'button',
          'onclick': function () { acceptAll(); }
        }, ['Accept all'])
      ])
    ]);
    document.body.appendChild(bar);
  }
  function removeBar() {
    if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
    bar = null;
  }

  /* ---------- modal -------------------------------------------------------- */
  var overlay = null;
  var lastFocus = null;
  var keydownHandler = null;

  function buildCategoryRow(cat, current) {
    var inputAttrs = {
      'type': 'checkbox',
      'data-pnrx-cat': cat.key,
      'aria-describedby': 'pnrx-cookie-desc-' + cat.key
    };
    if (cat.locked) { inputAttrs.checked = true; inputAttrs.disabled = true; }
    else if (current[cat.key]) inputAttrs.checked = true;

    return el('div', { 'class': 'pnrx-cookie-cat' }, [
      el('div', { 'class': 'pnrx-cookie-cat__head' }, [
        el('p', { 'class': 'pnrx-cookie-cat__name' }, [cat.name]),
        cat.locked
          ? el('span', { 'class': 'pnrx-cookie-cat__locked' }, ['Always on'])
          : el('label', { 'class': 'pnrx-cookie-switch', 'aria-label': cat.name + ' cookies' }, [
              el('input', inputAttrs),
              el('span', { 'class': 'pnrx-cookie-switch__slider' })
            ])
      ]),
      el('p', { 'class': 'pnrx-cookie-cat__desc', 'id': 'pnrx-cookie-desc-' + cat.key }, [cat.desc])
    ]);
  }

  function openModal() {
    injectStyles();
    if (overlay) return;
    var current = (read() || {}).categories || { essential: true, functional: true, analytics: false, marketing: false };
    lastFocus = document.activeElement;

    var rows = CATEGORIES.map(function (c) { return buildCategoryRow(c, current); });

    var modal = el('div', {
      'class': 'pnrx-cookie-modal',
      'role': 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'pnrx-cookie-modal-title',
      'tabindex': '-1'
    }, [
      el('div', { 'class': 'pnrx-cookie-modal__head' }, [
        el('h2', { 'class': 'pnrx-cookie-modal__title', 'id': 'pnrx-cookie-modal-title' }, ['Cookie preferences']),
        el('button', {
          'class': 'pnrx-cookie-modal__close',
          'type': 'button',
          'aria-label': 'Close',
          'onclick': closeModal
        }, ['×'])
      ]),
      el('p', { 'class': 'pnrx-cookie-modal__intro' }, [
        'Choose which categories of cookies and similar technologies you allow on this site. Essential cookies are always on. Your choices apply only to this device and browser, and you can change them anytime from the footer.'
      ])
    ].concat(rows).concat([
      el('div', { 'class': 'pnrx-cookie-modal__actions' }, [
        el('button', {
          'class': 'pnrx-cookie-btn pnrx-cookie-btn--ghost',
          'type': 'button',
          'onclick': function () { rejectAll(); closeModal(); }
        }, ['Reject non-essential']),
        el('button', {
          'class': 'pnrx-cookie-btn pnrx-cookie-btn--ghost',
          'type': 'button',
          'onclick': function () { acceptAll(); closeModal(); }
        }, ['Accept all']),
        el('button', {
          'class': 'pnrx-cookie-btn pnrx-cookie-btn--primary',
          'type': 'button',
          'onclick': function () { savePreferences(modal); closeModal(); }
        }, ['Save preferences'])
      ])
    ]));

    overlay = el('div', {
      'class': 'pnrx-cookie-overlay',
      'data-pnrx-cookie-overlay': true,
      'onclick': function (e) { if (e.target === overlay) closeModal(); }
    }, [modal]);

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    keydownHandler = function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
      if (e.key !== 'Tab') return;
      var focusables = modal.querySelectorAll(
        'button, [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      var first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydownHandler);
    setTimeout(function () { modal.focus(); }, 10);
  }

  function closeModal() {
    if (!overlay) return;
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null;
    document.body.style.overflow = '';
    if (keydownHandler) document.removeEventListener('keydown', keydownHandler);
    keydownHandler = null;
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }

  function savePreferences(modal) {
    var inputs = modal.querySelectorAll('input[data-pnrx-cat]');
    var cats = { essential: true, functional: false, analytics: false, marketing: false };
    inputs.forEach(function (i) { cats[i.getAttribute('data-pnrx-cat')] = !!i.checked; });
    cats.essential = true;
    write(cats);
    removeBar();
  }

  function acceptAll() {
    write({ essential: true, functional: true, analytics: true, marketing: true });
    removeBar();
  }
  function rejectAll() {
    write({ essential: true, functional: false, analytics: false, marketing: false });
    removeBar();
  }

  /* ---------- public API --------------------------------------------------- */
  pnrx.cookies = {
    open: function () { injectStyles(); openModal(); },
    reset: function () {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      removeBar();
      init();
    },
    get: function () {
      return read() || { version: VERSION, ts: 0, categories: { essential: true, functional: false, analytics: false, marketing: false } };
    },
    set: function (cats) { return write(cats || {}); }
  };

  /* ---------- bootstrap ---------------------------------------------------- */
  function init() {
    var existing = read();
    if (!existing) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderBar);
      } else {
        renderBar();
      }
    }
  }

  init();
})();
