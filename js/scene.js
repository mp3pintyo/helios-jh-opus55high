// "Helyszínelés" – a Helios galéria-jelenetéből éjszakai bizonyítéktermet épít az editor
// page API-n keresztül (heliosEditorApply). Minden objektum egység-primitív (cube / sphere /
// cylinder: -0.5..0.5), a jelenet anyagait átszínezzük.

const NV = [0.18, 0.62, 0.0];          // NVIDIA zöld (#76B900) lineárisan, kicsit élénkítve
const RED = [1.0, 0.04, 0.03];

function quatY(deg) {
  const a = (deg * Math.PI) / 360;
  return [0, Math.sin(a), 0, Math.cos(a)];
}
// Kvaternió, ami az X tengelyt a (dx,dy,dz) irányba forgatja.
function quatFromX(dx, dy, dz) {
  const len = Math.hypot(dx, dy, dz) || 1;
  const [x, y, z] = [dx / len, dy / len, dz / len];
  // cross((1,0,0), d) = (0, -z, y); dot = x
  const w = 1 + x;
  if (w < 1e-6) return [0, 0, 1, 0];
  const q = [0, -z, y, w];
  const n = Math.hypot(...q);
  return q.map((v) => v / n);
}

export const SPOTS = {
  chip: [0, 0.75, 0],
  beijing: [-5.6, 1.7, -2.2],
  megaspeed: [5.4, 1.3, -2.6],
  money: [4.6, 0.6, 3.4],
  whitehouse: [-4.8, 1.0, 3.4],
  world: [0, 2.1, -7.2],
  letter: [1.55, 0.86, 1.25],
};

export async function buildCrimeScene(H, onStep = () => {}) {
  const apply = (op) => {
    const r = JSON.parse(H.heliosEditorApply(JSON.stringify(op)));
    if (r.error) console.warn("helios op", op.op, r.error);
    return r.created;
  };
  const yieldFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
  const st = JSON.parse(H.heliosEditorState());

  // 1. A galéria kiürítése: minden példány a padlón kívül rejtve, a fények törölve.
  const n = st.instances.mesh.length;
  const hide = [];
  for (let i = 1; i < n; i++) hide.push(i);
  apply({ op: "visibility", instances: hide, visible: false });
  apply({ op: "delete", lights: st.lights.map((l) => l.index) });
  onStep(0.15);
  await yieldFrame();

  // 2. Anyagok: nedves, sötét kőpadló; PCB-zöld lakk; grafit fém; zöld és piros izzó.
  apply({ op: "material", name: "gallery/flagstone", params: { base_color: [0.035, 0.037, 0.04], roughness: 0.18 } });
  apply({ op: "material", name: "gallery/car paint", params: { base_color: [0.004, 0.03, 0.012], roughness: 0.3 } });
  apply({ op: "material", name: "gallery/brushed metal", params: { base_color: [0.05, 0.055, 0.06], roughness: 0.28, metallic: 1.0 } });
  apply({ op: "material", name: "engine/emissive", params: { base_color: NV, emissive: 9.0, emissive_color: NV } });
  apply({ op: "material", name: "gallery/velvet", params: { base_color: RED, emissive: 4.5, emissive_color: RED } });
  apply({ op: "material", name: "gallery/skin", params: { base_color: [0.6, 0.02, 0.02], emissive: 1.6, emissive_color: [1, 0.05, 0.03] } });
  apply({ op: "material", name: "gallery/plinth", params: { base_color: [0.02, 0.02, 0.022], roughness: 0.4 } });
  apply({ op: "material", name: "engine/white", params: { base_color: [0.85, 0.83, 0.78], roughness: 0.7 } });
  onStep(0.3);
  await yieldFrame();

  const place = (item, t, s, r = [0, 0, 0, 1]) => apply({ op: "place", item, transform: { t, r, s } })?.instances ?? [];
  const assign = (ids, material) => ids.length && apply({ op: "assign_material", instances: ids, material });
  const box = (t, s, material, r) => { const ids = place("engine/cube", t, s, r); assign(ids, material); return ids; };

  // 3. A CHIP: talapzat, NYÁK, szilícium lapka, zöld izzó keret, arany lábak.
  box([0, 0.25, 0], [4.2, 0.5, 4.2], "gallery/plinth");
  box([0, 0.56, 0], [3.4, 0.12, 3.4], "gallery/car paint");
  box([0, 0.66, 0], [1.9, 0.1, 1.9], "gallery/brushed metal");
  box([0, 0.72, 0], [1.6, 0.03, 1.6], "gallery/brushed metal");
  for (const [t, s] of [
    [[0, 0.715, 0.98], [2.0, 0.035, 0.05]], [[0, 0.715, -0.98], [2.0, 0.035, 0.05]],
    [[0.98, 0.715, 0], [0.05, 0.035, 2.0]], [[-0.98, 0.715, 0], [0.05, 0.035, 2.0]],
  ]) box(t, s, "engine/emissive");
  // HBM-stackek a lapka mellett
  for (const x of [-1.32, 1.32]) for (const z of [-0.55, 0.55]) box([x, 0.67, z], [0.42, 0.1, 0.62], "gallery/brushed metal");
  // arany érintkezők a NYÁK peremén
  const pins = [];
  for (let i = 0; i < 12; i++) {
    const u = -1.5 + (i * 3.0) / 11;
    pins.push(...box([u, 0.625, 1.62], [0.12, 0.02, 0.14], "engine/gold"));
    pins.push(...box([u, 0.625, -1.62], [0.12, 0.02, 0.14], "engine/gold"));
  }
  onStep(0.5);
  await yieldFrame();

  // 4. A bizonyítékok
  // Peking: vörösen izzó gömb oszlopon
  box([-5.6, 0.55, -2.2], [0.9, 1.1, 0.9], "gallery/plinth");
  assign(place("engine/sphere", [-5.6, 1.62, -2.2], [1.0, 1.0, 1.0]), "gallery/skin");
  // Megaspeed (Szingapúr): szerverrack, zöld LED-csíkokkal
  box([5.4, 1.2, -2.6], [1.1, 2.4, 0.9], "gallery/brushed metal", quatY(-25));
  for (let k = 0; k < 7; k++) box([5.4 + 0.22, 0.35 + k * 0.3, -2.6 + 0.47], [0.6, 0.03, 0.02], "engine/emissive", quatY(-25));
  // A pénz: arany érmeoszlopok
  const stacks = [[4.2, 3.2, 9], [4.75, 3.6, 14], [5.15, 3.0, 6], [4.45, 3.95, 11], [3.75, 3.7, 4]];
  for (const [x, z, count] of stacks) {
    for (let c = 0; c < count; c++) {
      const j = Math.sin(c * 12.9898 + x * 78.233) * 0.025;
      assign(place("engine/cylinder", [x + j, 0.026 + c * 0.052, z - j], [0.42, 0.045, 0.42]), "engine/gold");
    }
  }
  // két aranytömb
  box([3.6, 0.09, 2.85], [0.55, 0.18, 0.26], "engine/gold", quatY(20));
  box([3.75, 0.27, 2.9], [0.55, 0.18, 0.26], "engine/gold", quatY(35));
  // Fehér Ház: három fehér oszlop és egy párkány
  for (const dx of [-0.7, 0, 0.7]) assign(place("engine/cylinder", [-4.8 + dx, 0.9, 3.4], [0.28, 1.8, 0.28]), "engine/white");
  box([-4.8, 1.87, 3.4], [2.0, 0.14, 0.7], "engine/white");
  box([-4.8, 0.04, 3.4], [2.1, 0.08, 0.8], "engine/white");
  // A világgazdaság: nagy üveggömb a háttérben
  assign(place("engine/sphere", [0, 2.1, -7.2], [3.0, 3.0, 3.0]), "engine/glass");
  box([0, 0.2, -7.2], [1.6, 0.4, 1.6], "gallery/plinth");
  // A bocsánatkérő levél a chip szélén, kissé elfordítva
  box([1.55, 0.835, 1.25], [0.42, 0.006, 0.58], "engine/white", quatY(-18));
  onStep(0.7);
  await yieldFrame();

  // 5. Piros fonalak: a nyomozótábla vonalai a térben
  const thread = (a, b) => {
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const len = Math.hypot(...d);
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    const ids = place("engine/cube", mid, [len, 0.02, 0.02], quatFromX(...d));
    assign(ids, "gallery/velvet");
    apply({ op: "cast_shadow", instances: ids, cast_shadow: false });
  };
  const C = [0, 1.0, 0];
  thread(C, [-5.6, 1.62, -2.2]);
  thread(C, [5.15, 2.1, -2.3]);
  thread(C, [4.6, 0.9, 3.4]);
  thread(C, [-4.8, 1.95, 3.4]);
  thread([-5.6, 1.62, -2.2], [5.15, 2.1, -2.3]);
  thread([-4.8, 1.95, 3.4], [-5.6, 1.62, -2.2]);
  thread(C, [0, 1.4, -6.0]);
  onStep(0.85);
  await yieldFrame();

  // 6. Fények: zöld fentről a chipre, piros Pekingnél, hideg „vallató lámpa” oldalról.
  const spot = (position, at, color, intensity, range, inner, outer, shadows = true) => {
    const d = [at[0] - position[0], at[1] - position[1], at[2] - position[2]];
    const l = Math.hypot(...d);
    apply({ op: "add_light", def: { shape: "spot", position, direction: d.map((v) => v / l), color, intensity, range, source_radius: 0.05, cast_shadows: shadows, inner_deg: inner, outer_deg: outer, enabled: true } });
  };
  const point = (position, color, intensity, range, shadows = false) =>
    apply({ op: "add_light", def: { shape: "point", position, direction: [0, -1, 0], color, intensity, range, source_radius: 0.08, cast_shadows: shadows, inner_deg: 30, outer_deg: 40, enabled: true } });
  spot([0, 7.5, 0.4], [0, 0.6, 0], [0.55, 1.0, 0.12], 90, 14, 16, 26);
  spot([6.5, 5.5, 6.5], [0, 0.6, 0], [0.85, 0.92, 1.0], 40, 16, 10, 18);
  spot([-5.6, 5.5, -0.6], [-5.6, 1.4, -2.2], [1.0, 0.12, 0.08], 45, 9, 12, 22);
  spot([5.0, 5.2, 0.2], [5.4, 1.2, -2.6], [0.3, 0.9, 0.2], 40, 9, 14, 26);
  spot([3.0, 4.2, 6.0], [4.6, 0.4, 3.4], [1.0, 0.8, 0.45], 35, 9, 14, 24);
  spot([-3.0, 4.6, 6.4], [-4.8, 1.0, 3.4], [0.75, 0.82, 1.0], 30, 9, 16, 26);
  spot([0, 6.5, -3.5], [0, 2.0, -7.2], [0.45, 0.9, 0.2], 40, 12, 18, 30);
  point([-5.6, 1.62, -1.2], [1.0, 0.08, 0.05], 3, 4);
  point([0, 1.2, 0], [0.3, 0.9, 0.05], 2.5, 3.5);
  onStep(0.95);

  // 7. Éjszaka, pára.
  const env = st.environment;
  env.sun_elevation_deg = -22;
  env.sun_azimuth_deg = 200;
  env.fog = { ...env.fog, density: 0.026, height_falloff: 0.35, base_height: 0, albedo: [0.8, 0.9, 0.8], anisotropy: 0.75, ambient: 0.15, noise: 0.7, distance: 60 };
  env.clouds = { ...env.clouds, coverage: 0.55 };
  apply({ op: "environment", env });
  onStep(1);
}

// Kamera-beállítások fejezetenként: [szem x, y, z, cél x, y, z] (magasság a talajhoz képest).
export const SHOTS = {
  intro:      [7.5, 4.2, 9.5, 0, 0.7, -0.5],
  case:       [3.2, 2.3, 4.2, 0, 0.7, 0],
  timeline:   [-2.4, 3.6, 6.6, 0.4, 0.6, 0],
  suspects:   [-1.2, 2.8, 2.6, -5.6, 1.5, -2.2],
  money:      [2.3, 1.35, 6.1, 4.5, 0.35, 3.4],
  world:      [0.0, 5.5, 8.0, 0, 1.6, -5.5],
  faults:     [9.0, 2.6, -0.2, 5.4, 1.2, -2.6],
  gpu:        [1.8, 2.0, 2.4, 0, 0.62, 0],
  future:     [0.0, 9.5, 3.5, 0, 0.5, -0.8],
  ledger:     [-7.0, 2.4, 6.6, -4.8, 1.1, 3.4],
  sources:    [10, 6.5, 12, 0, 0.8, -1.5],
};
