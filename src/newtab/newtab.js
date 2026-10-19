"use strict";

/*
 * love-newtab-ext — the New Tab page.
 *
 * Everything real happens in pure functions exposed on `globalThis.MenaNewTab`
 * so it can be tested without a browser. The DOM wiring at the bottom is only
 * started from DOMContentLoaded, so loading this file in Node is harmless.
 */

(function () {
  var STORE = "mena-newtab";
  var DAY = 86400000;
  var MAX_LINKS = 12;

  var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  function isStr(v) {
    return typeof v === "string";
  }

  function clean(v, max) {
    if (!isStr(v)) return "";
    var t = v.replace(/\u0000/g, "").trim();
    if (typeof max === "number" && t.length > max) t = t.slice(0, max);
    return t;
  }

  function pad2(n) {
    n = Math.floor(n);
    return (n < 10 ? "0" : "") + n;
  }

  function data() {
    var d = (typeof globalThis !== "undefined" && globalThis.MenaNewTabData) || null;
    return { reasons: (d && d.reasons) || [], quotes: (d && d.quotes) || [] };
  }

  /* ---------------- settings ---------------- */

  function defaultSettings() {
    return {
      you: "Mena",
      me: "Ammar",
      reunionDate: "2026-12-25",
      reunionLabel: "until we're together again",
      links: [
        { id: "l1", title: "Our little universe", url: "https://menaammarpro.github.io/loveformymena/" },
        { id: "l2", title: "Our notes", url: "https://menaammarpro.github.io/love-notes/" },
        { id: "l3", title: "Love reasons", url: "https://menaammarpro.github.io/love-reasons/" },
        { id: "l4", title: "Our diary", url: "https://menaammarpro.github.io/love-diary/" }
      ],
      showReason: true,
      showQuote: true,
      showStarfield: true,
      clock24: true
    };
  }

  function normaliseUrl(value) {
    var v = clean(value, 300);
    if (!v) return "";
    if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return v;
    if (v.indexOf("//") === 0) return "https:" + v;
    return "https://" + v.replace(/^\/+/, "");
  }

  function hostOf(url) {
    var m = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]+)/i.exec(url || "");
    if (!m) return url || "";
    return m[1].replace(/^www\./, "");
  }

  function makeLinkId() {
    return "l-" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  }

  function sanitiseLink(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    var url = normaliseUrl(raw.url);
    if (!url) return null;
    var title = clean(raw.title, 40) || hostOf(url);
    return {
      id: isStr(raw.id) && raw.id ? raw.id.slice(0, 40) : makeLinkId(),
      title: title,
      url: url
    };
  }

  function sanitiseLinks(list) {
    if (!Array.isArray(list)) return [];
    var seen = {};
    var out = [];
    list.forEach(function (item) {
      var link = sanitiseLink(item);
      if (!link) return;
      var key = link.url.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      out.push(link);
    });
    return out.slice(0, MAX_LINKS);
  }

  function boolOr(value, fallback) {
    return typeof value === "boolean" ? value : fallback;
  }

  function loadSettings(raw) {
    var base = defaultSettings();
    var src = raw;
    if (isStr(raw)) {
      try {
        src = JSON.parse(raw);
      } catch (e) {
        src = null;
      }
    }
    if (!src || typeof src !== "object" || Array.isArray(src)) return base;

    if (isStr(src.you) && clean(src.you, 24)) base.you = clean(src.you, 24);
    if (isStr(src.me) && clean(src.me, 24)) base.me = clean(src.me, 24);
    if (isStr(src.reunionDate) && /^\d{4}-\d{2}-\d{2}$/.test(src.reunionDate.trim())) {
      base.reunionDate = src.reunionDate.trim();
    }
    if (isStr(src.reunionLabel) && clean(src.reunionLabel, 60)) {
      base.reunionLabel = clean(src.reunionLabel, 60);
    }
    if (Array.isArray(src.links)) base.links = sanitiseLinks(src.links);
    base.showReason = boolOr(src.showReason, base.showReason);
    base.showQuote = boolOr(src.showQuote, base.showQuote);
    base.showStarfield = boolOr(src.showStarfield, base.showStarfield);
    base.clock24 = boolOr(src.clock24, base.clock24);
    return base;
  }

  /* ---------------- date + content ---------------- */

  function midnightOf(str) {
    if (!isStr(str)) return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str.trim());
    if (!m) return null;
    var y = Number(m[1]);
    var mo = Number(m[2]);
    var d = Number(m[3]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    var date = new Date(y, mo - 1, d, 0, 0, 0, 0);
    if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
    return date;
  }

  function dayNumber(date) {
    var d = date instanceof Date ? date : new Date();
    var local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.floor(local.getTime() / DAY);
  }

  function pick(list, date) {
    if (!list.length) return "";
    var n = list.length;
    return list[(((dayNumber(date) % n) + n) % n)];
  }

  function reasonForDate(date) {
    return pick(data().reasons, date);
  }

  function quoteForDate(date) {
    return pick(data().quotes, date);
  }

  function randomQuote(rand) {
    var quotes = data().quotes;
    if (!quotes.length) return "";
    var r = typeof rand === "number" ? rand : Math.random();
    var i = Math.floor(Math.abs(r) * quotes.length) % quotes.length;
    return quotes[i];
  }

  function greetingFor(hour) {
    var h = typeof hour === "number" ? hour : new Date().getHours();
    if (h < 5) return "Still awake";
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    if (h < 22) return "Good evening";
    return "Good night";
  }

  function daysUntil(str, now) {
    var target = midnightOf(str);
    if (!target) return null;
    var current = typeof now === "number" ? now : Date.now();
    var diff = target.getTime() - current;
    var d = Math.ceil(diff / DAY);
    return d === 0 ? 0 : d;
  }

  function countdownParts(str, now) {
    var target = midnightOf(str);
    var current = typeof now === "number" ? now : Date.now();
    if (!target) {
      return { done: true, days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
    }
    var diff = target.getTime() - current;
    if (diff <= 0) {
      return { done: true, days: 0, hours: 0, minutes: 0, seconds: 0, total: diff };
    }
    return {
      done: false,
      days: Math.floor(diff / DAY),
      hours: Math.floor((diff % DAY) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
      total: diff
    };
  }

  function formatClock(date) {
    var d = date instanceof Date ? date : new Date();
    var h = d.getHours();
    var m = d.getMinutes();
    var s = d.getSeconds();
    var hour12 = h % 12 === 0 ? 12 : h % 12;
    return {
      hh: pad2(h),
      mm: pad2(m),
      ss: pad2(s),
      hour12: hour12,
      ampm: h < 12 ? "AM" : "PM",
      time24: pad2(h) + ":" + pad2(m) + ":" + pad2(s),
      time12: hour12 + ":" + pad2(m) + ":" + pad2(s)
    };
  }

  function formatDate(date) {
    var d = date instanceof Date ? date : new Date();
    return (
      WEEKDAYS[d.getDay()] + ", " + d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear()
    );
  }

  function countdownText(parts, label) {
    if (!parts || parts.done) return "Today is the day ♥";
    if (parts.days >= 1) {
      return parts.days + (parts.days === 1 ? " day" : " days") + " " + (label || "");
    }
    if (parts.hours >= 1) return parts.hours + "h " + pad2(parts.minutes) + "m " + (label || "");
    return parts.minutes + "m " + pad2(parts.seconds) + "s " + (label || "");
  }

  /* ---------------- expose the pure API ---------------- */

  var API = {
    STORE: STORE,
    DAY: DAY,
    MAX_LINKS: MAX_LINKS,
    defaultSettings: defaultSettings,
    normaliseUrl: normaliseUrl,
    hostOf: hostOf,
    sanitiseLink: sanitiseLink,
    sanitiseLinks: sanitiseLinks,
    loadSettings: loadSettings,
    midnightOf: midnightOf,
    dayNumber: dayNumber,
    reasonForDate: reasonForDate,
    quoteForDate: quoteForDate,
    randomQuote: randomQuote,
    greetingFor: greetingFor,
    daysUntil: daysUntil,
    countdownParts: countdownParts,
    formatClock: formatClock,
    formatDate: formatDate,
    countdownText: countdownText,
    pad2: pad2
  };

  var root = typeof globalThis !== "undefined" ? globalThis : this;
  if (root) root.MenaNewTab = API;

  /* ---------------- DOM wiring (skipped in Node) ---------------- */

  if (typeof document === "undefined" || !document || typeof document.addEventListener !== "function") {
    return;
  }

  var settings = defaultSettings();
  var clockTimer = 0;

  function $(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    var el = $(id);
    if (el) el.textContent = String(value);
  }

  function renderClock() {
    var now = new Date();
    var clock = formatClock(now);
    setText("nt-time", settings.clock24 ? clock.time24 : clock.time12);
    setText("nt-ampm", settings.clock24 ? "" : clock.ampm);
    setText("nt-date", formatDate(now));
    setText("nt-greeting", greetingFor(now.getHours()) + ", " + settings.you + " ♥");
  }

  function renderCountdown() {
    var parts = countdownParts(settings.reunionDate, Date.now());
    var label = settings.reunionLabel || "until we're together again";
    setText("nt-countdown-label", label);

    var daysEl = $("nt-days");
    var subEl = $("nt-countdown-sub");
    if (parts.done) {
      if (daysEl) daysEl.textContent = "♥";
      setText("nt-days-unit", "");
      if (subEl) subEl.textContent = "Today is the day";
    } else if (parts.days >= 1) {
      if (daysEl) daysEl.textContent = String(parts.days);
      setText("nt-days-unit", parts.days === 1 ? "day to go" : "days to go");
      if (subEl) subEl.textContent = "and " + parts.hours + "h " + pad2(parts.minutes) + "m";
    } else {
      if (daysEl) daysEl.textContent = String(parts.hours);
      setText("nt-days-unit", "hours to go");
      if (subEl) subEl.textContent = pad2(parts.minutes) + " minutes and counting";
    }
  }

  var TILE_COLOURS = ["#ff9fcf", "#bba6ff", "#ffd166", "#7ee8fa", "#a8e6a3", "#ffb3a7"];

  function renderLinks() {
    var host = $("nt-links");
    if (!host) return;
    while (host.firstChild) host.removeChild(host.firstChild);

    if (!settings.links.length) {
      var empty = document.createElement("p");
      empty.className = "nt-links-empty";
      empty.textContent = "Add your first quick link in Settings ♥";
      host.appendChild(empty);
      return;
    }

    settings.links.forEach(function (link, i) {
      var a = document.createElement("a");
      a.className = "nt-tile";
      a.href = link.url;
      a.style.setProperty("--tile", TILE_COLOURS[i % TILE_COLOURS.length]);

      var dot = document.createElement("span");
      dot.className = "nt-tile-dot";
      dot.textContent = (link.title.charAt(0) || "♥").toUpperCase();
      dot.setAttribute("aria-hidden", "true");

      var label = document.createElement("span");
      label.className = "nt-tile-label";
      label.textContent = link.title;

      a.appendChild(dot);
      a.appendChild(label);
      host.appendChild(a);
    });
  }

  function renderContent() {
    var reasonWrap = $("nt-reason-wrap");
    var quoteWrap = $("nt-quote-wrap");
    if (reasonWrap) reasonWrap.hidden = !settings.showReason;
    if (quoteWrap) quoteWrap.hidden = !settings.showQuote;

    setText("nt-reason", reasonForDate(new Date()));
    setText("nt-quote", quoteForDate(new Date()));
  }

  function renderStarfield() {
    var canvas = $("starfield");
    if (canvas) canvas.hidden = !settings.showStarfield;
  }

  function startStarfield() {
    var canvas = $("starfield");
    var ctx = canvas && canvas.getContext ? canvas.getContext("2d") : null;
    if (!canvas || !ctx) return;
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    var stars = [];
    var w = 0;
    var h = 0;

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.min(Math.floor((w * h) / 9000), 160);
      stars = [];
      for (var i = 0; i < count; i += 1) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.3 + 0.3,
          a: Math.random() * 0.5 + 0.25,
          s: Math.random() * 0.012 + 0.003,
          p: Math.random() * Math.PI * 2
        });
      }
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < stars.length; i += 1) {
        var st = stars[i];
        var pulse = 0.72 + Math.sin(t * st.s + st.p) * 0.28;
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 239, 255, " + (st.a * pulse).toFixed(3) + ")";
        ctx.fill();
      }
      window.requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    window.requestAnimationFrame(draw);
  }

  function renderAll() {
    renderClock();
    renderCountdown();
    renderLinks();
    renderContent();
    renderStarfield();
  }

  function save(cb) {
    if (!api || !api.storage || !api.storage.local) return;
    var payload = {};
    payload[STORE] = settings;
    api.storage.local.set(payload, function () {
      if (typeof cb === "function") cb();
    });
  }

  function withSettings(next) {
    settings = next;
    save();
    renderAll();
  }

  function wire() {
    var gear = $("nt-settings");
    if (gear) {
      gear.addEventListener("click", function (ev) {
        ev.preventDefault();
        if (api && api.runtime && api.runtime.openOptionsPage) {
          api.runtime.openOptionsPage();
          return;
        }
        if (typeof location !== "undefined") location.href = "popup.html";
      });
    }

    var shuffle = $("nt-shuffle");
    if (shuffle) {
      shuffle.addEventListener("click", function () {
        setText("nt-quote", randomQuote());
      });
    }

    var resetLinks = $("nt-reset-links");
    if (resetLinks) {
      resetLinks.addEventListener("click", function () {
        withSettings(loadSettings({ links: defaultSettings().links }));
      });
    }
  }

  function boot() {
    wire();
    renderAll();
    startStarfield();

    if (api && api.storage && api.storage.local) {
      api.storage.local.get(STORE, function (data) {
        var stored = data && data[STORE];
        settings = loadSettings(stored);
        if (!stored) save();
        renderAll();
      });

      if (api.storage.onChanged) {
        api.storage.onChanged.addListener(function (changes, area) {
          if (area && area !== "local") return;
          if (changes && changes[STORE]) {
            settings = loadSettings(changes[STORE].newValue);
            renderAll();
          }
        });
      }
    }

    clockTimer = window.setInterval(renderClock, 1000);
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
