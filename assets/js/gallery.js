// Strategy to Execution: data-driven discipline tabs, preview grid and lightbox.
// Content lives in assets/data/gallery.json and is edited through Pages CMS (see .pages.yml).
// Add `?edit` to the page URL to preview a local image in the lightbox before uploading it (temporary, never saved).
(function () {
  const root = document.querySelector("[data-gallery]");
  const dialog = document.querySelector(".lightbox");
  if (!root || !dialog) return;

  const tablist = root.querySelector(".gallery-tabs");
  const panel = root.querySelector(".gallery-panel");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const editMode = new URLSearchParams(location.search).has("edit");
  const localPreviews = {}; // "catIndex-itemIndex" -> object URL

  const lb = {
    media: dialog.querySelector(".lb-media"),
    count: dialog.querySelector(".lb-count"),
    title: dialog.querySelector("#lb-title"),
    caption: dialog.querySelector(".lb-caption"),
    role: dialog.querySelector(".lb-role"),
    link: dialog.querySelector(".lb-link"),
    prev: dialog.querySelector(".lb-prev"),
    next: dialog.querySelector(".lb-next"),
    close: dialog.querySelector(".lb-close"),
    upload: dialog.querySelector(".lb-upload"),
    file: dialog.querySelector(".lb-upload input"),
  };

  let categories = [];
  let current = 0;
  let open = null; // [catIndex, itemIndex]
  let opener = null;

  const playIcon = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5v9l7.5-4.5z" fill="currentColor"/></svg>';

  fetch(root.dataset.gallery)
    .then((r) => r.json())
    .then((data) => {
      categories = data.categories.filter((c) => c.items && c.items.length);
      buildTabs();
      // Open on the first discipline with a full row of three, keeping the brief's tab order
      const full = categories.findIndex((c) => c.items.length >= 3);
      select(Math.max(0, full), false);
    })
    .catch(() => {
      panel.innerHTML = '<p>Work samples are shown on each <a href="#work">case study page</a>.</p>';
    });

  function buildTabs() {
    tablist.innerHTML = "";
    categories.forEach((cat, i) => {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = "gallery-tab";
      tab.id = `tab-${cat.id}`;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", "gallery-panel");
      tab.textContent = cat.name;
      tab.addEventListener("click", () => select(i, true));
      tab.addEventListener("keydown", onTabKey);
      tablist.appendChild(tab);
    });
    panel.id = "gallery-panel";
  }

  function onTabKey(e) {
    const last = categories.length - 1;
    const map = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: last };
    if (!(e.key in map)) return;
    e.preventDefault();
    let next = map[e.key];
    if (next > last) next = 0;
    if (next < 0) next = last;
    select(next, true);
    tablist.children[next].focus();
  }

  function select(i, animate) {
    current = i;
    [...tablist.children].forEach((tab, j) => {
      tab.setAttribute("aria-selected", String(j === i));
      tab.tabIndex = j === i ? 0 : -1;
    });
    panel.setAttribute("aria-labelledby", `tab-${categories[i].id}`);
    const render = () => {
      panel.innerHTML = "";
      panel.appendChild(buildGrid(i));
    };
    const grid = panel.querySelector(".gallery-grid");
    if (animate && grid && !reduceMotion) {
      grid.classList.add("is-swapping");
      setTimeout(render, 200);
    } else {
      render();
    }
  }

  // CMS paths may come back site-absolute ("/assets/…"); the site lives under a subpath, so keep them relative
  const asset = (p) => (p || "").replace(/^\/+/, "");
  const isVideo = (item) => Boolean(item.video);

  function thumbSrc(item, key) {
    return localPreviews[key] || asset(item.image);
  }

  function buildGrid(ci, showAll) {
    const frag = document.createDocumentFragment();
    const ul = document.createElement("ul");
    ul.className = "gallery-grid";
    const items = categories[ci].items;
    items.slice(0, showAll ? items.length : 3).forEach((item, ii) => {
      const key = `${ci}-${ii}`;
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sample";
      btn.setAttribute("aria-haspopup", "dialog");
      const contain = item.fit === "contain" && !localPreviews[key];
      const pos = /^[\w%.\s-]{1,40}$/.test(item.position || "") ? item.position : "";
      btn.innerHTML = `
        <span class="sample-media${contain ? " sample-media--contain" : ""}">
          <img src="${escapeAttr(thumbSrc(item, key))}" alt="${escapeAttr(item.alt)}" loading="lazy"${pos ? ` style="object-position:${pos}"` : ""}>
          ${isVideo(item) && !localPreviews[key] ? `<span class="sample-play">${playIcon}Video</span>` : ""}
        </span>
        <span class="sample-title">${escapeHtml(item.title)}</span>
        <span class="sample-role">${escapeHtml(item.role)}</span>`;
      btn.addEventListener("click", () => openLightbox(ci, ii, btn));
      li.appendChild(btn);
      ul.appendChild(li);
    });
    frag.appendChild(ul);
    if (!showAll && items.length > 3) {
      const more = document.createElement("button");
      more.type = "button";
      more.className = "gallery-more link-arrow";
      more.textContent = `View all ${items.length} ${categories[ci].name.toLowerCase()} samples`;
      more.addEventListener("click", () => {
        panel.innerHTML = "";
        panel.appendChild(buildGrid(ci, true));
        panel.querySelectorAll(".sample")[3]?.focus();
      });
      frag.appendChild(more);
    }
    return frag;
  }

  function openLightbox(ci, ii, trigger) {
    opener = trigger || opener;
    open = [ci, ii];
    const cat = categories[ci];
    const items = cat.items;
    const item = items[ii];
    const key = `${ci}-${ii}`;

    stopMedia();
    lb.media.innerHTML = "";
    if (localPreviews[key] || !isVideo(item)) {
      const img = document.createElement("img");
      img.src = localPreviews[key] || asset(item.image);
      img.alt = item.alt;
      lb.media.appendChild(img);
    } else {
      const video = document.createElement("video");
      video.src = asset(item.video);
      video.poster = asset(item.image);
      video.playsInline = true;
      video.controls = true;
      video.setAttribute("aria-label", item.alt);
      if (!item.audio) {
        video.muted = true;
        video.loop = true;
        if (!reduceMotion) video.autoplay = true;
      }
      lb.media.appendChild(video);
    }

    lb.count.textContent = `${cat.name} · ${ii + 1} of ${items.length}`;
    lb.title.textContent = item.title;
    lb.caption.textContent = item.caption;
    lb.role.textContent = item.role;
    lb.link.hidden = !item.link;
    if (item.link) lb.link.href = item.link;
    lb.prev.hidden = lb.next.hidden = items.length < 2;
    lb.upload.hidden = !editMode;

    if (!dialog.open) {
      dialog.showModal();
      lb.close.focus();
    }
  }

  function step(dir) {
    if (!open) return;
    const n = categories[open[0]].items.length;
    openLightbox(open[0], (open[1] + dir + n) % n);
  }

  function stopMedia() {
    const v = lb.media.querySelector("video");
    if (v) { v.pause(); v.removeAttribute("src"); v.load(); }
  }

  // Every way of closing goes through here; the native "close" event is not fired reliably in every browser
  function closeLightbox() {
    if (dialog.open) dialog.close();
    if (!open) return;
    stopMedia();
    lb.media.innerHTML = "";
    open = null;
    if (opener && document.contains(opener)) opener.focus();
  }

  lb.prev.addEventListener("click", () => step(-1));
  lb.next.addEventListener("click", () => step(1));
  lb.close.addEventListener("click", closeLightbox);
  dialog.addEventListener("click", (e) => { if (e.target === dialog) closeLightbox(); }); // backdrop
  dialog.addEventListener("cancel", (e) => { e.preventDefault(); closeLightbox(); }); // Escape
  dialog.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); closeLightbox(); return; }
    if (e.target.closest("video")) return;
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft") step(-1);
  });
  dialog.addEventListener("close", closeLightbox);

  // Temporary local preview (edit mode only)
  lb.file.addEventListener("change", () => {
    const file = lb.file.files[0];
    if (!file || !file.type.startsWith("image/") || !open) return;
    const key = open.join("-");
    if (localPreviews[key]) URL.revokeObjectURL(localPreviews[key]);
    localPreviews[key] = URL.createObjectURL(file);
    lb.file.value = "";
    const [ci, ii] = open;
    openLightbox(ci, ii);
    if (ci === current) {
      const expanded = panel.querySelectorAll(".sample").length > 3;
      panel.innerHTML = "";
      panel.appendChild(buildGrid(ci, expanded));
      opener = panel.querySelectorAll(".sample")[ii] || opener;
    }
  });

  // Links elsewhere on the page can open a specific discipline, e.g. data-gallery-tab="experiential"
  document.querySelectorAll("[data-gallery-tab]").forEach((a) => {
    a.addEventListener("click", () => {
      const i = categories.findIndex((c) => c.id === a.dataset.galleryTab);
      if (i >= 0) select(i, false);
    });
  });

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }
  function escapeAttr(s) { return escapeHtml(s); }
})();
