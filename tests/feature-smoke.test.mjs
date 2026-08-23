import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('new local-first controls are present in the document', () => {
  const html = read('index.html');
  for (const id of [
    'welcome-state',
    'welcome-demo-btn',
    'welcome-location-btn',
    'refresh-btn',
    'favorite-btn',
    'favorite-cities',
    'export-data-btn',
    'import-data-input',
    'reset-data-btn',
    'copy-link-btn',
    'native-share-btn',
    'sr-status'
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `missing #${id}`);
  }
});

test('PWA assets are valid and linked', () => {
  const html = read('index.html');
  const manifest = JSON.parse(read('public/manifest.webmanifest'));
  const serviceWorker = read('public/sw.js');
  assert.match(html, /rel="manifest" href="\/manifest\.webmanifest"/);
  assert.equal(manifest.short_name, 'Atmosphere');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.icons[0].src, '/icon.svg');
  assert.match(serviceWorker, /caches\.open\(CACHE_NAME\)/);
  assert.match(serviceWorker, /event\.respondWith/);
});

test('free feature wiring is present in the application', () => {
  const app = read('app.js');
  for (const marker of [
    'function renderFavorites()',
    'function exportLocalData()',
    'function importLocalData(file)',
    'function resetLocalData()',
    'function loadCityFromShareLink()',
    'navigator.share',
    'navigator.serviceWorker.register',
    "theme === 'system'"
  ]) {
    assert.match(app, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `missing ${marker}`);
  }
});
