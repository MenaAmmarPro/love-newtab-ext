"use strict";

/*
 * love-newtab-ext — the extension API handle.
 *
 * Loaded first as a plain script. Firefox exposes `browser`, Chrome/Edge
 * expose `chrome`; everything else in the extension uses `api.*`.
 */
const api = globalThis.browser || globalThis.chrome;

// Also publish it so any script (or test harness) can reach it safely.
globalThis.api = api;
