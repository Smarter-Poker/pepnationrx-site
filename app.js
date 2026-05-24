/* ============================================================================
   PEP NATION RX — shared front-end behaviour
   Linked by every page. All interactions are progressive — pages render and
   read correctly with JS disabled; this only adds polish, feedback + state.
   ============================================================================ */
(function () {
  'use strict';

  var reducedMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---- theme: light / dark -------------------------------------------- */
  /* Dark follows the OS by default; this toggle lets the user override and
     remembers the choice. `data-pnrx-theme` on <html> drives the CSS. */
  (function () {
    var root = document.documentElement;
    var stored = null;
    try { stored = localStorage.getItem('pnrx-theme'); } catch (e) {}
    if (stored === 'light' || stored === 'dark') root.setAttribute('data-pnrx-theme', stored);

    var SUN = '<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="10" cy="10" r="3.6"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M15.8 4.2l-1.4 1.4M5.6 14.4l-1.4 1.4"/></svg>';
    var MOON = '<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 11.5A6.5 6.5 0 018.5 4a6.5 6.5 0 100 13 6.5 6.5 0 007.5-5.5z"/></svg>';

    function effective() {
      var attr = root.getAttribute('data-pnrx-theme');
      if (attr === 'dark' || attr === 'light') return attr;
      return (window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }

    var btn = document.createElement('button');
    btn.className = 'site-theme-toggle';
    btn.type = 'button';
    function render() {
      var dark = effective() === 'dark';
      btn.innerHTML = dark ? SUN : MOON;
      btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
      btn.title = dark ? 'Light theme' : 'Dark theme';
    }
    render();
    btn.addEventListener('click', function () {
      var next = effective() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-pnrx-theme', next);
      try { localStorage.setItem('pnrx-theme', next); } catch (e) {}
      render();
    });
    var right = document.querySelector('.site-header__right');
    if (right) right.insertBefore(btn, right.firstChild);
  })();

  /* ---- mobile nav toggle ---------------------------------------------- */
  document.querySelectorAll('[data-burger]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var nav = document.querySelector('.site-nav');
      if (!nav) return;
      var open = nav.style.display === 'flex';
      nav.style.display = open ? '' : 'flex';
      nav.style.position = 'absolute';
      nav.style.flexDirection = 'column';
      nav.style.top = '74px';
      nav.style.left = '0';
      nav.style.right = '0';
      nav.style.background = '#fff';
      nav.style.padding = open ? '' : '16px 28px';
      nav.style.borderBottom = open ? '' : '1px solid var(--pnrx-color-border)';
      btn.setAttribute('aria-expanded', String(!open));
    });
  });

  /* ---- segmented control (browse filter) ------------------------------ */
  document.querySelectorAll('[data-segmented]').forEach(function (group) {
    var buttons = group.querySelectorAll('button');
    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        buttons.forEach(function (x) { x.setAttribute('aria-selected', 'false'); });
        b.setAttribute('aria-selected', 'true');
        var filter = b.getAttribute('data-filter');
        document.querySelectorAll('[data-audience]').forEach(function (card) {
          var aud = card.getAttribute('data-audience');
          var show = filter === 'all' || aud === 'all' || aud === filter;
          card.style.display = show ? '' : 'none';
        });
      });
    });
  });

  /* ---- single-select group (plan cards, intake options) --------------- */
  /* Click, Space/Enter to choose; Arrow keys move the selection (radiogroup). */
  document.querySelectorAll('[data-select-group]').forEach(function (group) {
    var items = [].slice.call(group.querySelectorAll('[data-select-item]'));
    function choose(el, focus) {
      items.forEach(function (x) { x.setAttribute('aria-checked', 'false'); });
      el.setAttribute('aria-checked', 'true');
      if (focus) el.focus();
      group.dispatchEvent(new CustomEvent('pnrx:select', { detail: el }));
    }
    items.forEach(function (el, i) {
      el.addEventListener('click', function () { choose(el, false); });
      el.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); choose(el, false); }
        else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault(); choose(items[(i + 1) % items.length], true);
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault(); choose(items[(i - 1 + items.length) % items.length], true);
        }
      });
    });
  });

  /* ---- intake: enable Continue once an option is chosen --------------- */
  var intakeGroup = document.querySelector('[data-intake-options]');
  if (intakeGroup) {
    var cont = document.querySelector('[data-intake-continue]');
    intakeGroup.addEventListener('pnrx:select', function () {
      if (cont) { cont.disabled = false; cont.removeAttribute('aria-disabled'); }
    });
    if (cont) {
      cont.addEventListener('click', function () {
        if (cont.disabled) return;
        toast({ type: 'success', title: 'Answer saved',
          message: 'Loading your next question…' });
      });
    }
  }

  /* ---- password visibility toggle ------------------------------------- */
  document.querySelectorAll('[data-pw-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var input = document.getElementById(btn.getAttribute('data-pw-toggle'));
      if (!input) return;
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
  });

  /* ---- year stamp in footers ------------------------------------------ */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---- scroll-triggered reveal animations ----------------------------- */
  /* Scroll-position spy rather than IntersectionObserver: this also reveals
     content that was jumped past via anchor links, so nothing stays hidden. */
  var reveals = [].slice.call(document.querySelectorAll('.site-reveal'));
  if (reveals.length && !reducedMotion) {
    reveals.forEach(function (el) { el.classList.add('pre'); });
    var revealCheck = function () {
      var trigger = window.innerHeight * 0.9;
      for (var i = reveals.length - 1; i >= 0; i--) {
        var el = reveals[i];
        if (el.classList.contains('is-visible')) { reveals.splice(i, 1); continue; }
        if (el.getBoundingClientRect().top < trigger) el.classList.add('is-visible');
      }
    };
    var ticking = false;
    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { revealCheck(); ticking = false; });
    };
    revealCheck();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.addEventListener('hashchange', onScroll);
    window.addEventListener('load', revealCheck);
  }
  /* if reduced-motion: content stays visible (no `.pre` added) */

  /* ---- toast notifications -------------------------------------------- */
  var ICONS = {
    success: '<svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 7.5l3 3 6-7"/></svg>',
    error: '<svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4v4M7 10.5h.01"/></svg>',
    info: '<svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 6.5v4M7 4h.01"/></svg>'
  };
  var CLOSE = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3.5 3.5l7 7M10.5 3.5l-7 7"/></svg>';

  function toastRegion() {
    var r = document.querySelector('.pnrx-toast-region');
    if (!r) {
      r = document.createElement('div');
      r.className = 'pnrx-toast-region';
      r.setAttribute('aria-live', 'polite');
      r.setAttribute('aria-atomic', 'false');
      document.body.appendChild(r);
    }
    return r;
  }

  function toast(opts) {
    opts = opts || {};
    var type = opts.type || 'info';
    var t = document.createElement('div');
    t.className = 'pnrx-toast pnrx-toast--' + type;
    t.setAttribute('role', 'status');
    t.innerHTML =
      '<span class="pnrx-toast__icon">' + (ICONS[type] || ICONS.info) + '</span>' +
      '<div class="pnrx-toast__body">' +
        (opts.title ? '<div class="pnrx-toast__title">' + esc(opts.title) + '</div>' : '') +
        (opts.message ? '<div class="pnrx-toast__msg">' + esc(opts.message) + '</div>' : '') +
      '</div>' +
      '<button class="pnrx-toast__close" type="button" aria-label="Dismiss">' + CLOSE + '</button>';
    toastRegion().appendChild(t);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { t.classList.add('is-in'); });
    });
    var timer = setTimeout(dismiss, opts.duration || 4200);
    function dismiss() {
      clearTimeout(timer);
      t.classList.remove('is-in');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 320);
    }
    t.querySelector('.pnrx-toast__close').addEventListener('click', dismiss);
    return t;
  }
  window.pnrx = window.pnrx || {};
  window.pnrx.toast = toast;

  /* ---- form validation UX --------------------------------------------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function fieldError(input, msg) {
    var span = document.getElementById(input.id + '-err');
    if (msg) {
      input.setAttribute('aria-invalid', 'true');
      if (span) {
        span.textContent = msg;
        span.hidden = false;
        input.setAttribute('aria-describedby', span.id);
      }
    } else {
      input.removeAttribute('aria-invalid');
      if (span) { span.hidden = true; span.textContent = ''; }
    }
  }

  function validateField(input) {
    var val = input.value.trim();
    var msg = '';
    if (!val) msg = 'This field is required.';
    else if (input.type === 'email' && !EMAIL_RE.test(val)) msg = 'Enter a valid email address.';
    else if (input.dataset.minlength && val.length < +input.dataset.minlength)
      msg = 'Must be at least ' + input.dataset.minlength + ' characters.';
    fieldError(input, msg);
    return !msg;
  }

  document.querySelectorAll('form[data-validate]').forEach(function (form) {
    var fields = [].slice.call(form.querySelectorAll('.pnrx-input'));
    fields.forEach(function (input) {
      input.addEventListener('blur', function () { validateField(input); });
      input.addEventListener('input', function () {
        if (input.getAttribute('aria-invalid') === 'true') validateField(input);
      });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true, firstBad = null;
      fields.forEach(function (input) {
        if (!validateField(input)) { ok = false; if (!firstBad) firstBad = input; }
      });
      if (!ok) {
        if (firstBad) firstBad.focus();
        toast({ type: 'error', title: 'Check your details',
          message: 'Please fix the highlighted fields.' });
        return;
      }
      var submit = form.querySelector('[type="submit"]');
      if (submit) {
        submit.classList.add('pnrx-btn--loading');
        submit.disabled = true;
        setTimeout(function () {
          submit.classList.remove('pnrx-btn--loading');
          submit.disabled = false;
          toast({ type: 'success', title: 'Signed in',
            message: 'Taking you to your dashboard…' });
        }, 950);
      }
    });
  });
})();
