# Kapps Odometer

<img src="docs/preview.png" alt="Kapps Odometer overlay" width="370">

A small iRacing odometer that remembers total mileage **for each car model**.
It runs as a Kapps Custom Overlay: no Python, extra application, subscription,
cloud account, or build step is required for the widget itself. You need an
existing working installation of Kapps and iRacing on Windows.

[Download v0.3.0](https://github.com/AT-Vadim/kapps-odometer/releases/download/v0.3.0/Odometer-Kapps-v0.3.0.zip) · [Инструкция на русском](README.ru.md)

## Install

1. Download **Odometer-Kapps-v0.3.0.zip** from this repository's **Releases** page.
   Use the named install ZIP, rather than GitHub's automatically generated source ZIP.
2. In Kapps, open **Settings → Apps Folder**. If you already use custom widgets,
   open that folder. Otherwise create a folder such as `Documents\KappsApps`,
   select it as Apps Folder, then click **Save**.
3. Extract the install ZIP **inside that Apps Folder**. Check the exact layout:

   ```text
   KappsApps/                 ← select THIS folder in Kapps
     Odometer/
       index.html
     README.md
     README.ru.md
     LICENSE
     CHANGELOG.md
     docs/
   ```

   **Do not select the Odometer subfolder itself as Apps Folder.** Do not leave
   an extra `Odometer-Kapps-v0.3.0` folder between Apps Folder and Odometer.
4. In **Racing Overlay → Add Custom Overlay**, use:

   ```text
   Name: Odometer
   URL:  http://127.0.0.1:8182/Odometer/
   ```

5. Give the widget approximately **370 × 100 px** and position it on your screen.
6. Open Racing Overlay, enter your car in a live iRacing session, and drive.

Apps Folder serves HTML files; it does not launch EXE/CMD files. Once added,
the odometer loads with the other Racing Overlay widgets. **Racing Overlay must
be open for mileage to be recorded.** Selecting Apps Folder alone does not
automatically open Racing Overlay when Kapps starts.

## What it does

- Keeps an independent lifetime total for each iRacing `CarID`.
- Restores the right total when you switch models, tracks, or sessions.
- Liveries and race numbers do not create separate odometers. Separate Legacy
  models with different CarIDs get separate totals.
- Displays kilometres with one decimal place; digits roll every 100 metres.
- Keeps the driving view free of status labels; the default dark background has
  **70% opacity**, with adjustable colour and opacity.
- Counts reverse driving, pit-lane driving and off-track travel while in the car.
- Pauses recording outside the car, in the garage, during towing or replays,
  and when telemetry is stale.

The public download starts at zero. It contains no personal mileage, accounts,
telemetry logs, analytics, remote scripts or fonts. Distance is approximate:
it integrates speed over simulation time. Missing data is not reconstructed,
so stalls or long gaps can cause a small undercount. Previous iRacing sessions
are not imported automatically.

## Appearance styles

Open the statistics/management page in the same Kapps profile:
`http://127.0.0.1:8182/Odometer/?manage=1`.
Choose **Minimal**, **Electronic · pixels**, or **Mechanical · wheels** under
**Odometer appearance**. The animated preview uses synthetic mileage and does
not change your totals. Selection saves automatically and reaches other open
widgets in the same profile within about one second. The setting applies to all cars.

- **Minimal:** the original rolling-digit display.
- **Electronic:** a yellow-green 5 × 7 dot matrix. Each changed digit briefly
  blinks. A small part of one numeral flickers at random 5–10 minute intervals;
  a shared, persistent cooldown prevents more than one rare effect per five
  minutes, even with multiple windows or after a reload.
- **Mechanical:** unlabelled numeral wheels. The light **100 m** wheel rotates
  continuously between numerals using fractional measured distance. Kilometre
  wheels roll smoothly only when the corresponding full kilometre/digit is
  reached. The wheels stop when mileage stops; they do not extrapolate distance.

<img src="docs/electronic.png" alt="Electronic pixel odometer" width="370">
<img src="docs/mechanical.png" alt="Mechanical odometer" width="370">

All styles default to a 70% opaque outer background; colour and opacity are adjustable. System reduced-motion
preferences disable blinking and animated transitions. Appearance preferences
are separate from mileage; JSON mileage backups do not include style settings.

## Background and window size

1. Temporarily change the Custom Overlay URL **inside Kapps** to
   `http://127.0.0.1:8182/Odometer/?manage=1`.
2. Enlarge the window and enable interaction with it. Under **Odometer appearance**,
   choose a **Background colour** with the picker or hex input, then set
   **Background opacity** from **0% (transparent)** to **100% (opaque)**.
3. Restore `http://127.0.0.1:8182/Odometer/` and resize the window in Kapps.

The preview updates immediately. Settings save automatically and reach open
widgets in the same Kapps profile within about one second. **Reset background**
restores the original dark colour and 70% opacity without changing your style.
Only the outer panel background changes; the digits and mechanical wheel faces
keep their own opacity.

Resize the Custom Overlay window directly in **Kapps**. The odometer automatically
fits the width and height allocated to it, scales up or down, and stays centred
without distorting its proportions. When the window has a different aspect ratio,
the unused space is transparent. This applies **only to the odometer view**;
the statistics/settings page keeps its normal layout and scrolling.

## Storage, backup and restore

Mileage is saved automatically in **IndexedDB in the Kapps browser profile**,
not alongside `index.html`. It survives ordinary restarts and replacement of
the HTML file. Clearing browser/site data or removing the Kapps profile can
erase it, so export a backup before reinstalling or clearing data.

Always use `127.0.0.1:8182`. The widget redirects `localhost` to that address.
A different browser, browser profile, computer or port has separate storage.
Multiple copies in the **same storage profile** share a single writer, which
prevents double counting. Different browser profiles are independent.
Storage is per installation/profile, not per iRacing user account.

To manage the same data, temporarily change the widget's URL **inside Kapps** to:

```text
http://127.0.0.1:8182/Odometer/?manage=1
```

Enlarge the window and enable interaction with it. Use **Download backup** or
**Import JSON**, then restore the normal URL. This management page does not
record mileage. Opening it in an unrelated Chrome/Edge profile will show that
browser's data instead of your Kapps data.

Import merges records and keeps the larger total for each car; it never adds
two totals together. It also accepts `odometer.json` from the earlier Python
prototype. Export format:

```json
{"version":1,"cars":{"car:42":{"name":"Example car","meters":1234.5}}}
```

## Update or uninstall

Back up your mileage, close the widget, replace `Odometer/index.html`, then reopen
it at the same URL. Do not clear site data. To uninstall, remove the Custom
Overlay and the Odometer folder. This does not automatically delete browser data.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| `FileNotFoundError: apps/Odometer/index.html` | Apps Folder must contain the Odometer folder. Select its parent, click Save, and check the layout above. |
| Connection refused / no page | Kapps and its server must be running on the default port 8182. |
| Counter stays at zero | Enter your own car in a live session. Replays, garage and towing do not count. Wait until you have driven 100 m. |
| Different totals in a browser | Open the same URL in the same Kapps profile. Chrome and Kapps normally have separate storage. |
| Mileage is missing after clearing Kapps data | Import a previously exported backup through the management page. |
| Mileage stops while hidden/closed | Keep the widget loaded. A suspended browser page cannot reliably record distance. |

There are deliberately no visible tracking/error labels in the driving widget.
If troubleshooting is needed, check the page's developer console. Storage
errors stop successful recording rather than silently switching to temporary data.

## Compatibility and testing

**v0.3.0** release. The WebSocket protocol was checked against Kapps
**1.24.38**, and a connection to its local server was verified. Automated checks
cover distance accounting, car changes, replay/tow/garage filtering, persistence,
single-writer transactions, writer takeover, imports, appearance persistence,
background transparency and proportional fitting across all three styles.
Full validation while driving in a live iRacing session and inside every Kapps
display mode is still pending. Reports with Kapps version and reproduction steps
are welcome; do not attach account credentials or personal logs unnecessarily.

## Development

The installed widget has no external dependencies. To modify it, use Node.js 18+
and Python 3.10+ (Python is only used for ZIP packaging):

```sh
node tests/accounting.cjs
node scripts/build.mjs
python scripts/package.py
```

Source files are in `src/`; the build writes the self-contained
`Odometer/index.html`. Packages and SHA-256 checksums are written to `dist/`.
The build always seeds an empty mileage database. Existing browser data is kept.

For an animation preview without recording or connecting to telemetry, open
`Odometer/index.html?demo=1` through a local HTTP server. For example:

```sh
python -m http.server 8192 --bind 127.0.0.1
# http://127.0.0.1:8192/Odometer/?demo=1
```

## License and credits

[MIT License](LICENSE). Independent community project, not affiliated with
iRacing or Kapps. Kapps and its telemetry server are created by
[kutu](https://kapps.kutu.ru/). This repository includes only the custom widget;
it does not redistribute Kapps or the iRacing SDK.

Browser storage checks (Node.js 22+): serve the repository on 127.0.0.1:8192,
open `/Odometer/?manage=1` in a disposable Chrome profile with remote debugging
on port 9228, then run `node tests/browser.cjs`. Use a test profile: these checks
create synthetic mileage and replace the preview image.

Run `node tests/appearance.cjs` in the same disposable browser setup to verify
style persistence, live updates, continuous wheels, kilometre carry and the
five-minute rare-flicker cooldown. Start its tab at `/Odometer/?manage=1`.

Use `node tests/background-layout.cjs` with the disposable browser setup to check
colour/opacity persistence, old-style preference migration, background-only
transparency, live synchronization and fitting all three styles to different
viewport sizes.
