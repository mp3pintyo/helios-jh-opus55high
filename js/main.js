// ÜGYAKTA NV-2026-1108 — oldalvezérlés: Helios-motor, helyszín, görgetett kamera, interaktív elemek.
import { buildCrimeScene, SHOTS } from "./scene.js";
import * as D from "./data.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAGS = { ok: "Igazolt", claim: "Állítás", spec: "Elemzés / spekuláció", denied: "Tagadott / vitatott" };
const tag = (k) => `<span class="tag ${k}">${TAGS[k]}</span>`;
const srcLinks = (src = []) => src.map((s) => `<a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)}</a>`).join(" · ");

/* =============================== tartalom renderelése =============================== */

function renderTimeline() {
  $("#timeline").innerHTML = D.TIMELINE.map((e) => `
    <div class="tl-item${e.hot ? " hot" : ""}">
      <div class="tl-date">${esc(e.date)}${e.sub ? `<small>${esc(e.sub)}</small>` : ""}</div>
      <div class="tl-body">
        ${tag(e.tag)}
        <h4>${esc(e.title)}</h4>
        <p>${e.text}</p>
        ${e.src ? `<div class="src">Forrás: ${srcLinks(e.src)}</div>` : ""}
      </div>
    </div>`).join("");
  const io = new IntersectionObserver((es) => es.forEach((x) => x.isIntersecting && (x.target.classList.add("in"), io.unobserve(x.target))), { rootMargin: "0px 0px -12% 0px" });
  $$(".tl-item").forEach((el) => io.observe(el));
}

function renderBoard() {
  const board = $("#board");
  const svg = $("#board-svg");
  const nodes = Object.fromEntries(D.NODES.map((n) => [n.id, n]));
  board.insertAdjacentHTML("beforeend", D.NODES.map((n) => `
    <button class="node ${n.color || ""}" data-id="${n.id}" style="left:${n.x}%;top:${n.y}%;--rot:${n.rot || 0}deg" aria-label="${esc(n.label)}">
      <span class="ph">${esc(n.ph)}</span>
      <span class="nm">${esc(n.label)}</span>
      <span class="rl">${esc(n.role)}</span>
    </button>`).join(""));

  // A címkék külön, a fotók fölötti rétegen, hogy ne takarják el őket.
  board.insertAdjacentHTML("beforeend", `<svg id="board-labels" aria-hidden="true" style="z-index:6;pointer-events:none"></svg>`);
  const labels = $("#board-labels");
  const nodeEls = Object.fromEntries($$(".node", board).map((el) => [el.dataset.id, el]));
  const draw = () => {
    const w = board.clientWidth, h = board.clientHeight;
    const any = nodeEls.jensen;
    const hw = any.offsetWidth / 2 + 6, hh = any.offsetHeight / 2 + 8;
    // a fotók középpontja pixelben, a tábla szélein belül tartva
    const pos = {};
    for (const n of D.NODES) {
      const px = Math.min(w - hw, Math.max(hw, (n.x / 100) * w));
      const py = Math.min(h - hh, Math.max(hh, (n.y / 100) * h));
      pos[n.id] = [px, py];
      nodeEls[n.id].style.left = px + "px";
      nodeEls[n.id].style.top = py + "px";
    }
    const pin = any.offsetHeight / 2;
    for (const s of [svg, labels]) s.setAttribute("viewBox", `0 0 ${w} ${h}`);
    let paths = "", texts = "";
    D.EDGES.forEach(([a, b, label, kind], i) => {
      const [x1, ya] = pos[a], [x2, yb] = pos[b];
      const y1 = ya - pin, y2 = yb - pin;
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + Math.hypot(x2 - x1, y2 - y1) * 0.12; // fonal belógása
      const len = Math.hypot(x2 - x1, y2 - y1) * 1.08 + 20;
      const lx = 0.25 * x1 + 0.5 * mx + 0.25 * x2, ly = 0.25 * y1 + 0.5 * my + 0.25 * y2;
      paths += `<path class="string ${kind || ""}" data-a="${a}" data-b="${b}" d="M${x1},${y1} Q${mx},${my} ${x2},${y2}" style="--len:${len.toFixed(0)};--d:${(i * 0.12).toFixed(2)}s"/>`;
      if (label) texts += `<text class="elabel" data-a="${a}" data-b="${b}" x="${lx}" y="${ly}" text-anchor="middle">${esc(label)}</text>`;
    });
    svg.innerHTML = paths;
    labels.innerHTML = texts;
  };
  draw();
  new ResizeObserver(draw).observe(board);
  new IntersectionObserver((es) => es.forEach((x) => x.isIntersecting && board.classList.add("drawn")), { threshold: 0.3 }).observe(board);

  const dossier = $("#dossier");
  let selected = null;
  const select = (id) => {
    selected = id;
    $$(".node", board).forEach((el) => el.classList.toggle("sel", el.dataset.id === id));
    show(id);
  };
  const show = (id) => {
    const n = nodes[id];
    if (!n) { board.classList.remove("focus"); dossier.innerHTML = D.DOSSIER_HINT; return; }
    const linked = new Set([id]);
    $$(".string, .elabel", board).forEach((p) => {
      const on = p.dataset.a === id || p.dataset.b === id;
      p.classList.toggle("on", on);
      if (on) { linked.add(p.dataset.a); linked.add(p.dataset.b); }
    });
    $$(".node", board).forEach((el) => el.classList.toggle("on", linked.has(el.dataset.id)));
    board.classList.add("focus");
    dossier.innerHTML = `<p class="kicker">${esc(n.dossier.kicker)}</p><h3>${esc(n.label)}</h3>
      ${n.dossier.status ? tag(n.dossier.status) : ""}
      <ul>${n.dossier.facts.map((f) => `<li>${f}</li>`).join("")}</ul>`;
  };
  board.addEventListener("click", (e) => {
    const b = e.target.closest(".node");
    select(b && b.dataset.id !== selected ? b.dataset.id : null);
  });
  board.addEventListener("mouseover", (e) => { const b = e.target.closest(".node"); if (b && !selected) show(b.dataset.id); });
  board.addEventListener("mouseleave", () => { if (!selected) show(null); });
  dossier.innerHTML = D.DOSSIER_HINT;
}

function renderStats() {
  $("#stats").innerHTML = D.STATS.map((s) => `
    <div class="stat"><div class="v${s.neg ? " neg" : ""}" data-count="${s.n}" data-dec="${s.dec || 0}" data-pre="${esc(s.pre || "")}" data-suf="${esc(s.suf || "")}">${esc(s.pre || "")}0${esc(s.suf || "")}</div>
      <div class="l">${s.label}</div><div class="s">${esc(s.src)}</div></div>`).join("");
  const io = new IntersectionObserver((es) => es.forEach((x) => {
    if (!x.isIntersecting) return;
    io.unobserve(x.target);
    $$("[data-count]", x.target).forEach((el) => {
      const to = Number(el.dataset.count), dec = Number(el.dataset.dec), t0 = performance.now(), dur = reduced ? 1 : 1600;
      const fmt = (v) => el.dataset.pre + v.toLocaleString("hu-HU", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + el.dataset.suf;
      const step = (t) => { const k = Math.min(1, (t - t0) / dur); el.textContent = fmt(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
  }), { threshold: 0.35 });
  io.observe($("#stats"));
  renderChart();
}

// Árfolyam-diagram: péntek záró → hétfő mélypont → hétfő záró → kedd előpiac, és a társak.
function renderChart() {
  const W = 760, H = 250, pad = { l: 120, r: 70, t: 26, b: 34 };
  const pts = D.PRICE;
  const lo = 165, hi = 192;
  const x = (i) => pad.l + (i / (pts.length - 1)) * (W - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const path = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const grid = [170, 175, 180, 185, 190].map((v) => `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="rgba(255,255,255,.07)"/><text x="${pad.l - 62}" y="${y(v) + 4}" fill="#5e6857" font-size="11" text-anchor="end" font-family="IBM Plex Mono">$${v}</text>`).join("");
  const dots = pts.map((p, i) => `<g><circle cx="${x(i)}" cy="${y(p.v)}" r="5" fill="${p.v < 175 ? "#ff3b2f" : "#76b900"}" stroke="#000" stroke-width="2"/>
      <text x="${x(i)}" y="${y(p.v) - 12}" fill="#e8ede2" font-size="12" text-anchor="middle" font-family="IBM Plex Mono" font-weight="600">$${p.v.toLocaleString("hu-HU", { minimumFractionDigits: 2 })}</text>
      <text x="${x(i)}" y="${H - 10}" fill="#98a28e" font-size="11" text-anchor="middle" font-family="IBM Plex Mono">${esc(p.l)}</text></g>`).join("");
  const peerW = 760, peerH = 34 * D.PEERS.length + 20;
  const maxAbs = 14;
  const mid = 330;
  const peers = D.PEERS.map((p, i) => {
    const w = (Math.abs(p.v) / maxAbs) * (peerW - mid - 70);
    const yy = 10 + i * 34;
    const neg = p.v < 0;
    return `<text x="${mid - 12}" y="${yy + 17}" fill="${neg ? "#ff3b2f" : "#e8ede2"}" font-size="13" text-anchor="end" font-family="IBM Plex Mono">${esc(p.n)}</text>
      <rect x="${neg ? mid - w * 0 : mid}" y="${yy + 4}" width="0" height="18" fill="${neg ? "#ff3b2f" : "#76b900"}" data-w="${w}" ${neg ? `transform="translate(${-w},0)"` : ""} opacity="${neg ? 1 : 0.85}"/>
      <text x="${neg ? mid - w - 8 : mid + w + 8}" y="${yy + 18}" fill="${neg ? "#ff3b2f" : "#a4e400"}" font-size="12.5" text-anchor="${neg ? "end" : "start"}" font-family="IBM Plex Mono" font-weight="600">${p.v > 0 ? "+" : ""}${p.v.toLocaleString("hu-HU")}%</text>`;
  }).join("");
  $("#chart").innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Az NVDA árfolyama november 6. és 10. között">
      ${grid}
      <path d="${path}" fill="none" stroke="#76b900" stroke-width="2.5" stroke-linejoin="round" style="filter:drop-shadow(0 0 6px rgba(118,185,0,.6))"/>
      ${dots}
    </svg>
    <div class="cap">${D.PRICE_CAP}</div>`;
  $("#peers").innerHTML = `
    <svg viewBox="0 0 ${peerW} ${peerH}" role="img" aria-label="Chipcégek árfolyamváltozása november 9-én">
      <line x1="${mid}" x2="${mid}" y1="0" y2="${peerH}" stroke="rgba(255,255,255,.18)"/>${peers}
    </svg>
    <div class="cap">${D.PEERS_CAP}</div>`;
  const io = new IntersectionObserver((es) => es.forEach((x) => {
    if (!x.isIntersecting) return;
    io.disconnect();
    $$("#peers rect").forEach((r, i) => setTimeout(() => { r.style.transition = "width 1s cubic-bezier(.2,.8,.2,1)"; r.setAttribute("width", r.dataset.w); }, i * 90));
  }), { threshold: 0.4 });
  io.observe($("#peers"));
}

function renderLangs() {
  const tabs = $("#lang-tabs"), panel = $("#lang-panel");
  tabs.innerHTML = D.LANGS.map((l, i) => `<button role="tab" aria-selected="${i === 0}" data-i="${i}"><b>${esc(l.code)}</b>${esc(l.name)}</button>`).join("");
  const show = (i) => {
    const l = D.LANGS[i];
    $$("button", tabs).forEach((b) => b.setAttribute("aria-selected", b.dataset.i == i));
    panel.innerHTML = `<div class="tabpanel" lang="${l.lang}">
      <div class="frame-line">„${esc(l.frame)}”</div>
      <div class="lang-grid">
        <ul>${l.points.map((p) => `<li>${p}</li>`).join("")}</ul>
        <div>${l.quotes.map((q) => `<blockquote class="q"><span class="orig" lang="${l.lang}">${esc(q.o)}</span>${q.t ? `<span class="tr">${esc(q.t)}</span>` : ""}<cite>${q.c}</cite></blockquote>`).join("")}</div>
      </div></div>`;
  };
  tabs.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) show(Number(b.dataset.i)); });
  tabs.addEventListener("keydown", (e) => {
    if (!["ArrowRight", "ArrowLeft"].includes(e.key)) return;
    const cur = Number($("[aria-selected=true]", tabs).dataset.i);
    const nx = (cur + (e.key === "ArrowRight" ? 1 : -1) + D.LANGS.length) % D.LANGS.length;
    show(nx); $$("button", tabs)[nx].focus();
  });
  show(0);
}

function renderFaults() {
  $("#faults").innerHTML = D.FAULTS.map((f) => `
    <div class="fault ${f.cls} reveal">
      <div class="word">${esc(f.word)}</div>
      <h4>${esc(f.sub)}</h4>
      <p>${f.text}</p>
      <div class="meter"><span>RIZIKÓ</span><span class="bar"><span data-w="${f.risk}"></span></span><span>${f.risk}/10</span></div>
    </div>`).join("");
}

const ICONS = {
  gpu: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="9" width="26" height="14" rx="1"/><circle cx="12" cy="16" r="4"/><circle cx="22" cy="16" r="4"/><path d="M6 23v3M10 23v3M14 23v3M18 23v3"/></svg>',
  dc: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="6" y="3" width="20" height="26" rx="1"/><path d="M6 10h20M6 17h20M6 24h20"/><circle cx="10" cy="6.5" r=".8" fill="currentColor"/><circle cx="10" cy="13.5" r=".8" fill="currentColor"/><circle cx="10" cy="20.5" r=".8" fill="currentColor"/></svg>',
  lock: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="7" y="14" width="18" height="14" rx="1"/><path d="M11 14v-4a5 5 0 0 1 10 0v4"/><path d="M16 19v4"/></svg>',
  mem: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="10" width="26" height="12" rx="1"/><path d="M7 14h3v4H7zM13 14h3v4h-3zM19 14h3v4h-3z"/><path d="M6 22v3M26 22v3"/></svg>',
  road: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 26 12 6M28 26 20 6M16 8v3M16 15v3M16 22v3"/></svg>',
  rival: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 24 12 14l5 5 11-12"/><path d="M21 7h7v7"/></svg>',
};
function renderImpacts() {
  $("#impacts").innerHTML = D.IMPACTS.map((m) => `
    <div class="impact reveal">
      <div class="ico">${ICONS[m.icon]}</div>
      <div><h4>${esc(m.title)}</h4><p>${m.text}</p></div>
      <div class="gauge">${esc(m.gaugeLabel)}<div class="dots ${m.tone || ""}">${[1, 2, 3, 4, 5].map((k) => `<i class="${k <= m.level ? "on" : ""}"></i>`).join("")}</div>${esc(m.when)}</div>
    </div>`).join("");
}

function renderScenarios() {
  const pick = $("#scen-pick"), body = $("#scen-body");
  pick.innerHTML = D.SCENARIOS.map((s, i) => `<button class="${s.cls}" aria-pressed="${i === 1}" data-i="${i}"><span class="p">${esc(s.p)}</span><span class="t">${esc(s.title)}</span></button>`).join("");
  const show = (i) => {
    const s = D.SCENARIOS[i];
    $$("button", pick).forEach((b) => b.setAttribute("aria-pressed", b.dataset.i == i));
    body.innerHTML = `<div class="scen-body"><p class="lede">${s.summary}</p><div class="cols">
      <div><h5>Mi kell hozzá</h5><ul>${s.if.map((x) => `<li>${x}</li>`).join("")}</ul></div>
      <div><h5>Nvidia</h5><ul>${s.nvidia.map((x) => `<li>${x}</li>`).join("")}</ul></div>
      <div><h5>Videókártyák</h5><ul>${s.gpu.map((x) => `<li>${x}</li>`).join("")}</ul></div>
    </div></div>`;
  };
  pick.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) show(Number(b.dataset.i)); });
  show(1);
}

function renderLedger() {
  const tb = $("#ledger tbody");
  tb.innerHTML = D.LEDGER.map((r) => `<tr data-k="${r.k}"><td>${tag(r.k)}</td><td>${r.text}</td><td>${esc(r.src)}</td></tr>`).join("");
  const f = $("#filters");
  const counts = D.LEDGER.reduce((a, r) => ((a[r.k] = (a[r.k] || 0) + 1), a), {});
  f.innerHTML = [["all", "Mind", D.LEDGER.length], ...Object.keys(TAGS).filter((k) => counts[k]).map((k) => [k, TAGS[k], counts[k]])]
    .map(([k, l, n], i) => `<button data-k="${k}" aria-pressed="${i === 0}">${esc(l)} · ${n}</button>`).join("");
  f.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    $$("button", f).forEach((x) => x.setAttribute("aria-pressed", x === b));
    $$("tr", tb).forEach((tr) => tr.classList.toggle("hide", b.dataset.k !== "all" && tr.dataset.k !== b.dataset.k));
  });
}

function renderSources() {
  $("#sources").innerHTML = D.SOURCES.map((g) => `
    <div class="src-group"><h4>${esc(g.lang)} <span>${g.items.length} forrás</span></h4><ol>
      ${g.items.map((s) => `<li><a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)}</a>${s.n ? ` <small>— ${esc(s.n)}</small>` : ""}</li>`).join("")}
    </ol></div>`).join("");
}

function renderBrief() {
  $("#brief").innerHTML = D.BRIEF.map((b, i) => `<div class="b reveal"><div class="n">BIZONYÍTÉK ${String(i + 1).padStart(2, "0")}</div><p>${b}</p></div>`).join("");
}

/* =============================== mozgás, felfedés =============================== */

function wireReveals() {
  const io = new IntersectionObserver((es) => es.forEach((x) => {
    if (!x.isIntersecting) return;
    x.target.classList.add("in");
    $$(".meter .bar span", x.target).forEach((s) => (s.style.width = s.dataset.w * 10 + "%"));
    io.unobserve(x.target);
  }), { rootMargin: "0px 0px -10% 0px" });
  $$(".reveal").forEach((el) => io.observe(el));
}

function typeTitle() {
  const el = $("#typed");
  const text = el.dataset.text;
  if (reduced) { el.textContent = text; return; }
  let i = 0;
  const tick = () => { el.textContent = text.slice(0, ++i); if (i < text.length) setTimeout(tick, 28 + Math.random() * 40); };
  setTimeout(tick, 600);
}

/* =============================== Helios: a helyszín =============================== */

let engine = null;
const cam = { from: null, to: SHOTS.intro, cur: SHOTS.intro.slice(), t0: 0, dur: 2200 };
let shotName = "intro";
let explore = false;

function setShot(name) {
  if (!SHOTS[name] || name === shotName) return;
  shotName = name;
  cam.from = cam.cur.slice();
  cam.to = SHOTS[name];
  cam.t0 = performance.now();
  $("#hud-shot").textContent = D.SHOT_LABELS[name] || name;
}

const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
function cameraLoop(t) {
  requestAnimationFrame(cameraLoop);
  if (!engine || explore) return;
  if (cam.from) {
    const k = Math.min(1, (t - cam.t0) / (reduced ? 1 : cam.dur));
    const e = ease(k);
    cam.cur = cam.from.map((v, i) => v + (cam.to[i] - v) * e);
    if (k >= 1) cam.from = null;
  } else {
    cam.cur = cam.to.slice();
  }
  // lassú "kézikamera" lebegés a szem körül
  const s = reduced ? 0 : 1;
  const sway = [Math.sin(t * 0.00021) * 0.35 * s, Math.sin(t * 0.00033) * 0.12 * s, Math.cos(t * 0.00017) * 0.35 * s];
  const c = cam.cur;
  engine.heliosLookAt(c[0] + sway[0], c[1] + sway[1], c[2] + sway[2], c[3], c[4], c[5]);
}

function wireChapters() {
  const rail = $(".rail");
  const chapters = $$("[data-shot]");
  rail.innerHTML = chapters.map((c) => `<a href="#${c.id}" data-for="${c.id}">${esc(c.dataset.rail || "")}</a>`).join("");
  const io = new IntersectionObserver((es) => {
    es.forEach((x) => {
      if (!x.isIntersecting) return;
      setShot(x.target.dataset.shot);
      $$("a", rail).forEach((a) => a.classList.toggle("on", a.dataset.for === x.target.id));
    });
  }, { rootMargin: "-45% 0px -45% 0px" });
  chapters.forEach((c) => io.observe(c));
}

const veilLog = [];
function log(line, frac) {
  veilLog.push("> " + line);
  $("#veil-log").textContent = veilLog.slice(-6).join("\n");
  if (frac !== undefined) $("#veil-bar").style.width = Math.round(frac * 100) + "%";
}
function dropVeil() { $("#veil").classList.add("gone"); document.body.classList.remove("loading"); }

async function startEngine() {
  log("ügyakta megnyitva · NV-2026-1108", 0.04);
  if (!navigator.gpu) {
    log("nincs WebGPU ebben a böngészőben → a helyszín 3D rekonstrukciója kimarad", 1);
    log("az akta így is olvasható (Chrome / Edge 113+ ajánlott)");
    $("#stage").classList.add("nogpu");
    window.__sceneFailed = true;
    setTimeout(dropVeil, 1600);
    return;
  }
  globalThis.heliosConfig = { scene: "gallery", embedded: true, statusElement: "engine-status" };
  try {
    log("Helios motor betöltése (WebGPU · Rust/wasm)…", 0.1);
    const m = await import("../pkg/helios_demo.js");
    await m.default();
    log("helyszín alapjának sütése a böngészőben…", 0.2);
    for (let i = 0; i < 900 && !m.heliosScene(); i++) await new Promise((r) => setTimeout(r, 100));
    if (!m.heliosScene()) throw new Error($("#engine-status").textContent || "időtúllépés");
    log("helyszín rekonstruálása: chip, Peking, Megaspeed, pénz, Fehér Ház…", 0.35);
    await buildCrimeScene(m, (f) => { $("#veil-bar").style.width = Math.round((0.35 + f * 0.6) * 100) + "%"; });
    engine = m;
    const c = SHOTS.intro;
    m.heliosLookAt(...c);
    // A Helios progresszívan fordítja a shadereket: az első képig várunk, közben a motor saját
    // állapotsorát (heliosBusy) mutatjuk, hogy a fátyol ne fekete vászonra húzódjon fel.
    for (let i = 0, last = ""; i < 600 && !(m.heliosFrames?.() > 0); i++) {
      const busy = m.heliosBusy?.() || "";
      if (busy && busy.replace(/[\d.]+ s/, "") !== last) { last = busy.replace(/[\d.]+ s/, ""); log("GPU: " + busy); }
      await new Promise((r) => setTimeout(r, 100));
    }
    log("piros fonalak kifeszítve · fények be · kamera élesítve", 1);
    window.__sceneReady = true;
    $("#explore-btn").hidden = false;
    observeVisibility();
    setInterval(updateHud, 1000);
    setTimeout(dropVeil, 700);
  } catch (e) {
    console.error(e);
    log("a motor nem indult el: " + (e?.message || e), 1);
    $("#stage").classList.add("nogpu");
    window.__sceneFailed = true;
    setTimeout(dropVeil, 2400);
  }
}

function observeVisibility() {
  const sync = () => engine?.heliosSetPaused(document.hidden);
  document.addEventListener("visibilitychange", sync);
}

function updateHud() {
  const hud = engine?.heliosHud() || "";
  const ms = /GPU ([\d.]+) ms/.exec(hud);
  const fps = /\((\d+) fps\)/.exec(hud);
  $("#hud-gpu").textContent = ms ? `GPU ${ms[1]} ms · ${fps ? fps[1] : "–"} fps` : "";
  const now = new Date();
  $("#hud-time").textContent = now.toLocaleDateString("hu-HU") + " " + now.toLocaleTimeString("hu-HU");
}

function wireExplore() {
  const btn = $("#explore-btn"), canvas = $("#helios-canvas");
  btn.addEventListener("click", () => {
    explore = !explore;
    document.body.classList.toggle("explore", explore);
    btn.innerHTML = explore ? "✕ Vissza az aktához" : "⌖ Helyszínbejárás";
    if (explore) { canvas.style.zIndex = 5; canvas.style.position = "fixed"; canvas.focus(); }
    else { canvas.style.zIndex = ""; canvas.style.position = ""; cam.from = null; }
  });
  addEventListener("keydown", (e) => { if (explore && e.key === "Escape") btn.click(); });
}

/* =============================== indulás =============================== */

renderBrief();
renderTimeline();
renderBoard();
renderStats();
renderLangs();
renderFaults();
renderImpacts();
renderScenarios();
renderLedger();
renderSources();
wireReveals();
wireChapters();
wireExplore();
typeTitle();
$("#veil-skip").addEventListener("click", dropVeil);
requestAnimationFrame(cameraLoop);
startEngine();
