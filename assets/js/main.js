// Progressive enhancement: everything is readable without this file.
(function () {
  const root = document.documentElement;
  root.classList.add("js");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Header border on scroll
  const header = document.querySelector(".site-header");
  const onScroll = () => header && header.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Mobile nav
  const toggle = document.querySelector(".nav-toggle");
  if (toggle) {
    const close = () => { document.body.classList.remove("nav-open"); toggle.setAttribute("aria-expanded", "false"); };
    toggle.addEventListener("click", () => {
      const open = document.body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    document.querySelectorAll(".nav a").forEach((a) => a.addEventListener("click", close));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  }

  // Split headings into lines that slide up
  document.querySelectorAll("[data-split]").forEach((el) => {
    const lines = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = lines
      .map((line, i) => `<span class="split-line" style="--d:${(i * 0.09).toFixed(2)}s"><span>${line.trim()}</span></span>`)
      .join("");
    if (!el.hasAttribute("data-reveal")) el.setAttribute("data-reveal", "fade");
  });

  // Stagger children
  document.querySelectorAll("[data-stagger]").forEach((group) => {
    const step = parseFloat(group.dataset.stagger) || 0.08;
    [...group.children].forEach((child, i) => {
      child.setAttribute("data-reveal", child.getAttribute("data-reveal") || "");
      child.style.setProperty("--d", `${(i * step).toFixed(2)}s`);
    });
  });

  // Count-up numbers
  const countUp = (el) => {
    const target = parseFloat(el.dataset.count);
    const decimals = (el.dataset.count.split(".")[1] || "").length;
    const prefix = el.dataset.prefix || "";
    const suffix = el.dataset.suffix || "";
    const final = `${prefix}${target.toFixed(decimals)}${suffix}`;
    if (reduceMotion) { el.textContent = final; return; }
    const duration = 1600;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      el.textContent = `${prefix}${(target * eased).toFixed(decimals)}${suffix}`;
      if (t < 1) requestAnimationFrame(tick); else el.textContent = final;
    };
    requestAnimationFrame(tick);
  };

  const revealables = document.querySelectorAll("[data-reveal], [data-count]");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add("is-in");
        if (el.dataset.count && !el.dataset.done) { el.dataset.done = "1"; countUp(el); }
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    revealables.forEach((el) => io.observe(el));
  } else {
    revealables.forEach((el) => el.classList.add("is-in"));
  }

  // Looping videos: play only while visible, never for reduced-motion users
  const loops = document.querySelectorAll("video[data-loop]");
  if (reduceMotion) {
    loops.forEach((v) => { v.removeAttribute("autoplay"); v.pause(); v.controls = true; });
  } else if ("IntersectionObserver" in window) {
    const vio = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (isIntersecting) target.play().catch(() => {}); else target.pause();
      });
    }, { threshold: 0.2 });
    loops.forEach((v) => vio.observe(v));
  }

  // Footer year
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
})();
