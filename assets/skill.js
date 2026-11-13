// skillrosa skill page: reads skills/<id>/meta.json and loads SKILL.md live from upstream.
// Nothing remote is ever inserted as HTML; everything goes through textContent.
(function () {
  "use strict";
  var root = document.getElementById("detail");
  var MAX_CHARS = 200000;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function link(href, text) {
    var a = el("a", "", text);
    a.href = href; a.rel = "noopener";
    return a;
  }
  function fail(msg) { root.textContent = ""; root.appendChild(el("p", "note", msg)); }

  // The id is used to build a fetch path, so accept safe characters only.
  var id = new URLSearchParams(location.search).get("id") || "";
  if (!/^[A-Za-z0-9._-]+$/.test(id)) { fail("Geçersiz skill kimliği."); return; }

  fetch("skills/" + id + "/meta.json", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
    .then(render)
    .catch(function () { fail("Skill bulunamadı. İndeks güncellenmiş ve bu skill kaldırılmış olabilir."); });

  function render(m) {
    document.title = m.name + " · skillrosa";
    root.textContent = "";
    root.appendChild(el("h1", "", m.name));
    root.appendChild(el("p", "lead", m.description));

    var badges = el("p", "badges");
    [m.tier, m.category, m.source.label, m.license].forEach(function (t, i) {
      var b = el("span", "b" + (i === 3 ? " lic" : ""), t);
      badges.appendChild(b);
    });
    if (m.first_seen) badges.appendChild(el("span", "b", "ilk görüldü: " + m.first_seen));
    root.appendChild(badges);

    if ((m.flags && m.flags.length) || m.deprecated) {
      var box = el("div", "warnbox");
      if (m.deprecated) box.appendChild(el("p", "", "Bu kaynak kullanımdan kalktı olarak işaretli."));
      if (m.flags && m.flags.length) {
        box.appendChild(el("p", "", "Sezgisel tarama şunları işaretledi: " + m.flags.join(", ") +
          ". Bu bir güvenlik denetimi değildir; kurmadan önce içeriği ve scripts/ dosyalarını oku."));
      }
      root.appendChild(box);
    }

    root.appendChild(el("h2", "", "AI için kurulum"));
    var cmd = el("pre", "cmd", m.install.shell);
    root.appendChild(cmd);
    var copy = el("button", "copy", "Komutu kopyala");
    copy.type = "button";
    copy.addEventListener("click", function () {
      if (navigator.clipboard) navigator.clipboard.writeText(m.install.shell);
      copy.textContent = "Kopyalandı";
    });
    root.appendChild(copy);

    var links = el("p", "links");
    links.appendChild(link("skills/" + m.id + "/meta.json", "meta.json"));
    links.appendChild(document.createTextNode(" · "));
    links.appendChild(link(m.source.url, "GitHub kaynağı"));
    links.appendChild(document.createTextNode(" · "));
    links.appendChild(link(m.upstream_raw_url, "SKILL.md (ham)"));
    root.appendChild(links);
    root.appendChild(el("p", "note", "Lisans: " + m.license + " (" + m.license_basis + "). Kaynak commit: " + m.source.commit.slice(0, 10) + "."));

    root.appendChild(el("h2", "", "Paket dosyaları (" + m.files.length + ")"));
    var ul = el("ul", "files");
    m.files.forEach(function (f) {
      var li = document.createElement("li");
      li.appendChild(link(f.url, f.path));
      ul.appendChild(li);
    });
    root.appendChild(ul);

    if (m.also_in && m.also_in.length) {
      root.appendChild(el("h2", "", "Aynı içerik şurada da var"));
      var al = el("ul");
      m.also_in.forEach(function (a) { al.appendChild(el("li", "", a.repo + " / " + a.path)); });
      root.appendChild(al);
    }

    root.appendChild(el("h2", "", "SKILL.md (kaynaktan canlı)"));
    var holder = el("pre", "md", "Yükleniyor…");
    root.appendChild(holder);
    if (!m.show_inline) {
      holder.className = "note";
      holder.textContent = "Lisans (" + m.license + ") bu sayfada içerik göstermeye uygun değil ya da skill düzeyinde belirsiz. Kaynaktan oku: " + m.upstream_raw_url;
      return;
    }
    loadLive(m.live_urls, 0, holder);
  }

  // Try jsDelivr first, then raw.githubusercontent.com; both are pinned to the indexed commit.
  function loadLive(urls, i, holder) {
    if (i >= urls.length) {
      holder.className = "note";
      holder.textContent = "Kaynaktan okunamadı. Ham bağlantıyı doğrudan aç.";
      return;
    }
    fetch(urls[i])
      .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.text(); })
      .then(function (t) {
        holder.textContent = t.length > MAX_CHARS ? t.slice(0, MAX_CHARS) + "\n\n[… kısaltıldı, tamamı için ham bağlantıyı aç]" : t;
      })
      .catch(function () { loadLive(urls, i + 1, holder); });
  }
})();
