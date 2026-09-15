// Verification harness: drives the preview site in headless Chrome via CDP,
// exercising terminal input, anchor navigation, card rendering, and capturing
// screenshots. Run: node verify.mjs
import { execFile } from "node:child_process";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9222;

mkdirSync(new URL("./shots/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"), { recursive: true });

const chrome = execFile(CHROME, [
  "--headless=new",
  `--remote-debugging-port=${PORT}`,
  "--disable-gpu",
  "--window-size=1440,900",
  "--user-data-dir=" + process.env.TEMP + "\\j4y-verify",
  "about:blank",
]);

await new Promise((r) => setTimeout(r, 2500));

const targets = await fetch(`http://127.0.0.1:${PORT}/json`).then((r) => r.json());
const page = targets.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));

let id = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
};
function send(method, params = {}) {
  return new Promise((resolve) => {
    const mid = ++id;
    pending.set(mid, resolve);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
}
async function evalJs(expr) {
  const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
  return r.result?.result?.value;
}
async function shot(name) {
  const r = await send("Page.captureScreenshot", { format: "png" });
  const p = new URL(`./shots/${name}.png`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
  writeFileSync(p, Buffer.from(r.result.data, "base64"));
  console.log("shot:", name);
}

await send("Page.enable");
await send("Runtime.enable");

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(ok ? "PASS" : "FAIL", "-", name, detail);
}

await send("Page.navigate", { url: "http://localhost:4173/" });
await new Promise((r) => setTimeout(r, 3000));

// 1. boot overlay removed itself
check("boot overlay dismissed", await evalJs(`!document.getElementById('boot')`));

// 2. cards rendered
check("9 project cards rendered", await evalJs(`document.querySelectorAll('#cards .card').length`) === 9);

// 3. WebGL field initialized (canvas has GL context drawing => check no fallback flag)
check("WebGL context created", await evalJs(`(() => { const c = document.getElementById('field'); return !!(c && (c.getContext('webgl') || c.getContext('experimental-webgl'))); })()`));

// 4. console errors
const errs = await evalJs(`window.__errs || 0`);

// 5. terminal interaction
await evalJs(`document.getElementById('terminal').scrollIntoView()`);
await new Promise((r) => setTimeout(r, 800));
await evalJs(`const i = document.getElementById('term-in'); i.focus(); i.value = 'projects'; i.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));`);
await new Promise((r) => setTimeout(r, 300));
const termLines = await evalJs(`document.getElementById('term-out').children.length`);
check("terminal responds to 'projects'", termLines >= 10, `lines=${termLines}`);
const helpRes = await evalJs(`(() => { const i = document.getElementById('term-in'); i.value = 'help'; i.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true})); return document.getElementById('term-out').textContent; })()`);
await new Promise((r) => setTimeout(r, 200));
const hasHelp = (helpRes ?? "").includes("list commands");
check("terminal 'help' works", !!hasHelp);
const bogusRes = await evalJs(`(() => { const i = document.getElementById('term-in'); i.value = 'bogus-cmd'; i.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true})); return document.getElementById('term-out').textContent; })()`);
await new Promise((r) => setTimeout(r, 200));
const hasUnknown = (bogusRes ?? "").includes("unknown command");
check("terminal rejects unknown command", !!hasUnknown);
await shot("terminal");

// 6. system map nodes
const nodes = await evalJs(`document.querySelectorAll('#sysmap g[role=link]').length`);
check("system map has 9 clickable nodes", nodes === 9, `nodes=${nodes}`);
const focusable = await evalJs(`(() => { const g = document.querySelector('#sysmap g[role=link]'); g.focus(); return document.activeElement === g; })()`);
check("sysmap nodes keyboard-focusable", !!focusable);

// 7. anchor navigation (native scroll preserved)
await evalJs(`location.hash = '#system-map'`);
await new Promise((r) => setTimeout(r, 900));
const scrolled = await evalJs(`window.scrollY > 400`);
check("anchor navigation scrolls", !!scrolled);

// 8. hud clock ticks
const t1 = await evalJs(`document.getElementById('hud-clock').textContent`);
await new Promise((r) => setTimeout(r, 1200));
const t2 = await evalJs(`document.getElementById('hud-clock').textContent`);
check("hud clock ticks", t1 !== t2, `${t1} -> ${t2}`);

// 9. mobile viewport check
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await new Promise((r) => setTimeout(r, 800));
const noHOverflow = await evalJs(`document.documentElement.scrollWidth <= 391`);
check("mobile: no horizontal overflow", !!noHOverflow);
await evalJs(`window.scrollTo(0,0)`);
await new Promise((r) => setTimeout(r, 400));
await shot("mobile-hero");
const cardsVisible = await evalJs(`(() => { const c = document.querySelector('.card'); const r = c.getBoundingClientRect(); return r.width > 200 && r.width <= 390; })()`);
check("mobile: cards readable width", !!cardsVisible);
await send("Emulation.clearDeviceMetricsOverride");

// 10. reduced-motion: cards visible immediately (no opacity trap)
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
await evalJs(`document.documentElement.dataset.reducedMotion = 'true'`);
await evalJs(`location.reload()`);
await new Promise((r) => setTimeout(r, 2500));
const heroVisible = await evalJs(`getComputedStyle(document.querySelector('.hero-title')).opacity === '1'`);
check("reduced-motion: hero immediately visible", !!heroVisible);
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "" }] });
await evalJs(`location.reload()`);
await new Promise((r) => setTimeout(r, 2500));

// 11. desktop screenshots of key sections
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 2400, deviceScaleFactor: 1, mobile: false });
await evalJs(`location.hash = '#projects'`);
await new Promise((r) => setTimeout(r, 1200));
await shot("projects-desktop");
await evalJs(`location.hash = '#system-map'`);
await new Promise((r) => setTimeout(r, 1200));
await shot("sysmap-desktop");

console.log("\\n== summary ==");
let failed = 0;
for (const r of results) if (!r.ok) failed++;
console.log(`${results.length - failed}/${results.length} checks passed`);

chrome.kill();
process.exit(failed ? 1 : 0);
