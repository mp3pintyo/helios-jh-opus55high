# Ügyakta NV-2026-1108 · Huang × Huang

Nyomozós weboldal a Jensen Huang / Alice Huang (黃樂) / Megaspeed-ügyről. A tartalom hat nyelv (magyar, angol, kínai, japán, német, francia) sajtóforrásaiból állt össze, állapota 2026. november 10.

A háttérben futó éjszakai bizonyítéktermet a **Helios** (Rust + WebGPU) motor rendereli valós időben. A jelenet a galéria-jelenetből épül fel az editor page API-n (`heliosEditorApply`) keresztül, ez a `js/scene.js`. Görgetéskor a kamera fejezetenként másik bizonyítékra áll rá.

**Élő oldal:** https://mp3pintyo.github.io/helios-jh-opus55high/

## Futtatás helyben

```powershell
python -m http.server 8765 --directory .
# majd: http://localhost:8765/
```

WebGPU-képes böngésző kell hozzá (Chrome vagy Edge 113+). WebGPU nélkül az akta olvasható, csak a 3D helyszín marad el.

## Felépítés

| Fájl | Tartalom |
|---|---|
| `index.html` | fejezetek, HUD, töltőképernyő |
| `css/case.css` | noir dizájnrendszer NVIDIA-színekben |
| `js/main.js` | motorindítás, görgetésre mozgó kamera, nyomozótábla, fülek, szűrők, diagramok |
| `js/scene.js` | a 3D helyszín: chip, Peking, Megaspeed-rack, pénz, Fehér Ház, üveggömb, piros fonalak, fények, köd |
| `js/data.js` | minden tartalom: idővonal, szereplők, kapcsolatok, számok, nyelvi nézőpontok, forgatókönyvek, források |
| `pkg/` | a Helios WASM-build (`d:\AI\Unreal\web\pkg` másolata, a `snippets/` mappával együtt: ebben van a sütést végző Web Worker) |

A Helios frissítése után a teljes `pkg/` mappát (a `snippets/`-szel együtt) újra át kell másolni, és meg kell nézni, hogy a `js/scene.js` által használt editor-API (`heliosEditorState`, `heliosEditorApply`) változott-e. A 2026. november 11-i Helios-verzióban az állapot actor-hierarchiát ad vissza (`actors: { id, name, parent, flags }`), a galériát ezért `actor_visibility` op rejti el. A töltőképernyő a `heliosFrames()` első képkockájáig vár, és közben a `heliosBusy()` shaderfordítási állapotát írja ki.
