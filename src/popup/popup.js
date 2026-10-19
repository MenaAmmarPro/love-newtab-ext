"use strict";

/*
 * love-newtab-ext — settings page (used both as the toolbar popup and, when
 * opened in a tab, as the options page).
 *
 * All pure logic lives on `window.MenaNewTab`; this file only reads/writes the
 * form and talks to `api.storage.local`.
 */

(function () {
  var NT = (typeof globalThis !== "undefined" && globalThis.MenaNewTab) || null;

  function $(id) {
    return document.getElementById(id);
  }

  function status(message) {
    var el = $("pp-status");
    if (el) el.textContent = message || "";
  }

  function defaults() {
    return NT ? NT.defaultSettings() : { links: [] };
  }

  function loadInto(settings) {
    var s = settings || defaults();
    set("pp-you", s.you);
    set("pp-me", s.me);
    set("pp-date", s.reunionDate);
    set("pp-label", s.reunionLabel);
    check("pp-reason", s.showReason);
    check("pp-quote", s.showQuote);
    check("pp-starfield", s.showStarfield);
    check("pp-24", s.clock24);
    renderLinks(s.links || []);
  }

  function set(id, value) {
    var el = $(id);
    if (el) el.value = value == null ? "" : String(value);
  }

  function check(id, value) {
    var el = $(id);
    if (el) el.checked = !!value;
  }

  function val(id) {
    var el = $(id);
    return el && typeof el.value === "string" ? el.value : "";
  }

  function isChecked(id) {
    var el = $(id);
    return !!(el && el.checked);
  }

  function linkRow(link) {
    var row = document.createElement("div");
    row.className = "pp-link-row";

    var title = document.createElement("input");
    title.type = "text";
    title.className = "pp-link-title";
    title.placeholder = "Title";
    title.maxLength = 40;
    title.value = link && link.title ? link.title : "";

    var url = document.createElement("input");
    url.type = "text";
    url.className = "pp-link-url";
    url.placeholder = "https://…";
    url.value = link && link.url ? link.url : "";

    var remove = document.createElement("button");
    remove.type = "button";
    remove.className = "pp-remove";
    remove.setAttribute("aria-label", "Remove link");
    remove.textContent = "×";
    remove.addEventListener("click", function () {
      row.remove();
    });

    row.appendChild(title);
    row.appendChild(url);
    row.appendChild(remove);
    return row;
  }

  function renderLinks(links) {
    var host = $("pp-links");
    if (!host) return;
    while (host.firstChild) host.removeChild(host.firstChild);
    (links || []).forEach(function (link) {
      host.appendChild(linkRow(link));
    });
  }

  function collectLinks() {
    var host = $("pp-links");
    if (!host) return [];
    var rows = host.querySelectorAll(".pp-link-row");
    var out = [];
    for (var i = 0; i < rows.length; i += 1) {
      var titleEl = rows[i].querySelector(".pp-link-title");
      var urlEl = rows[i].querySelector(".pp-link-url");
      out.push({
        title: titleEl ? titleEl.value : "",
        url: urlEl ? urlEl.value : ""
      });
    }
    return out;
  }

  function collectSettings() {
    var base = defaults();
    return {
      you: val("pp-you") || base.you,
      me: val("pp-me") || base.me,
      reunionDate: val("pp-date") || base.reunionDate,
      reunionLabel: val("pp-label") || base.reunionLabel,
      links: NT ? NT.sanitiseLinks(collectLinks()) : collectLinks(),
      showReason: isChecked("pp-reason"),
      showQuote: isChecked("pp-quote"),
      showStarfield: isChecked("pp-starfield"),
      clock24: isChecked("pp-24")
    };
  }

  function saveSettings(settings, message) {
    if (!api || !api.storage || !api.storage.local) {
      status("Storage is unavailable here.");
      return;
    }
    var payload = {};
    payload[NT ? NT.STORE : "mena-newtab"] = settings;
    api.storage.local.set(payload, function () {
      status(message || "Saved ♥");
      window.setTimeout(function () {
        if ($("pp-status") && $("pp-status").textContent === (message || "Saved ♥")) status("");
      }, 1800);
    });
  }

  function boot() {
    loadInto(defaults());

    if (api && api.storage && api.storage.local) {
      api.storage.local.get(NT ? NT.STORE : "mena-newtab", function (data) {
        var stored = data && data[NT ? NT.STORE : "mena-newtab"];
        loadInto(stored ? (NT ? NT.loadSettings(stored) : stored) : defaults());
      });
    }

    var form = $("pp-form");
    if (form) {
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        saveSettings(collectSettings());
      });
    }

    var add = $("pp-add");
    if (add) {
      add.addEventListener("click", function () {
        var host = $("pp-links");
        if (host && host.children.length >= (NT ? NT.MAX_LINKS : 12)) {
          status("That's the most links we can show.");
          return;
        }
        if (host) host.appendChild(linkRow({ title: "", url: "" }));
      });
    }

    var open = $("pp-open");
    if (open) {
      open.addEventListener("click", function () {
        if (api && api.tabs && api.tabs.create && api.runtime && api.runtime.getURL) {
          api.tabs.create({ url: api.runtime.getURL("src/newtab/newtab.html") });
        }
      });
    }

    var reset = $("pp-reset");
    if (reset) {
      reset.addEventListener("click", function () {
        saveSettings(defaults(), "Back to the beginning ♥");
        loadInto(defaults());
      });
    }
  }

  if (typeof document !== "undefined" && document && typeof document.addEventListener === "function") {
    document.addEventListener("DOMContentLoaded", boot);
  }
})();
