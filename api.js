/* ============================================================================
   PEP NATION RX — tiny API client + backend detection
   ----------------------------------------------------------------------------
   Single source of truth for talking to the backend. Same-origin by default
   (so `npm run dev` serves API + site on one port); override the base URL by
   setting `window.__PNRX_API_BASE__` before this script loads.

   Backend detection: on every page that wires live behavior we call
   `pnrx.api.detectBackend()` — it probes /api/health once. If the probe
   succeeds the page upgrades to live mode; if it fails (production
   pepnationrx.com today, where no backend is reachable) every wired page
   keeps its existing mock content. The detection result is cached on
   `pnrx.backend = true | false`.
   ============================================================================ */
(function () {
  'use strict';

  var BASE =
    (typeof window !== 'undefined' && window.__PNRX_API_BASE__) || '';

  var ns = (window.pnrx = window.pnrx || {});
  ns.backend = null; // null = not probed yet; boolean after detectBackend()

  function ApiError(message, status, body) {
    var e = new Error(message);
    e.name = 'PnrxApiError';
    e.status = status;
    e.body = body;
    return e;
  }

  function request(method, path, body) {
    var url = BASE + path;
    var opts = {
      method: method,
      credentials: 'include', // send/store the session cookie
      headers: { Accept: 'application/json' },
    };
    if (body !== undefined && body !== null) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    return fetch(url, opts).then(function (res) {
      var ct = res.headers.get('content-type') || '';
      var json = ct.indexOf('application/json') !== -1 ? res.json() : Promise.resolve(null);
      return json.then(function (data) {
        if (!res.ok) {
          var msg = (data && (data.error || data.message)) ||
                    'Request failed (' + res.status + ')';
          throw ApiError(msg, res.status, data);
        }
        return data;
      });
    });
  }

  ns.api = {
    get: function (path) { return request('GET', path); },
    post: function (path, body) { return request('POST', path, body || {}); },
    del: function (path) { return request('DELETE', path); },

    /**
     * Probe /api/health. Resolves with `true` if reachable, `false`
     * otherwise. Caches the result on `pnrx.backend`. Never rejects.
     */
    detectBackend: function () {
      if (ns.backend !== null) return Promise.resolve(ns.backend);
      var ctrl = ('AbortController' in window) ? new AbortController() : null;
      var timer = ctrl ? setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, 2500) : null;
      return fetch(BASE + '/api/health', {
        credentials: 'include',
        headers: { Accept: 'application/json' },
        signal: ctrl ? ctrl.signal : undefined,
      })
        .then(function (res) { return res.ok; })
        .catch(function () { return false; })
        .then(function (ok) {
          if (timer) clearTimeout(timer);
          ns.backend = !!ok;
          try {
            window.dispatchEvent(new CustomEvent('pnrx:backend', { detail: { ok: ns.backend } }));
          } catch (e) {}
          return ns.backend;
        });
    },
  };
})();
