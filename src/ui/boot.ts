/** Boot sequence — fast, honest, non-blocking.
 *  Content is accessible immediately (pointer-events pass through after
 *  the first line; the overlay fades out within ~1.1 s regardless). */

const LINES: Array<[string, string]> = [
  ["tag", "jterm v1.0 — initializing"],
  ["ok", "network online"],
  ["ok", "rust toolchain ready"],
  ["ok", "agent interface ready"],
];

export function runBoot(): void {
  const boot = document.getElementById("boot");
  const log = document.getElementById("boot-log");
  if (!boot || !log) return;

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const finish = (): void => {
    boot.classList.add("done");
    setTimeout(() => boot.remove(), 600);
  };

  if (reduced) {
    finish();
    return;
  }

  // release interaction early — the overlay only covers visuals
  boot.style.pointerEvents = "none";

  let i = 0;
  const tick = (): void => {
    if (i >= LINES.length) {
      setTimeout(finish, 180);
      return;
    }
    const [cls, text] = LINES[i++]!;
    const span = document.createElement("span");
    span.className = cls;
    span.textContent = (cls === "ok" ? "  [ ok ] " : "  >>    ") + text + "\n";
    log.appendChild(span);
    setTimeout(tick, 130 + Math.random() * 90);
  };
  tick();

  // absolute failsafe: never hold the page hostage
  setTimeout(finish, 1600);
}
