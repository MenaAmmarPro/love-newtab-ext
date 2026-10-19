"use strict";

/*
 * love-newtab-ext — background.
 *
 * Deliberately tiny: Chrome/Edge run this as an MV3 service worker, Firefox as
 * a background script. It only records a small "installed" marker so the new
 * tab page knows it can safely seed its own defaults.
 */

const api = globalThis.browser || globalThis.chrome;

const META_KEY = "mena-newtab-meta";
const VERSION = "1.0.0";

function seedMeta() {
  if (!api || !api.storage || !api.storage.local) return;
  api.storage.local.get(META_KEY, (data) => {
    const existing = (data && data[META_KEY]) || null;
    if (existing && existing.version) return;
    api.storage.local.set({
      [META_KEY]: { version: VERSION, installedAt: Date.now() }
    });
  });
}

if (api && api.runtime && api.runtime.onInstalled) {
  api.runtime.onInstalled.addListener(seedMeta);
}

// Expose for the test harness / debugging.
globalThis.MenaNewTabBackground = { META_KEY, VERSION, seedMeta };
