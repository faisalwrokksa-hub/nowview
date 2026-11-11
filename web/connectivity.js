'use strict';
/* Local network hint and explicit, user-triggered Worker health check.
 * Neither the browser online flag nor /healthz certifies third-party feeds.
 * Do not transmit user settings, business CSV data, tokens, or identifiers.
 */
(function () {
  function install() {
    if (document.getElementById('newview-network-indicator')) return;
    const header = document.querySelector('main > header');
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

    const settings = document.getElementById('newview-settings-content') ||
      document.querySelector('#newview-settings .newview-settings-content');
    if (settings) {
      const section = document.createElement('section');
      section.className = 'shell-card newview-diagnostics';
      section.setAttribute('aria-labelledby', 'newview-diagnostics-heading');
      const heading = document.createElement('h3');
      heading.id = 'newview-diagnostics-heading';
      heading.textContent = 'System diagnostics';
      const description = document.createElement('p');
      description.textContent = 'Check the current dashboard server. This does not test market data, news, TV streams, or other external services.';
      const button = document.createElement('button');
      button.type = 'button';
      button.id = 'newview-health-check';
      button.textContent = 'Check dashboard server';
      const status = document.createElement('p');
      status.id = 'newview-health-result';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      status.textContent = 'Not checked in this session';
      const details = document.createElement('p');
      details.className = 'newview-diagnostics-note';
      details.textContent = 'A successful check confirms only that this server responds to its health endpoint.';
      section.append(heading, description, button, status, details);
      settings.append(section);
      button.addEventListener('click', async () => {
        if (button.disabled) return;
        if (navigator.onLine === false) {
          status.textContent = 'Browser reports offline; server not checked';
          status.dataset.health = 'unknown';
          return;
        }
        button.disabled = true;
        status.dataset.health = 'checking';
        status.textContent = 'Checking dashboard server…';
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
          const response = await fetch('/healthz', {
            method: 'GET', cache: 'no-store', credentials: 'same-origin',
            signal: controller.signal, headers: { Accept: 'application/json' }
          });
          if (!response.ok) throw new Error('Server returned HTTP ' + response.status);
          const data = await response.json();
          if (!data || data.status !== 'ok' || data.app !== 'newview' || data.scope !== 'worker-only') {
            throw new Error('Unrecognized health response');
          }
          status.dataset.health = 'ok';
          status.textContent = 'Dashboard server responding · external feeds not checked';
        } catch (error) {
          status.dataset.health = 'error';
          status.textContent = error.name === 'AbortError'
            ? 'Server check timed out; try again'
            : 'Dashboard server could not be verified; external feeds not checked';
        } finally {
          clearTimeout(timeout);
          button.disabled = false;
        }
      });
    }
    window.addEventListener('pagehide', () => {
      window.removeEventListener('online', render);
      window.removeEventListener('offline', render);
    }, { once: true });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else install();
})();
