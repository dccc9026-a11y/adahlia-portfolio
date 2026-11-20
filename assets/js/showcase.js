// Strategy to Execution: discipline tabs plus a lightbox for enlarging work samples.
// Content is plain HTML in index.html; this file only adds behavior.
(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Tabs ---------- */
  const tabsRoot = document.querySelector("[data-tabs]");
  const tabs = tabsRoot ? [...tabsRoot.querySelectorAll('[role="tab"]')] : [];
  const panels = tabs.map((t) => document.getElementById(t.getAttribute("aria-controls")));

  function select(i, focus) {
    tabs.forEach((tab, j) => {
      const on = j === i;
      tab.setAttribute("aria-selected", String(on));
      tab.tabIndex = on ? 0 : -1;
      panels[j].hidden = !on;
      // pause anything playing in panels that just closed
      if (!on) panels[j].querySelectorAll("video").forEach((v) => v.pause());
    });
    if (focus) tabs[i].focus();
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => select(i, false));
    tab.addEventListener("keydown", (e) => {
      const last = tabs.length - 1;
      const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: last }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      select(next > last ? 0 : next < 0 ? last : next, true);
    });
  });

  // Links elsewhere can open a discipline, e.g. data-gallery-tab="experiential"
  document.querySelectorAll("[data-gallery-tab]").forEach((a) => {
    a.addEventListener("click", () => {
      const i = tabs.findIndex((t) => t.id === `tab-${a.dataset.galleryTab}`);
      if (i >= 0) select(i, false);
    });
  });

  /* ---------- Lightbox ---------- */
  const dialog = document.querySelector(".lightbox");
  if (!dialog) return;
  const stage = dialog.querySelector(".lb-media");
  const prev = dialog.querySelector(".lb-prev");
  const next = dialog.querySelector(".lb-next");
  const count = dialog.querySelector(".lb-count");
  let group = [];
  let index = 0;
  let opener = null;

  // An item is anything that can be enlarged: { src, type, alt }
  const itemFrom = (el) => ({
    src: el.dataset.src || el.getAttribute("href"),
    type: el.dataset.type || "image",
    alt: (el.querySelector("img") && el.querySelector("img").alt) || el.getAttribute("aria-label") || "",
  });

  function render() {
    stopMedia();
    const item = group[index];
    stage.innerHTML = "";
    if (item.type === "video") {
      const v = document.createElement("video");
      v.src = item.src;
      v.controls = true;
      v.playsInline = true;
      v.muted = true;
      v.loop = true;
      if (!reduceMotion) v.autoplay = true;
      v.setAttribute("aria-label", item.alt);
      stage.appendChild(v);
    } else {
      const img = document.createElement("img");
      img.src = item.src;
      img.alt = item.alt;
      stage.appendChild(img);
    }
    const many = group.length > 1;
    prev.hidden = next.hidden = !many;
    count.textContent = many ? `${index + 1} / ${group.length}` : "";
  }

  function open(items, i, from) {
    group = items;
    index = i;
    opener = from;
    render();
    if (!dialog.open) dialog.showModal();
    dialog.querySelector(".lb-close").focus();
  }

  function stopMedia() {
    const v = stage.querySelector("video");
    if (v) { v.pause(); v.removeAttribute("src"); v.load(); }
  }

  // The native "close" event is not fired reliably everywhere, so every exit goes through here
  function close() {
    if (dialog.open) dialog.close();
    stopMedia();
    stage.innerHTML = "";
    if (opener && document.contains(opener)) opener.focus();
    opener = null;
  }

  const step = (d) => { index = (index + d + group.length) % group.length; render(); };

  // Samples inside the same panel (or mosaic) browse together
  document.querySelectorAll("[data-lightbox]").forEach((el) => {
    el.addEventListener("click", () => {
      const scope = el.closest(".mosaic") || el.closest(".stx-panel") || document;
      const els = [...scope.querySelectorAll("[data-lightbox]")];
      open(els.map(itemFrom), els.indexOf(el), el);
    });
  });

  // Secondary buttons that open a specific sample, e.g. "View Newsletter"
  document.querySelectorAll("[data-lightbox-trigger]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = document.querySelector(`[data-lightbox][data-src="${btn.dataset.lightboxTrigger}"]`);
      if (target) open([itemFrom(target)], 0, btn);
    });
  });

  // Links that would otherwise open an image file directly (e.g. View Certificate)
  document.querySelectorAll("[data-lightbox-link]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      open([{ src: a.getAttribute("href"), type: "image", alt: a.textContent.trim() }], 0, a);
    });
  });

  prev.addEventListener("click", () => step(-1));
  next.addEventListener("click", () => step(1));
  dialog.querySelector(".lb-close").addEventListener("click", close);
  dialog.addEventListener("click", (e) => { if (e.target === dialog) close(); }); // backdrop
  dialog.addEventListener("cancel", (e) => { e.preventDefault(); close(); }); // Escape
  dialog.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.target.closest("video") || group.length < 2) return;
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft") step(-1);
  });
  dialog.addEventListener("close", () => { if (opener) close(); });
})();
