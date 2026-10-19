"use strict";

/*
 * love-newtab-ext — dependency-free Node harness.
 *
 * Runs the extension scripts in a tiny fake-DOM sandbox with a mocked
 * `api.*`, then checks the pure logic. No browser, no dependencies.
 *
 * Run:  node test/harness.js
 */

const fs = require("fs");
const vm = require("vm");
const path = require("path");

const ROOT = path.join(__dirname, "..");
let failures = 0;
let checks = 0;

function assert(cond, message) {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error("FAIL: " + message);
    process.exitCode = 1;
  } else {
    console.log("ok - " + message);
  }
}

function eq(a, b, message) {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  assert(
    ok,
    message + (ok ? "" : " (got " + JSON.stringify(a) + ", want " + JSON.stringify(b) + ")")
  );
}

/* ---------------- sandbox building ---------------- */

function makeEl() {
  return {
    style: { setProperty() {} },
    classList: { add() {}, remove() {}, toggle() {} },
    dataset: {},
    children: [],
    files: [],
    appendChild() {},
    addEventListener() {},
    setAttribute() {},
    getAttribute() {
      return null;
    },
    removeAttribute() {},
    querySelector: () => null,
    querySelectorAll: () => [],
    focus() {},
    remove() {},
    firstChild: null,
    removeChild() {},
    innerHTML: "",
    textContent: "",
    value: "",
    checked: false,
    hidden: false
  };
}

function makeApiMock(store) {
  return {
    storage: {
      local: {
        get(key, cb) {
          const result = typeof key === "string" ? { [key]: store[key] } : Object.assign({}, store);
          if (typeof cb === "function") {
            cb(result);
            return undefined;
          }
          return Promise.resolve(result);
        },
        set(obj, cb) {
          Object.assign(store, obj);
          if (typeof cb === "function") {
            cb();
            return undefined;
          }
          return Promise.resolve();
        },
        remove(key, cb) {
          if (typeof key === "string") delete store[key];
          if (typeof cb === "function") {
            cb();
            return undefined;
          }
          return Promise.resolve();
        }
      },
      onChanged: { addListener() {} }
    },
    runtime: {
      openOptionsPage() {},
      getURL: (p) => "chrome-extension://lovetest/" + p,
      onInstalled: { addListener() {} }
    },
    tabs: { create() {} }
  };
}

// Build a fresh VM context so each scenario gets its own copy of `const api`.
function makeSandbox(apiMock, store) {
  const localStore = store || {};
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Date,
    Math,
    JSON,
    Intl,
    localStorage: {
      getItem: () => null,
      setItem() {},
      removeItem() {}
    },
    document: {
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener() {},
      createElement: () => makeEl(),
      body: { appendChild() {}, classList: { add() {}, remove() {} } },
      documentElement: { classList: { add() {}, remove() {}, toggle() {} } }
    },
    navigator: { language: "en" },
    location: { href: "chrome-extension://lovetest/src/newtab/newtab.html", search: "" },
    matchMedia: () => ({ matches: false }),
    requestAnimationFrame: (fn) => setTimeout(fn, 0),
    cancelAnimationFrame() {},
    addEventListener() {},
    innerWidth: 1280,
    innerHeight: 800,
    devicePixelRatio: 1,
    chrome: apiMock
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  return sandbox;
}

function load(sandbox, relPath) {
  const code = fs.readFileSync(path.join(ROOT, relPath), "utf8");
  vm.runInContext(code, sandbox, { filename: relPath });
}

/* ---------------- new tab page ---------------- */

const store = {};
const land = makeSandbox(makeApiMock(store), store);
load(land, "src/common/api.js");
load(land, "src/common/data.js");
load(land, "src/newtab/newtab.js");
load(land, "src/popup/popup.js");

const NT = land.MenaNewTab;
const DATA = land.MenaNewTabData;

assert(!!NT, "namespace globalThis.MenaNewTab exposed");
assert(!!DATA, "globalThis.MenaNewTabData exposed");
assert(typeof land.api === "object" && !!land.api.storage, "api.* handle published");

/* bundled content */
assert(Array.isArray(DATA.reasons) && DATA.reasons.length >= 20, "at least 20 reasons bundled");
assert(Array.isArray(DATA.quotes) && DATA.quotes.length >= 20, "at least 20 quotes bundled");
assert(
  DATA.reasons.every((r) => typeof r === "string" && r.trim().length > 0),
  "every reason is a non-empty string"
);
assert(
  DATA.quotes.every((q) => typeof q === "string" && q.trim().length > 0),
  "every quote is a non-empty string"
);

/* settings defaults */
const def = NT.defaultSettings();
eq(NT.STORE, "mena-newtab", "storage key is mena-newtab");
eq(def.you, "Mena", "default her name");
eq(def.me, "Ammar", "default your name");
assert(Array.isArray(def.links) && def.links.length === 4, "four starter links");
assert(def.showReason && def.showQuote && def.showStarfield && def.clock24, "sensible default toggles");
const def2 = NT.defaultSettings();
assert(def.links !== def2.links, "defaultSettings returns a fresh array each time");

/* urls */
eq(NT.normaliseUrl("example.com"), "https://example.com", "normaliseUrl: adds https");
eq(NT.normaliseUrl("http://example.com"), "http://example.com", "normaliseUrl: keeps a scheme");
eq(NT.normaliseUrl("//example.com"), "https://example.com", "normaliseUrl: protocol-relative");
eq(NT.normaliseUrl("  spaced.com  "), "https://spaced.com", "normaliseUrl: trims");
eq(NT.normaliseUrl(""), "", "normaliseUrl: empty stays empty");
eq(NT.hostOf("https://www.example.com/a?b=1"), "example.com", "hostOf: strips www and path");
eq(NT.hostOf("nonsense"), "nonsense", "hostOf: falls back to the input");

/* links */
assert(NT.sanitiseLink(null) === null, "sanitiseLink: rejects null");
assert(NT.sanitiseLink({ url: "" }) === null, "sanitiseLink: rejects empty url");
assert(NT.sanitiseLink("https://x.com") === null, "sanitiseLink: rejects a string");
const lk = NT.sanitiseLink({ url: "our.site" });
eq(lk.url, "https://our.site", "sanitiseLink: normalises the url");
eq(lk.title, "our.site", "sanitiseLink: titles fall back to the host");
assert(typeof lk.id === "string" && lk.id.length > 0, "sanitiseLink: mints an id");

const many = [];
for (let i = 0; i < 20; i += 1) many.push({ title: "L" + i, url: "site" + i + ".com" });
eq(NT.sanitiseLinks(many).length, 12, "sanitiseLinks: caps at 12");
eq(NT.sanitiseLinks([{ url: "a.com" }, { url: "a.com" }]).length, 1, "sanitiseLinks: dedupes by url");
eq(NT.sanitiseLinks(null), [], "sanitiseLinks: null gives an empty list");
eq(NT.sanitiseLinks("nope"), [], "sanitiseLinks: a string gives an empty list");

/* loadSettings */
const d1 = NT.loadSettings(null);
eq(d1.you, "Mena", "loadSettings: null keeps defaults");
eq(NT.loadSettings("{not json").you, "Mena", "loadSettings: corrupt JSON keeps defaults");
eq(NT.loadSettings([1, 2, 3]).you, "Mena", "loadSettings: an array keeps defaults");
eq(NT.loadSettings({ you: "  Bob  " }).you, "Bob", "loadSettings: trims names");
eq(NT.loadSettings({ reunionDate: "not-a-date" }).reunionDate, def.reunionDate, "loadSettings: bad date ignored");
eq(NT.loadSettings({ reunionDate: "2027-01-15" }).reunionDate, "2027-01-15", "loadSettings: good date accepted");
eq(NT.loadSettings({ showQuote: false }).showQuote, false, "loadSettings: false is respected");
eq(NT.loadSettings({ links: [{ url: "one.com" }] }).links.length, 1, "loadSettings: sanitises links");
eq(
  NT.loadSettings(JSON.stringify({ you: "Mimi" })).you,
  "Mimi",
  "loadSettings: accepts a JSON string"
);
eq(NT.loadSettings({ clock24: "yes" }).clock24, true, "loadSettings: non-boolean keeps default");

/* dates */
assert(NT.midnightOf("2026-10-19") instanceof Date, "midnightOf: parses a date");
assert(NT.midnightOf("2026-13-01") === null, "midnightOf: rejects month 13");
assert(NT.midnightOf("2026-02-30") === null, "midnightOf: rejects Feb 30");
assert(NT.midnightOf("19/10/2026") === null, "midnightOf: rejects another format");
assert(NT.midnightOf("") === null, "midnightOf: rejects empty");

const dayA = NT.dayNumber(new Date(2026, 9, 19, 9, 0, 0));
const dayB = NT.dayNumber(new Date(2026, 9, 19, 23, 59, 0));
const dayC = NT.dayNumber(new Date(2026, 9, 20, 0, 0, 0));
eq(dayA, dayB, "dayNumber: same day regardless of clock time");
eq(dayC - dayA, 1, "dayNumber: advances by one each day");

/* reason / quote of the day */
const reasons = DATA.reasons;
const quotes = DATA.quotes;
const r1 = NT.reasonForDate(new Date(2026, 9, 19, 8, 0, 0));
const r2 = NT.reasonForDate(new Date(2026, 9, 19, 20, 0, 0));
eq(r1, r2, "reasonForDate: stable within a day");
assert(reasons.indexOf(r1) !== -1, "reasonForDate: comes from the bundled list");
const idx = ((NT.dayNumber(new Date(2026, 9, 19)) % reasons.length) + reasons.length) % reasons.length;
eq(r1, reasons[idx], "reasonForDate: deterministic by day index");
const rNext = NT.reasonForDate(new Date(2026, 9, 20));
eq(rNext, reasons[(idx + 1) % reasons.length], "reasonForDate: next day moves one along");
assert(quotes.indexOf(NT.quoteForDate(new Date(2026, 9, 19))) !== -1, "quoteForDate: from the bundled list");
eq(NT.randomQuote(0), quotes[0], "randomQuote: 0 gives the first");
eq(NT.randomQuote(0.999), quotes[quotes.length - 1], "randomQuote: near-1 gives the last");
assert(quotes.indexOf(NT.randomQuote()) !== -1, "randomQuote: no argument still lands in range");

/* greeting */
eq(NT.greetingFor(3), "Still awake", "greetingFor: very late");
eq(NT.greetingFor(8), "Good morning", "greetingFor: morning");
eq(NT.greetingFor(13), "Good afternoon", "greetingFor: afternoon");
eq(NT.greetingFor(19), "Good evening", "greetingFor: evening");
eq(NT.greetingFor(23), "Good night", "greetingFor: night");
eq(NT.greetingFor(12), "Good afternoon", "greetingFor: noon boundary");
eq(NT.greetingFor(18), "Good evening", "greetingFor: 18:00 boundary");

/* days until */
const noon = new Date(2026, 9, 19, 12, 0, 0).getTime();
eq(NT.daysUntil("2026-10-19", noon), 0, "daysUntil: today is 0");
eq(NT.daysUntil("2026-10-20", noon), 1, "daysUntil: tomorrow is 1");
eq(NT.daysUntil("2026-10-18", noon), -1, "daysUntil: yesterday is -1");
eq(NT.daysUntil("2026-10-26", noon), 7, "daysUntil: a week away");
eq(NT.daysUntil("2026-11-01", noon), 13, "daysUntil: crosses into next month");
assert(NT.daysUntil("nope", noon) === null, "daysUntil: invalid date is null");

/* countdown */
const cd = NT.countdownParts("2026-10-22", noon);
eq([cd.days, cd.hours, cd.minutes, cd.seconds], [2, 12, 0, 0], "countdownParts: splits days/hours/mins/secs");
eq(cd.done, false, "countdownParts: not done in the future");
assert(NT.countdownParts("2026-10-19", noon).done === true, "countdownParts: past is done");
assert(NT.countdownParts("nope", noon).done === true, "countdownParts: invalid is done");
const cdNear = NT.countdownParts("2026-10-19", new Date(2026, 9, 18, 22, 30, 30).getTime());
eq([cdNear.days, cdNear.hours, cdNear.minutes, cdNear.seconds], [0, 1, 29, 30], "countdownParts: sub-day parts");

/* clock + date formatting */
const c1 = NT.formatClock(new Date(2026, 9, 19, 9, 5, 7));
eq(c1.time24, "09:05:07", "formatClock: pads a 24h time");
eq(c1.hh, "09", "formatClock: hh padded");
eq(c1.ampm, "AM", "formatClock: morning is AM");
eq(c1.hour12, 9, "formatClock: 12h hour");
const c2 = NT.formatClock(new Date(2026, 9, 19, 15, 0, 0));
eq(c2.time24, "15:00:00", "formatClock: afternoon 24h");
eq(c2.ampm, "PM", "formatClock: afternoon is PM");
eq(c2.hour12, 3, "formatClock: 12h hour in the afternoon");
eq(NT.formatClock(new Date(2026, 9, 19, 0, 0, 0)).hour12, 12, "formatClock: midnight is 12");
eq(NT.formatDate(new Date(2026, 9, 19)), "Monday, 19 October 2026", "formatDate: known date");
eq(NT.formatDate(new Date(2026, 0, 1)), "Thursday, 1 January 2026", "formatDate: new year's day");

eq(NT.pad2(5), "05", "pad2: pads a single digit");
eq(NT.pad2(12), "12", "pad2: leaves two digits");
eq(NT.pad2(0), "00", "pad2: zero");

/* countdown text */
eq(NT.countdownText({ done: true }, "to go"), "Today is the day ♥", "countdownText: done");
eq(NT.countdownText({ done: false, days: 1, hours: 0 }, "to go"), "1 day to go", "countdownText: singular day");
eq(NT.countdownText({ done: false, days: 5, hours: 0 }, "to go"), "5 days to go", "countdownText: plural days");
eq(NT.countdownText({ done: false, days: 0, hours: 3, minutes: 7 }, "to go"), "3h 07m to go", "countdownText: hours");
eq(NT.countdownText({ done: false, days: 0, hours: 0, minutes: 9, seconds: 4 }, "to go"), "9m 04s to go", "countdownText: minutes");

/* ---------------- background script (own context) ---------------- */

async function runBackgroundChecks() {
  const bgStore = {};
  const bgsb = makeSandbox(makeApiMock(bgStore), bgStore);
  load(bgsb, "src/background.js");
  const BG = bgsb.MenaNewTabBackground;
  assert(!!BG, "background exposes MenaNewTabBackground");
  eq(BG.VERSION, "1.0.0", "background version");
  eq(BG.META_KEY, "mena-newtab-meta", "background meta key");
  await BG.seedMeta();
  assert(
    !!bgStore["mena-newtab-meta"] && !!bgStore["mena-newtab-meta"].version,
    "seedMeta writes a version marker"
  );
  const firstInstall = bgStore["mena-newtab-meta"].installedAt;
  await BG.seedMeta();
  eq(
    bgStore["mena-newtab-meta"].installedAt,
    firstInstall,
    "seedMeta does not overwrite an existing marker"
  );
}

const backgroundChecks = runBackgroundChecks();

/* ---------------- manifests ---------------- */

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
}

const chromeManifest = readJson("manifest.chrome.json");
const firefoxManifest = readJson("manifest.firefox.json");

eq(chromeManifest.manifest_version, 3, "chrome manifest: MV3");
eq(chromeManifest.background.service_worker, "src/background.js", "chrome manifest: service worker");
eq(chromeManifest.chrome_url_overrides.newtab, "src/newtab/newtab.html", "chrome manifest: new tab override");
eq(chromeManifest.permissions, ["storage"], "chrome manifest: only storage permission");
assert(!!chromeManifest.icons["128"], "chrome manifest: has a 128 icon");

eq(firefoxManifest.manifest_version, 3, "firefox manifest: MV3");
eq(
  firefoxManifest.background.scripts,
  ["src/background.js"],
  "firefox manifest: background scripts"
);
assert(
  !!firefoxManifest.browser_specific_settings &&
    !!firefoxManifest.browser_specific_settings.gecko.id,
  "firefox manifest: gecko id present"
);
eq(firefoxManifest.permissions, ["storage"], "firefox manifest: only storage permission");

/* both manifests must reference the same new tab page */
eq(firefoxManifest.chrome_url_overrides.newtab, chromeManifest.chrome_url_overrides.newtab, "manifests agree on the new tab page");

/* icons exist on disk */
["16", "32", "48", "128"].forEach((size) => {
  const p = path.join(ROOT, "icons", "icon-" + size + ".png");
  assert(fs.existsSync(p), "icon-" + size + ".png exists");
});

/* every file the manifests point at exists */
const referenced = [
  chromeManifest.background.service_worker,
  chromeManifest.chrome_url_overrides.newtab,
  chromeManifest.action.default_popup,
  chromeManifest.options_ui.page,
  "icons/icon-16.png",
  "icons/icon-48.png",
  "icons/icon-128.png"
];
referenced.forEach((rel) => {
  assert(fs.existsSync(path.join(ROOT, rel)), "manifest reference exists: " + rel);
});

/* ---------------- result ---------------- */

backgroundChecks.then(function report() {
  if (failures) {
    console.error("\n" + failures + " of " + checks + " check(s) failed.");
    process.exit(1);
  }
  console.log("\nAll " + checks + " love-newtab-ext checks passed ♥");
});
