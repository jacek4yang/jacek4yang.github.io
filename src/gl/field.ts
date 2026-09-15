/**
 * Interactive WebGL network field — the live background.
 *
 * Points form a drifting topology; near pairs are linked, signal packets
 * travel edges, and the pointer applies a soft repulsion field. Rendered
 * with two primitive-consolidated draw calls (points + lines) in a single
 * program. No dependencies.
 *
 * Constraints honoured:
 *  - adaptive particle count (viewport area + mobile + deviceMemory)
 *  - DPR capped at 2 (1.5 on mobile)
 *  - pauses when document.hidden
 *  - respects prefers-reduced-motion (static frame, no rAF loop)
 *  - graceful no-WebGL fallback (canvas stays transparent; CSS grid shows)
 */

const VERT = `
attribute vec2 a_pos;
attribute vec3 a_meta;   // fade (0..1), kind (0 node / 1 packet), depth
uniform vec2 u_res;
varying float v_fade;
varying float v_kind;
varying float v_depth;
void main() {
  vec2 clip = (a_pos / u_res) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  gl_PointSize = mix(2.0, 3.4, a_meta.z) * (a_meta.y > 0.5 ? 1.6 : 1.0);
  v_fade = a_meta.x;
  v_kind = a_meta.y;
  v_depth = a_meta.z;
}`;

const FRAG = `
precision mediump float;
varying float v_fade;
varying float v_kind;
varying float v_depth;
void main() {
  if (v_kind < 0.5 && v_fade < 0.02) discard;
  vec3 node  = mix(vec3(0.10, 0.13, 0.19), vec3(0.55, 0.58, 0.65), v_fade);
  vec3 hotA  = vec3(0.37, 0.92, 0.83);   // accent cyan
  vec3 hotB  = vec3(0.30, 0.76, 1.00);   // electric blue
  vec3 col   = v_kind > 0.5 ? mix(hotA, hotB, v_depth) : node;
  float alpha = v_kind > 0.5 ? 0.85 : (0.25 + 0.6 * v_fade);
  gl_FragColor = vec4(col, alpha);
}`;

const LINE_VERT = `
attribute vec2 a_pos;
attribute vec2 a_meta;   // fade, hue
uniform vec2 u_res;
varying float v_fade;
varying float v_hue;
void main() {
  vec2 clip = (a_pos / u_res) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  v_fade = a_meta.x;
  v_hue = a_meta.y;
}`;

const LINE_FRAG = `
precision mediump float;
varying float v_fade;
varying float v_hue;
void main() {
  vec3 dim  = vec3(0.10, 0.13, 0.19);
  vec3 acc  = vec3(0.37, 0.92, 0.83);
  vec3 col  = v_hue > 0.5 ? acc : dim;
  float alpha = v_hue > 0.5 ? 0.5 * v_fade : (0.08 + 0.30 * v_fade);
  gl_FragColor = vec4(col, alpha);
}`;

interface P {
  x: number; y: number;
  vx: number; vy: number;
  fade: number;      // visibility toward canvas edges
  hue: boolean;      // accent node?
  depth: number;     // parallax factor 0..1
}

function particleBudget(w: number, h: number): number {
  const area = w * h;
  const mem = (navigator as { deviceMemory?: number }).deviceMemory ?? 8;
  let n = Math.round(area / 11000);
  if (w < 720) n = Math.round(area / 26000);       // mobile
  if (mem <= 4) n = Math.min(n, Math.round(area / 20000));
  return Math.max(24, Math.min(n, 170));
}

export function startField(canvas: HTMLCanvasElement): void {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: true,
    premultipliedAlpha: false,
    powerPreference: "low-power",
  });
  if (!gl) return; // CSS-only fallback: page stays readable on --bg

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let W = 0, H = 0, dpr = 1;
  let pts: P[] = [];
  let packets: { a: number; b: number; t: number; speed: number }[] = [];

  const pointer = { x: -1e4, y: -1e4, active: false };

  function resize(): void {
    const mobile = innerWidth < 720;
    dpr = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    gl!.viewport(0, 0, canvas.width, canvas.height);

    const budget = particleBudget(W, H);
    if (pts.length > budget) pts.length = budget;
    while (pts.length < budget) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      // fade out near the centre-left hero text zone for readability
      const d = Math.hypot(x - W / 2, y - H * 0.42);
      pts.push({
        x, y,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        fade: Math.min(1, Math.max(0, (d - 190) / 260)),
        hue: Math.random() < 0.14,
        depth: Math.random(),
      });
    }
  }

  // ---- program setup -------------------------------------------------------
  function compile(vs: string, fs: string): WebGLProgram {
    const p = gl!.createProgram()!;
    for (const [type, src] of [[gl!.VERTEX_SHADER, vs], [gl!.FRAGMENT_SHADER, fs]] as const) {
      const s = gl!.createShader(type)!;
      gl!.shaderSource(s, src);
      gl!.compileShader(s);
      gl!.attachShader(p, s);
    }
    gl!.linkProgram(p);
    return p;
  }

  const progPts = compile(VERT, FRAG);
  const progLine = compile(LINE_VERT, LINE_FRAG);

  const bufPts = gl.createBuffer();
  const bufLine = gl.createBuffer();

  const uResPts = gl.getUniformLocation(progPts, "u_res");
  const uResLine = gl.getUniformLocation(progLine, "u_res");

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  // ---- simulation ----------------------------------------------------------
  const LINK_DIST = 118;

  function step(dt: number): void {
    // drift + soft pointer repulsion
    for (const p of pts) {
      if (pointer.active) {
        const dx = p.x - pointer.x, dy = p.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 160 * 160 && d2 > 0.01) {
          const f = (1 - Math.sqrt(d2) / 160) * 0.05;
          p.vx += (dx / Math.sqrt(d2)) * f;
          p.vy += (dy / Math.sqrt(d2)) * f;
        }
      }
      p.vx *= 0.985; p.vy *= 0.985;
      // keep a minimum drift so the field never freezes
      if (Math.abs(p.vx) < 0.02) p.vx += (Math.random() - 0.5) * 0.008;
      if (Math.abs(p.vy) < 0.02) p.vy += (Math.random() - 0.5) * 0.008;
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      if (p.x < -20) p.x = W + 20; else if (p.x > W + 20) p.x = -20;
      if (p.y < -20) p.y = H + 20; else if (p.y > H + 20) p.y = -20;
    }

    // occasionally spawn a packet on a linked pair
    if (packets.length < 14 && Math.random() < 0.06) {
      const a = (Math.random() * pts.length) | 0;
      const pa = pts[a];
      if (pa) {
        let best = -1, bd = LINK_DIST * LINK_DIST;
        for (let j = 0; j < pts.length; j += 3) {
          const b = pts[j];
          if (!b || j === a) continue;
          const d = (pa.x - b.x) ** 2 + (pa.y - b.y) ** 2;
          if (d < bd) { bd = d; best = j; }
        }
        if (best >= 0) packets.push({ a, b: best, t: 0, speed: 0.004 + Math.random() * 0.008 });
      }
    }
    packets = packets.filter((pk) => (pk.t += pk.speed * dt * 60) < 1);
  }

  // ---- render --------------------------------------------------------------
  const g = gl;
  function render(): void {
    g.clear(g.COLOR_BUFFER_BIT);

    // lines between near pairs (stride-sampled to bound O(n²))
    let lv = new Float32Array(pts.length * 64);
    let ln = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]!;
      for (let j = i + 1; j < pts.length; j += 2) {
        const b = pts[j]!;
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < LINK_DIST * LINK_DIST) {
          const fade = Math.min(a.fade, b.fade);
          const hue = a.hue && b.hue ? 1 : 0;
          lv.set([a.x, a.y, fade, hue, b.x, b.y, fade, hue], ln);
          ln += 8;
          if (ln >= lv.length - 8) break;
        }
      }
    }
    if (ln > 0) {
      const view = lv.subarray(0, ln);
      g.useProgram(progLine);
      g.uniform2f(uResLine, W, H);
      g.bindBuffer(g.ARRAY_BUFFER, bufLine);
      g.bufferData(g.ARRAY_BUFFER, view, g.DYNAMIC_DRAW);
      const posL = g.getAttribLocation(progLine, "a_pos");
      const metL = g.getAttribLocation(progLine, "a_meta");
      g.enableVertexAttribArray(posL);
      g.vertexAttribPointer(posL, 2, g.FLOAT, false, 16, 0);
      g.enableVertexAttribArray(metL);
      g.vertexAttribPointer(metL, 2, g.FLOAT, false, 16, 8);
      g.drawArrays(g.LINES, 0, ln / 4);
    }

    // points: nodes + packet positions merged into one draw
    let pd = new Float32Array((pts.length + packets.length) * 5);
    let n = 0;
    for (const p of pts) pd.set([p.x, p.y, p.fade, 0, p.depth], n), (n += 5);
    for (const pk of packets) {
      const a = pts[pk.a], b = pts[pk.b];
      if (!a || !b) continue;
      const x = a.x + (b.x - a.x) * pk.t;
      const y = a.y + (b.y - a.y) * pk.t;
      pd.set([x, y, Math.min(a.fade, b.fade), 1, pk.a % 2], n);
      n += 5;
    }
    if (n > 0) {
      g.useProgram(progPts);
      g.uniform2f(uResPts, W, H);
      g.bindBuffer(g.ARRAY_BUFFER, bufPts);
      g.bufferData(g.ARRAY_BUFFER, pd.subarray(0, n), g.DYNAMIC_DRAW);
      const posP = g.getAttribLocation(progPts, "a_pos");
      const metP = g.getAttribLocation(progPts, "a_meta");
      g.enableVertexAttribArray(posP);
      g.vertexAttribPointer(posP, 2, g.FLOAT, false, 20, 0);
      g.enableVertexAttribArray(metP);
      g.vertexAttribPointer(metP, 3, g.FLOAT, false, 20, 8);
      g.drawArrays(g.POINTS, 0, n / 5);
    }
  }

  // ---- loop ----------------------------------------------------------------
  let raf = 0;
  let last = performance.now();
  let running = true;

  function frame(now: number): void {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!document.hidden) {
      step(dt);
      render();
    }
    raf = requestAnimationFrame(frame);
  }

  if (reduced) {
    // one static frame, no animation loop
    resize();
    render();
  } else {
    raf = requestAnimationFrame(frame);
  }

  const onResize = () => { resize(); if (reduced) render(); };
  addEventListener("resize", onResize);
  resize();

  addEventListener("pointermove", (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = true;
  }, { passive: true });
  addEventListener("pointerleave", () => { pointer.active = false; });

  document.addEventListener("visibilitychange", () => {
    if (reduced) return;
    if (document.hidden) {
      running = false;
      cancelAnimationFrame(raf);
    } else if (!running) {
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  });
}
