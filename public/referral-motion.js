"use strict";
(() => {
  const scene = document.querySelector(".referral-visual");
  if (!scene) return;
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const html = document.documentElement;
  let inView = false;
  const update = () => {
    scene.classList.toggle(
      "is-playing",
      inView && !preference.matches && !html.classList.contains("motion-paused"),
    );
  };
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        inView = entries.some((entry) => entry.isIntersecting);
        update();
      },
      { threshold: 0.2 },
    );
    observer.observe(scene);
  } else {
    inView = true;
    update();
  }
  preference.addEventListener?.("change", update);
  document.getElementById("motion-toggle")?.addEventListener("click", () => {
    queueMicrotask(update);
  });
  document.addEventListener("visibilitychange", () => {
    scene.classList.toggle("is-playing", !document.hidden && inView && !preference.matches && !html.classList.contains("motion-paused"));
  });
})();