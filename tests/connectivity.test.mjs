import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const script = fs.readFileSync(new URL('../web/connectivity.js', import.meta.url), 'utf8');

function makeContext(initialOnline = true) {
  const byId = new Map(), handlers = new Map(), children = [];
  const header = { append(el) { children.push(el); byId.set(el.id, el); } };
  const document = {
    readyState: 'complete',
    getElementById: id => byId.get(id) || null,
    querySelector: selector => selector === 'header' ? header : null,
    createElement: tag => ({
      tag, dataset: {}, attributes: {},
      setAttribute(key, value) { this.attributes[key] = value; },
      textContent: '', id: '', className: ''
    })
  };
  const window = {
    addEventListener(type, callback) { handlers.set(type, callback); },
    removeEventListener(type, callback) {
      if (handlers.get(type) === callback) handlers.delete(type);
    }
  };
  const navigator = { onLine: initialOnline };
  const context = vm.createContext({ document, window, navigator });
  return { context, byId, handlers, children, navigator };
}

test('network hint stays hidden online and displays a concise offline warning', () => {
  const env = makeContext();
  vm.runInContext(script, env.context);
  const indicator = env.byId.get('newview-network-indicator');
  assert.equal(indicator.attributes.role, 'status');
  assert.equal(indicator.attributes['aria-live'], 'polite');
  assert.equal(indicator.textContent, '');
  assert.equal(indicator.hidden,true);
  env.navigator.onLine = false;
  env.handlers.get('offline')();
  assert.equal(indicator.dataset.network, 'offline');
  assert.equal(indicator.textContent,'Offline');
  assert.equal(indicator.hidden,false);
});

test('reloading module does not duplicate network hint', () => {
  const env = makeContext(false);
  vm.runInContext(script, env.context);
  vm.runInContext(script, env.context);
  assert.equal(env.children.length, 1);
});

test('pagehide cleans up online/offline event handlers', () => {
  const env = makeContext();
  vm.runInContext(script, env.context);
  env.handlers.get('pagehide')();
  assert.equal(env.handlers.has('online'), false);
  assert.equal(env.handlers.has('offline'), false);
});
