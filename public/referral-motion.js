"use strict";
(() => {
  const scene = document.querySelector(".referral-visual");
  if (!scene) return;

  const svg = scene.querySelector(".referral-routes");
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const html = document.documentElement;
  let inView = false;
  let playing = false;

  // The SVG timeline is paused until this exact illustration is substantially
  // on screen. Resetting on re-entry gives every visitor the complete story.
  svg?.pauseAnimations?.();
  const update = () => {
    const shouldPlay =
      inView &&
      !document.hidden &&
      !preference.matches &&
      !html.classList.contains("motion-paused");
    if (shouldPlay === playing) return;
    if (shouldPlay) {
      svg?.setCurrentTime?.(0);
      svg?.unpauseAnimations?.();
    } else {
      svg?.pauseAnimations?.();
    }
    scene.classList.toggle("is-playing", shouldPlay);
    playing = shouldPlay;
  };

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        inView = entries.some((entry) => entry.isIntersecting);
        update();
      },
      { threshold: 0.55, rootMargin: "0px 0px -12% 0px" },
    );
    observer.observe(scene);
  } else {
    // Without intersection support, keep the diagram readable and static.
    inView = false;
  }

  preference.addEventListener?.("change", update);
  document.getElementById("motion-toggle")?.addEventListener("click", () => {
    queueMicrotask(update);
  });
  document.addEventListener("visibilitychange", update);
})();
