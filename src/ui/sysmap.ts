/** SYSTEM MAP — deterministic repository graph grouped by domain.
 *  Pure SVG (no canvas): keyboard-focusable <a> nodes, hover tooltip,
 *  domain clusters laid out in a fixed radial arrangement. */

import { PROJECTS } from "../data/projects";

const DOMAINS = ["NETWORK", "CRYPTO", "REVERSE", "AGENTS", "TOOLS"] as const;
const CLUSTER_COLORS: Record<string, string> = {
  NETWORK: "#5eead4",
  CRYPTO: "#7c8cf8",
  REVERSE: "#4cc2ff",
  AGENTS: "#f0abfc",
  TOOLS: "#94a3b8",
};

const W = 900;
const H = 520;

interface Node {
  name: string;
  repo: string;
  domain: string;
  desc: string;
  x: number;
  y: number;
}

export function renderSysMap(): void {
  const svg = document.getElementById("sysmap");
  const tip = document.getElementById("sysmap-tip");
  if (!svg || !tip) return;
  svg.innerHTML = "";

  const NS = "http://www.w3.org/2000/svg";
  const cx = W / 2;
  const cy = H / 2;

  // cluster anchors on a ring
  const anchors = new Map<string, { x: number; y: number }>();
  DOMAINS.forEach((d, i) => {
    const ang = (i / DOMAINS.length) * Math.PI * 2 - Math.PI / 2;
    anchors.set(d, { x: cx + Math.cos(ang) * 300, y: cy + Math.sin(ang) * 175 });
  });

  const nodes: Node[] = [];
  const byDomain = new Map<string, Project[]>();
  for (const p of PROJECTS) {
    const list = byDomain.get(p.domain) ?? [];
    list.push(p);
    byDomain.set(p.domain, list);
  }

  for (const [domain, projects] of byDomain) {
    const a = anchors.get(domain) ?? { x: cx, y: cy };
    projects.forEach((p, i) => {
      const spread = projects.length > 1 ? (i - (projects.length - 1) / 2) * 74 : 0;
      const ang = Math.atan2(a.y - cy, a.x - cx) + Math.PI; // inward
      const px = a.x + Math.cos(ang) * 68 + Math.cos(ang + Math.PI / 2) * spread;
      const py = a.y + Math.sin(ang) * 68 + Math.sin(ang + Math.PI / 2) * spread;
      nodes.push({ name: p.name, repo: p.repo, domain: p.domain, desc: p.desc, x: px, y: py });
    });
  }

  const el = (tag: string, attrs: Record<string, string | number>): SVGElement => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
    return e;
  };

  // subtle grid backdrop
  svg.appendChild(el("rect", { width: W, height: H, fill: "none" }));

  // cluster hulls: faint circles behind each anchor
  for (const [domain, a] of anchors) {
    svg.appendChild(
      el("circle", {
        cx: a.x, cy: a.y, r: 96,
        fill: "none",
        stroke: CLUSTER_COLORS[domain] ?? "#1a2230",
        "stroke-opacity": 0.16,
        "stroke-dasharray": "3 5",
      }),
    );
    const label = el("text", {
      x: a.x, y: a.y - 108,
      "text-anchor": "middle",
      fill: CLUSTER_COLORS[domain] ?? "#8b95a7",
      "font-size": 12,
      "letter-spacing": 3,
      "font-family": "ui-monospace, monospace",
      opacity: 0.85,
    });
    label.textContent = domain;
    svg.appendChild(label);
  }

  // spokes: anchor -> member nodes; cross-links for real relationships
  const edges: Array<[Node, Node, number]> = [];
  for (const n of nodes) {
    const a = anchors.get(n.domain)!;
    edges.push([{ ...n, x: a.x, y: a.y }, n, 0.14]);
  }
  // cross-domain relations observed in the codebases
  const cross: Array<[string, string]> = [
    ["fastcrypto-rs", "rust-reality"],
    ["reverse-mcp", "grok-build"],
    ["rust-xhttp", "rust-reality"],
    ["cline-proxy", "grok-build"],
    ["rnc", "rust-reality"],
  ];
  for (const [aName, bName] of cross) {
    const a = nodes.find((n) => n.name === aName);
    const b = nodes.find((n) => n.name === bName);
    if (a && b) edges.push([a, b, 0.3]);
  }
  for (const [a, b, op] of edges) {
    svg.appendChild(
      el("line", {
        x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        stroke: "#2a3548", "stroke-width": 1, "stroke-opacity": op,
      }),
    );
  }

  // nodes
  for (const n of nodes) {
    const g = el("g", { tabindex: 0, role: "link", "aria-label": `${n.name} — ${n.desc}` });
    g.style.cursor = "pointer";
    g.setAttribute("focusable", "true");

    const color = CLUSTER_COLORS[n.domain] ?? "#8b95a7";
    const halo = el("circle", { cx: n.x, cy: n.y, r: 16, fill: color, opacity: 0 });
    const dot = el("circle", { cx: n.x, cy: n.y, r: 6, fill: color, opacity: 0.9 });
    const text = el("text", {
      x: n.x, y: n.y - 12,
      "text-anchor": "middle",
      fill: "#e8edf5",
      "font-size": 11.5,
      "font-family": "ui-monospace, monospace",
    });
    text.textContent = n.name;

    const show = () => {
      halo.setAttribute("opacity", "0.18");
      tip.hidden = false;
      tip.innerHTML = `<div class="t-name">${n.name}</div><div class="t-desc">${n.desc}</div>`;
      const r = svg.getBoundingClientRect();
      tip.style.left = `${Math.min((n.x / W) * r.width + 12, r.width - 290)}px`;
      tip.style.top = `${(n.y / H) * r.height + 14}px`;
    };
    const hide = () => {
      halo.setAttribute("opacity", "0");
      tip.hidden = true;
    };

    g.addEventListener("pointerenter", show);
    g.addEventListener("pointerleave", hide);
    g.addEventListener("focus", show);
    g.addEventListener("blur", hide);
    g.addEventListener("click", () => window.open(n.repo, "_blank", "noopener"));
    g.addEventListener("keydown", (e) => {
      if ((e as KeyboardEvent).key === "Enter") window.open(n.repo, "_blank", "noopener");
    });

    g.append(halo, dot, text);
    svg.appendChild(g);
  }
}

type Project = (typeof PROJECTS)[number];
