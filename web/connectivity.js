'use strict';
/*
 * Browser network hint only. This does NOT assert API/feed availability.
 * Works without account access, analytics, timers or native bridges.
 */
(function () {
  function install() {
    if (document.getElementById('newview-network-indicator')) return;
    const header = document.querySelector('header');
    if (!header) return;
    const indicator = document.createElement('span');
    indicator.id = 'newview-network-indicator';
    indicator.className = 'newview-network-indicator';
    indicator.setAttribute('role', 'status');
    indicator.setAttribute('aria-live', 'polite');
    indicator.setAttribute('aria-atomic', 'true');

    const render = () => {
      const offline = navigator.onLine === false;
      indicator.dataset.network = offline ? 'offline' : 'online';
      indicator.textContent = offline
        ? 'Browser offline — saved content may still work'
        : 'Browser online · live sources may vary';
    };
    header.append(indicator);
    window.addEventListener('online', render);
    window.addEventListener('offline', render);
    render();
    window.addEventListener('pagehide', () => {
      window.removeEventListener('online', render);
      window.removeEventListener('offline', render);
    }, { once: true });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
