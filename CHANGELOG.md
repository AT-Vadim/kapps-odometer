# Changelog

## 0.4.0 — 2026-09-11

- Added a fourth, iRacing classic style matching the supplied standings palette.
- Selecting iRacing applies charcoal #232633 while preserving background opacity.
- Added in-page setup help and detailed English/Russian Kapps interaction instructions.
- Clarified window focus, Edit versus Apply, and Ctrl+K for Open in iRacing.
- Existing mileage, three earlier styles and background customization are preserved.

## 0.3.0 — 2026-09-07

- Added a background colour picker, hex input and 0–100% opacity control to statistics.
- Added background reset and automatic synchronization between open widgets.
- The odometer now fits its Kapps window while preserving proportions; statistics do not scale.
- Existing style-only preferences migrate to the original background defaults.


## 0.2.1 — 2026-09-07

- Removed labels below the mechanical number wheels.
- Reduced the mechanical display height to remove the unused label space.
- Updated the preview image and installation downloads.


## 0.2.0 — 2026-09-07

- Added electronic 5 × 7 pixel digits with a blink on each changed numeral.
- Added rare partial-digit flicker with a persistent five-minute minimum cooldown.
- Added labelled mechanical wheels, continuous 100 m motion and smooth kilometre carry.
- Added persisted style selection and live previews to the per-car statistics page.
- Appearance changes reach open widgets without changing mileage.
- Original minimal style retained; reduced-motion preferences respected.


## 0.1.0 — 2026-09-06

- First public release of the self-contained Kapps Custom Overlay.
- Persistent lifetime distance per iRacing car model.
- Rolling digits in 100 m steps; minimal UI with a 70% opaque background.
- Local IndexedDB storage with single-writer coordination.
- JSON backup and merge import through `?manage=1`.
- English and Russian installation instructions, including Apps Folder layout.
- Public builds start empty and include no personal mileage.

Live-session validation across Kapps display modes is still pending.
