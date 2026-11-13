// skillrosa index page: loads the full index (skills.json) and renders matches on demand.
// The static HTML already lists the official tier, so the page stays useful without JS.
// All remote strings are written with textContent only (never innerHTML).
(function () {
  "use strict";
  var PAGE = 80;
  var NEW_FALLBACK_DAYS = 14;

  var $ = function (id) { return document.getElementById(id); };
  var q = $("q"), cat = $("cat"), tier = $("tier"), src = $("src"), onlyNew = $("onlynew");
  var list = $("list"), count = $("count"), empty = $("empty"), more = $("more");

  // Label lookups are taken from the <select> options the server already rendered.
  function labelMap(select) {
    var map = {};
    Array.prototype.forEach.call(select.options, function (o) {
      if (o.value) map[o.value] = o.textContent.replace(/\s*\(\d+\)\s*$/, "");
    });
    return map;
  }
  var catLabels = labelMap(cat), tierLabels = labelMap(tier), srcLabels = labelMap(src);

  function chip(text, cls) {
    var s = document.createElement("span");
    s.className = "b" + (cls ? " " + cls : "");
    s.textContent = text;
    return s;
  }

  function rowFor(s) {
    var li = document.createElement("li");
    li.className = "row";
    var a = document.createElement("a");
    a.className = "name";
    a.href = "skill.html?id=" + encodeURIComponent(s.id);
    a.textContent = s.name;
    var d = document.createElement("span");
    d.className = "desc";
    d.textContent = s.description.length > 260 ? s.description.slice(0, 260) + "…" : s.description;
    var meta = document.createElement("span");
    meta.className = "meta";
    if (s.new) meta.appendChild(chip("yeni", "new"));
    if (s.deprecated) meta.appendChild(chip("kullanımdan kalktı", "warn"));
    meta.appendChild(chip(tierLabels[s.tier] || s.tier, "tier-" + s.tier));
    meta.appendChild(chip(catLabels[s.category] || s.category));
    meta.appendChild(chip(srcLabels[s.source] || s.source));
    meta.appendChild(chip(s.license, "lic"));
    if (s.flags && s.flags.length) meta.appendChild(chip("dikkat: " + s.flags.join(", "), "warn"));
    li.appendChild(a); li.appendChild(d); li.appendChild(meta);
    return li;
  }

  var all = [];      // full index once loaded
  var matches = [];  // current filter result
  var shown = 0;

  function filter() {
    var words = q.value.toLowerCase().split(/\s+/).filter(Boolean);
    matches = all.filter(function (s) {
      if (cat.value && s.category !== cat.value) return false;
      if (tier.value && s.tier !== tier.value) return false;
      if (src.value && s.source !== src.value) return false;
      if (onlyNew.checked && !s.new) return false;
      for (var i = 0; i < words.length; i++) if (s._q.indexOf(words[i]) === -1) return false;
      return true;
    });
    shown = 0;
    list.textContent = "";
    renderMore();
    count.textContent = matches.length + " skill";
    empty.hidden = matches.length !== 0;
  }

  function renderMore() {
    var frag = document.createDocumentFragment();
    var end = Math.min(shown + PAGE, matches.length);
    for (; shown < end; shown++) frag.appendChild(rowFor(matches[shown]));
    list.appendChild(frag);
    more.hidden = shown >= matches.length;
  }

  var timer;
  function schedule() { clearTimeout(timer); timer = setTimeout(filter, 80); } // debounce for phones

  fetch("skills.json", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
    .then(function (data) {
      all = data.skills.map(function (s) {
        s._q = (s.name + " " + s.description + " " + s.category + " " + s.source).toLowerCase();
        return s;
      });
      [q, cat, tier, src, onlyNew].forEach(function (el) {
        el.addEventListener(el === q ? "input" : "change", schedule);
      });
      more.addEventListener("click", renderMore);
      filter();
    })
    .catch(function () {
      // Fallback: filter the statically rendered rows only.
      var rows = Array.prototype.slice.call(list.querySelectorAll(".row"));
      q.addEventListener("input", function () {
        var words = q.value.toLowerCase().split(/\s+/).filter(Boolean);
        rows.forEach(function (row) {
          var hay = row.getAttribute("data-q") || "";
          row.hidden = !words.every(function (w) { return hay.indexOf(w) !== -1; });
        });
      });
    });

  var btn = $("copy-prompt");
  if (btn) {
    btn.addEventListener("click", function () {
      var text = $("prompt-text").textContent;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          btn.textContent = "Kopyalandı";
          setTimeout(function () { btn.textContent = "Kopyala"; }, 1500);
        }, function () {});
      }
    });
  }
})();
