/** Project cards — rendered from verified data, revealed on scroll. */

import { PROJECTS, type Project } from "../data/projects";

function cardEl(p: Project): HTMLElement {
  const a = document.createElement("a");
  a.className = "card";
  a.href = p.repo;
  a.target = "_blank";
  a.rel = "noopener";
  a.setAttribute("aria-label", `${p.name} — ${p.desc} (opens GitHub)`);

  const top = document.createElement("div");
  top.className = "card-top";
  top.innerHTML = `<span class="card-name">${p.name}</span><span class="card-domain">${p.domain}</span>`;

  const desc = document.createElement("p");
  desc.className = "card-desc";
  desc.textContent = p.desc;

  const diff = document.createElement("p");
  diff.className = "card-diff";
  diff.innerHTML = `<b>▸</b> ${p.diff}`;

  const meta = document.createElement("div");
  meta.className = "card-meta";
  const forkTag = p.fork ? ` <span class="fork">extended fork</span>` : "";
  meta.innerHTML =
    `<span><b>LANG</b>${p.lang}</span>` +
    `<span><b>STATUS</b>${p.status}</span>` +
    `<span><b>FOCUS</b>${p.focus}</span>${forkTag}`;

  a.append(top, desc, diff, meta);
  return a;
}

export function renderCards(): void {
  const root = document.getElementById("cards");
  if (!root) return;
  for (const p of PROJECTS) root.appendChild(cardEl(p));

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          (e.target as HTMLElement).classList.add("in");
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.12 },
  );
  root.querySelectorAll(".card").forEach((c) => io.observe(c));
}
