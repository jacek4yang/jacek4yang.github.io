/** Project data — every field verified against the live repository
 *  (README + languages API, September 2026). Forks are labelled. */

export interface Project {
  name: string;
  repo: string;
  domain: "NETWORK" | "CRYPTO" | "REVERSE" | "AGENTS" | "TOOLS";
  desc: string;
  diff: string; // one-line technical differentiator, evidence-based
  lang: string;
  status: "active" | "stable" | "R&D";
  focus: string;
  fork?: true;
}

export const PROJECTS: Project[] = [
  {
    name: "rust-reality",
    repo: "https://github.com/jacek4yang/rust-reality",
    domain: "NETWORK",
    desc: "From-scratch VLESS + REALITY + Vision proxy server, Xray-compatible.",
    diff: "Kernel splice relays + zero-copy record batching; Handoff topology sheds ~82% line CPU/GiB.",
    lang: "Rust + Assembly",
    status: "active",
    focus: "transport · TLS 1.3 · performance",
  },
  {
    name: "reverse-mcp",
    repo: "https://github.com/jacek4yang/reverse-mcp",
    domain: "REVERSE",
    desc: "MCP server giving AI agents headless IDA Pro 9.2 via native idalib.",
    diff: "17 tools, optimistic concurrency on every mutation, honest capability failure.",
    lang: "Rust",
    status: "active",
    focus: "binary analysis · agent tooling",
  },
  {
    name: "egressdns",
    repo: "https://github.com/jacek4yang/egressdns",
    domain: "NETWORK",
    desc: "Egress-aware adaptive DNS caching forwarder for enterprise LANs.",
    diff: "DoT/DoH2/DoH3/DoQ with DNSSEC; transports chosen by live measurement, never config.",
    lang: "Rust",
    status: "active",
    focus: "DNS · DNSSEC · HA",
  },
  {
    name: "fastcrypto-rs",
    repo: "https://github.com/jacek4yang/fastcrypto-rs",
    domain: "CRYPTO",
    desc: "Cryptographic R&D staging for rust-reality; benchmark-driven.",
    diff: "Adopts a primitive only when it beats the incumbent on real workload shapes (~12.3% CPU win on X25519).",
    lang: "Assembly + Rust",
    status: "R&D",
    focus: "X25519 · AES-GCM · ML-KEM",
  },
  {
    name: "cline-proxy",
    repo: "https://github.com/jacek4yang/cline-proxy",
    domain: "AGENTS",
    desc: "Rust gateway exposing OpenAI + Anthropic APIs over pooled Cline keys.",
    diff: "Strict 429-only rotation invariant; Healthy→Cooling→HalfOpen pool with single-flight probing.",
    lang: "Rust",
    status: "active",
    focus: "protocol gateway · SSE translation",
  },
  {
    name: "rnc",
    repo: "https://github.com/jacek4yang/rnc",
    domain: "TOOLS",
    desc: "Binary-safe Rust netcat for TCP/UDP pipelines and CTF terminals.",
    diff: "Native static nc.exe with full UTF-8/GBK/GB18030 console conversion on Windows.",
    lang: "Rust",
    status: "stable",
    focus: "sockets · Windows console",
  },
  {
    name: "agent-pulse",
    repo: "https://github.com/jacek4yang/agent-pulse",
    domain: "AGENTS",
    desc: "Windows scheduler that resumes terminal AI coding agents after quota resets.",
    diff: "Verified-foreground input injection; schedules survive sleep and reconcile missed runs.",
    lang: "Rust + TypeScript",
    status: "active",
    focus: "automation · Win32",
  },
  {
    name: "grok-build",
    repo: "https://github.com/jacek4yang/grok-build",
    domain: "AGENTS",
    desc: "Model-agnostic coding-agent harness with multi-provider protocols.",
    diff: "Extended fork used as a daily driver — semantic tool execution, cross-platform runtime.",
    lang: "Rust",
    status: "active",
    focus: "coding agent · runtime",
    fork: true,
  },
  {
    name: "rust-xhttp",
    repo: "https://github.com/jacek4yang/rust-xhttp",
    domain: "NETWORK",
    desc: "Pure-Rust XHTTP/VLESS server compatible with official Xray-core clients.",
    diff: "Wire-compatible with Xray-core without borrowing its code.",
    lang: "Rust",
    status: "stable",
    focus: "transport · VLESS",
  },
];
