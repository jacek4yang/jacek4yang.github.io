/** jterm — a navigation terminal. Responds to a fixed command set;
 *  never pretends to be a shell. Fully keyboard accessible. */

import { PROJECTS } from "../data/projects";

const OUT = document.getElementById("term-out");
const IN = document.getElementById("term-in") as HTMLInputElement | null;
const TERM = document.getElementById("term");

const BANNER = [
  "jterm v1.0 — navigation interface (not a shell)",
  "type `help` for commands",
  "",
].join("\n");

const HELP = [
  "help        list commands",
  "projects    list all repositories with domains",
  "stack       show the technical stack summary",
  "system-map  jump to the system map section",
  "github      open github.com/jacek4yang",
  "open <repo> open a repository (e.g. open rust-reality)",
  "about       who is this",
  "clear       clear the screen",
].join("\n");

const STACK = [
  "systems    Rust · tokio · zero-copy · splice · assembly hot paths",
  "network    TCP/IP · DNS/DoH/DoQ · VLESS/REALITY/XHTTP · QUIC",
  "security   IDA/idalib · binary analysis · AEAD · ML-KEM · DNSSEC",
  "agents     MCP · protocol gateways · coding-agent infrastructure",
].join("\n");

const ABOUT = [
  "Jacek Yang — systems developer.",
  "Builds fast network software, reverse-engineering infrastructure,",
  "cryptographic experiments and developer agents. Mostly in Rust.",
  "",
  "Every claim on this site maps to a public repository.",
].join("\n");

function print(text: string, cls = ""): void {
  if (!OUT) return;
  const div = document.createElement("div");
  if (cls) div.className = cls;
  div.textContent = text;
  OUT.appendChild(div);
  OUT.scrollTop = OUT.scrollHeight;
}

function printHtml(html: string): void {
  if (!OUT) return;
  const div = document.createElement("div");
  div.innerHTML = html;
  OUT.appendChild(div);
  OUT.scrollTop = OUT.scrollHeight;
}

const COMMANDS: Record<string, (arg: string) => void> = {
  help: () => print(HELP, "t-dim"),
  projects: () => {
    for (const p of PROJECTS) {
      printHtml(
        `<span class="t-acc">${p.name.padEnd(15)}</span> ${p.domain.padEnd(8)} ${p.desc} — ` +
          `<a href="${p.repo}" target="_blank" rel="noopener">repo ↗</a>`,
      );
    }
  },
  stack: () => print(STACK),
  "system-map": () => {
    print("navigating → #system-map", "t-dim");
    document.getElementById("system-map")?.scrollIntoView({ behavior: "smooth" });
  },
  github: () => {
    print("opening github.com/jacek4yang …", "t-dim");
    window.open("https://github.com/jacek4yang", "_blank", "noopener");
  },
  open: (arg: string) => {
    const p = PROJECTS.find((x) => x.name === arg.trim());
    if (p) {
      print(`opening ${p.name} …`, "t-dim");
      window.open(p.repo, "_blank", "noopener");
    } else {
      print(`no such repo: ${arg || "(empty)"} — try \`projects\``, "t-cmd");
    }
  },
  about: () => print(ABOUT),
  clear: () => {
    if (OUT) OUT.textContent = "";
  },
};

function handle(raw: string): void {
  const input = raw.trim();
  printHtml(`<span class="t-cmd">jacek@j4y:~$</span> ${escapeHtml(input)}`);
  if (!input) return;
  const [cmd, ...rest] = input.split(/\s+/);
  const fn = COMMANDS[cmd ?? ""];
  if (fn) fn(rest.join(" "));
  else print(`jterm: unknown command: ${cmd} — type \`help\``, "t-cmd");
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

export function initTerminal(): void {
  if (!OUT || !IN) return;
  print(BANNER, "t-dim");

  const history: string[] = [];
  let hIdx = -1;

  IN.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const v = IN.value;
      if (v.trim()) history.push(v.trim());
      hIdx = history.length;
      IN.value = "";
      handle(v);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (hIdx > 0) IN.value = history[--hIdx] ?? "";
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (hIdx < history.length - 1) IN.value = history[++hIdx] ?? "";
      else { hIdx = history.length; IN.value = ""; }
    }
  });

  // clicking anywhere on the terminal focuses the input (keyboard-first UX)
  TERM?.addEventListener("click", () => IN.focus());
}
