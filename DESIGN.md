# Infinite Minesweeper — Design System

A dark, calm, "infinite canvas" take on Minesweeper. The board is an endless
pannable/zoomable grid; players reveal cells, plant flags, and paint
colored **territory regions** (red = danger / claimed-risky, green = safe /
cleared) across an open field. The chrome is minimal and stays out of the way
so the grid is the hero.

---

## 1. Brand & Tone

- **Personality:** quiet, focused, modern. Not the chunky beveled "Windows 3.1"
  Minesweeper — this is flat, dark, and spacious.
- **Hero:** the grid. Everything else (top bar, FABs, pills) is low-contrast
  chrome that recedes.
- **Color is meaning.** Saturated color is reserved for *information* — number
  values, flags, territory overlays, status pills, and action buttons. The
  field itself stays desaturated slate.

---

## 2. Color Palette

### Surfaces (cool desaturated slate / navy)
| Token | Hex | Use |
|---|---|---|
| `--bg-app` | `#131c2b` | App / dashboard background (darkest) |
| `--bg-topbar` | `#0f1722` | Top game bar, near-black |
| `--cell-hidden` | `#3c4a5e` | Unrevealed cell fill |
| `--cell-hidden-alt` | `#45536a` | Subtle checkerboard variation on hidden cells |
| `--cell-revealed` | `#1c2737` | Revealed (empty) cell fill — darker than hidden |
| `--grid-line` | `#5a6b82` | Grid lines between cells (~1px, soft) |
| `--card` | `#26334a` | Dashboard game-row card |
| `--card-border` | `#3a4a63` | Card / panel hairline borders |

> Surfaces are cool slate-navy. Keep whites/blacks subtly blue-toned; never use
> pure `#000` or `#fff` for large fields.

### Number colors (cell values)
| Value | Hex | Notes |
|---|---|---|
| `1` | `#4a9eff` | blue |
| `2` | `#3cba54` | green |
| `3` | `#e8556a` | red/coral |
| `4` | `#2f57c4` | deep blue (rare) |
| `5` | `#e08a3c` | amber/orange |
| `6` | `#3aa9a0` | teal |
| `7` | `#c9ccd4` | light gray |
| `8` | `#8a93a3` | gray |

Numbers are **bold, centered**, monospace-leaning. Same size as the cell's
optical center.

### Territory overlays (semi-transparent washes painted over cells)
| Token | Color | Use |
|---|---|---|
| `--zone-safe` | `#2faa46` @ ~55% over slate | green region — cleared / safe claim |
| `--zone-danger` | `#d83a3a` @ ~55% over slate | red region — danger / risky claim |
| `--zone-danger-muted` | `#7a2f3a` | darker red over revealed cells inside a danger zone |

Overlays tint both hidden and revealed cells; grid lines and numbers stay
visible through them.

### Accents & status
| Token | Hex | Use |
|---|---|---|
| `--flag` | `#ff5b7a` | flag marker (pink-red), flag-count pill icon |
| `--accent-green` | `#22a558` | "New Game" button, success/check pill |
| `--accent-blue` | `#2563eb` | "Continue" button |
| `--accent-red` | `#dc2626` | "Delete" button |
| `--pill-flag-bg` | `#5a4a1f` | flag-count pill background (muted amber) |
| `--pill-bomb-bg` | `#5a2330` | bomb/mine-count pill background (muted red) |
| `--pill-check-bg` | `#1f4a32` | checked/safe-count pill background (muted green) |
| `--fab-active` | `#e0a73c` | active state ring on recenter FAB (amber) |

### Text
| Token | Hex | Use |
|---|---|---|
| `--text-primary` | `#eef2f8` | Headings, button labels, active title |
| `--text-secondary` | `#9aa7bb` | Timestamps, muted labels, back link |
| `--text-on-accent` | `#ffffff` | Text on colored buttons |

---

## 3. Typography

- **Family:** system UI sans — `system-ui, -apple-system, "Segoe UI", Roboto,
  Helvetica, Arial, sans-serif`. Clean and neutral; no decorative type.
- **Cell numbers:** same family, **700 weight**, optically centered. Tabular feel.
- **Scale:**
  | Role | Size / Weight |
  |---|---|
  | Dashboard H1 ("Your Games") | ~30px / 800 |
  | Game title (top bar) | ~16px / 700 |
  | Card title | ~15px / 700 |
  | Card timestamp / secondary | ~13px / 400, secondary color |
  | Button label | ~14px / 600 |
  | Cell number | scales with zoom; ~bold, fills ~45% of cell height |
  | Status pill number | ~13px / 700 |

---

## 4. Layout & Spacing

- **Grid cells:** square, ~32px at default zoom (screenshots ~33px). 1px soft
  grid lines. Cells snap to a uniform lattice across the infinite plane.
- **Top game bar:** full-width, ~48px tall, near-black. Left: back arrow +
  game title. Right: status pills + avatar.
- **Dashboard:** centered max-width column (~1180px). H1 + "New Game" on one
  row, game cards stacked below with 12–16px gaps.
- **Game card:** padded (~18px), rounded 8px, subtle border, title + timestamp
  on the left, action buttons right-aligned. On narrow screens the buttons wrap
  below the text.
- **Radii:** buttons & pills `6px`; cards `8px`; FABs & compass fully round.
- **Corner controls (game view):**
  - Bottom-right vertical stack: **+ / − zoom** buttons, then a **recenter
    (crosshair)** FAB with an amber active ring.
  - Bottom-left: round **compass** badge showing **N**.
  - FABs are ~44px round, `--bg-topbar` fill, hairline border, ≥44px hit target.

---

## 5. Components

### Buttons
- Solid fill, white label, 6px radius, ~`9px 16px` padding, 600 weight.
- `New Game` → green, `Continue` → blue, `Delete` → red. No borders, subtle
  hover lift (brightness +6%).

### Status pills (top bar, right)
- Rounded-full, ~`3px 10px`, colored icon + count.
- **Flag** (pink flag icon, amber-muted bg) = flags placed.
- **Bomb/lock** (red bg) = mines remaining / locked.
- **Check** (green ✓, green-muted bg) = cells/zones verified safe.

### Cells
- **Hidden:** `--cell-hidden`, faint checkerboard alternation, hover brightens.
- **Revealed empty:** `--cell-revealed` (recedes).
- **Revealed number:** revealed fill + bold colored digit.
- **Flagged:** hidden fill + pink flag glyph.
- **Mine markers:** small purple/indigo dot tokens visible in dense areas.
- **In a territory zone:** cell fill is washed with the zone color; numbers and
  flags remain legible on top.

### Avatar (top-right)
- ~28px rounded square, purple→violet gradient placeholder for the user.

---

## 6. Iconography

- Simple, flat, single-weight. Flag = pink pennant on a thin pole. Compass = "N"
  in a ring. Zoom = `+` / `−`. Recenter = crosshair/target. Check = ✓.
- Keep icons geometric; no skeuomorphism, no gradients except the avatar.

---

## 7. Motion

- Subtle and fast (120–180ms). Cell reveal: quick fade/flatten. Pan/zoom:
  inertial but snappy. Button/pill hover: brightness only. Avoid bouncy or
  showy animation — the field should feel precise.

---

## 8. Do / Don't

- ✅ Keep the field desaturated; spend color on numbers, flags, zones, actions.
- ✅ Maintain ≥44px hit targets on all corner controls.
- ✅ Let grid lines and numbers read *through* territory overlays.
- ❌ No beveled/3D classic-Minesweeper cell styling.
- ❌ No pure black/white fields; keep everything cool-slate toned.
- ❌ Don't let chrome compete with the grid for attention.
