/* ============================================================================
   PEP NATION RX — shared front-end behaviour
   Linked by every page. All interactions are progressive — pages render and
   read correctly with JS disabled; this only adds polish + state.
   ============================================================================ */
(function () {
  'use strict';

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
  document.querySelectorAll('[data-select-group]').forEach(function (group) {
    var items = group.querySelectorAll('[data-select-item]');
    function choose(el) {
      items.forEach(function (x) { x.setAttribute('aria-checked', 'false'); });
      el.setAttribute('aria-checked', 'true');
      group.dispatchEvent(new CustomEvent('pnrx:select', { detail: el }));
    }
    items.forEach(function (el) {
      el.addEventListener('click', function () { choose(el); });
      el.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); choose(el); }
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
})();
