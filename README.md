# Schnell Keyboard Key Configuration Tool

[![Deploy](https://github.com/DriftKingTW/Schnell-Keypad-Configuration-Tool/actions/workflows/deploy.yml/badge.svg)](https://github.com/DriftKingTW/Schnell-Keypad-Configuration-Tool/actions/workflows/deploy.yml)

This is a web based keyconfig generator and firmware install tool for [Schnell Keyboard by DriftKingTW](https://github.com/DriftKingTW/Schnell-BLE-Keypad).

- [Web Demo](https://driftkingtw.github.io/Schnell-Keypad-Configuration-Tool/)

- Flash generated config file to the keypad: [Schnell Keyboard Keyconfig Flash Tool](https://github.com/DriftKingTW/Schnell-BLE-Keypad/tree/master/tools/keyconfig-flash-tool)

## Features

- [x] i18n multi-language support
- [x] Dark/Light theme support
- [x] Editable key label
- [x] Upload existing config file
- [x] Reset single key
- [x] Flash firmware through web ui
- [x] Selectable stable firmware version history
- [x] Vertical key cap layout ui
- [ ] Customize keyboard layout

## Project setup

```shell
npm install
```

### Compiles and hot-reloads for development

```shell
npm run dev
```

### Compiles and minifies for production

```shell
npm run build
```

### Preview for production build

```shell
npm run preview
```

## Deployment

The web app deploys to GitHub Pages automatically on every push to `master`
(`.github/workflows/deploy.yml`). No manual step is required.

## Releasing firmware

Firmware is built and published from the firmware repo
[Schnell-BLE-Keypad](https://github.com/DriftKingTW/Schnell-BLE-Keypad). Once a
release is published there, it shows up in this tool's firmware installer
automatically — you never edit `public/firmware/` by hand.

To cut a new firmware version, push a tag **in the firmware repo**:

```shell
# in the Schnell-BLE-Keypad repo
git tag v1.1.0          # stable release   -> "stable" channel
git tag v1.1.0-beta.1   # contains beta/rc -> "beta" channel
git push origin <tag>
```

What happens automatically:

1. The firmware repo's `release.yml` builds the firmware, merges it into a
   single flashable image, and creates a GitHub Release with
   `firmware-merged.bin` and `spiffs.bin`.
2. It dispatches a `firmware-released` event to this repo. This requires a
   `WEB_TOOL_DISPATCH_TOKEN` secret in the firmware repo — a PAT with
   `Contents: read and write` on this repo (the default `GITHUB_TOKEN` cannot
   trigger across repositories).
3. This repo's `update-firmware.yml` downloads the release assets into
   `public/firmware/<channel>/`, regenerates the esp-web-tools `manifest.json`
   and `index.json`, commits to `master`, then deploys to GitHub Pages.

Channel behaviour:

- **stable** — also archived under `public/firmware/<tag>/`, so every stable
  release stays installable later via the **"show old versions"** toggle in the
  installer dropdown.
- **beta** — only the latest build is kept (not archived).

`public/firmware/index.json` is the source of truth for the version dropdown;
the UI fetches it on load and falls back to plain stable/beta options if it is
unavailable.

### Manual re-sync / rollback

To point a channel at a specific tag without cutting a new release (e.g. to roll
a beta back), trigger the workflow manually:

```shell
gh workflow run update-firmware.yml \
  --repo DriftKingTW/Schnell-Keypad-Configuration-Tool \
  -f tag=v1.1.0 -f prerelease=false   # prerelease=true targets the beta channel
```
