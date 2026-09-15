/** Entry point — wires the field, boot, cards, system map, terminal, HUD. */

import "./style/main.css";
import { startField } from "./gl/field";
import { runBoot } from "./ui/boot";
import { renderCards } from "./ui/cards";
import { renderSysMap } from "./ui/sysmap";
import { initTerminal } from "./ui/terminal";

function hudClock(): void {
  const el = document.getElementById("hud-clock");
  if (!el) return;
  const tick = () => {
    el.textContent = new Date().toISOString().slice(11, 19) + "Z";
  };
  tick();
  setInterval(tick, 1000);
}

// section reveal on scroll (native scrolling preserved — no scroll-jacking)
function revealSections(): void {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) (e.target as HTMLElement).classList.add("in");
      }
    },
    { threshold: 0.08 },
  );
  document.querySelectorAll(".section-h, .section-p, .sysmap-wrap, .term, .contact-links")
    .forEach((el) => {
      el.classList.add("reveal");
      io.observe(el);
    });
}

startField(document.getElementById("field") as HTMLCanvasElement);
runBoot();
renderCards();
renderSysMap();
initTerminal();
hudClock();
revealSections();

// ---- SPA-free anchor polish: no hash pollution, native behaviour kept -------
document.querySelectorAll<HTMLAnchorElement>('.hud-nav a, .hero-cta').forEach((a) => {
  a.addEventListener("click", () => {
    history.replaceState(null, "", a.hash);
  });
});
