> **⚠️ Patched / Enhanced Distribution**
>
> This is **apoapostolov's maintained copy** of `npm-gui@4.0.4` with important fixes and features for heavy global-package users (especially those using **nvm** + a custom global prefix).
>
> - Full support for **multiple global npm prefixes** (NVM + `~/.npm-global` etc.)
> - **Fixed "no updates detected" bug** — `npm outdated` / update indicators now work reliably for packages in any prefix.
> - Added `dist/server/ls-global.js` — the core shim that makes everything work.
>
> Upstream: [q-nick/npm-gui](https://github.com/q-nick/npm-gui) • Original site: https://npm-gui.nullapps.dev

[![Downloads](https://img.shields.io/npm/dm/npm-gui?style=for-the-badge)](https://www.npmjs.com/package/npm-gui)
&nbsp;
[![MIT License](https://img.shields.io/npm/l/npm-gui?style=for-the-badge)](https://choosealicense.com/licenses/mit/)
&nbsp;
[![Github](https://img.shields.io/github/stars/q-nick/npm-gui?style=for-the-badge)](https://github.com/q-nick/npm-gui)
&nbsp;
[![npm](https://img.shields.io/npm/v/npm-gui?style=for-the-badge)](https://www.npmjs.com/package/npm-gui)

![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/q-nick/npm-gui/build.yml?style=for-the-badge)
&nbsp;
![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/q-nick/npm-gui/windows.yml?label=windows%20test&style=for-the-badge)
&nbsp;
![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/q-nick/npm-gui/macos.yml?label=macos%20test&style=for-the-badge)
&nbsp;
![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/q-nick/npm-gui/linux.yml?label=linux%20test&style=for-the-badge)

# npm-gui

Homepage and full documentation: https://npm-gui.nullapps.dev

`npm-gui` is a convenient tool for managing javascript project dependencies listed in `package.json`. Under the hood, it will transparently use `npm`, `pnpm`, or `yarn` commands to install, remove or update dependencies
(_to use **yarn** it requires the **yarn.lock** file to be present in the project folder._)

![App Demo](https://npm-gui.nullapps.dev/batch-install.GIF)

## Getting Started

The recommended way to run `npm-gui` is by using <a href="https://www.npmjs.com/package/npx">`npx`</a>:

```
~/$ npx npm-gui@latest
```

It will run the most recent version of `npm-gui` without installing it on your system.

#### Installation as global dependency

`npm-gui` could also be installed as a global dependency:

```
~/$ npm install -g npm-gui
```

and then run with just:

```
~/$ npm-gui
```

#### Installation as local dependency (not-recommended)

```
~/$ npm install npm-gui
```

To read more visit: https://npm-gui.nullapps.dev/docs/npm-gui/

## Authors

- [@q-nick](https://www.github.com/q-nick)

## Documentation

[Documentation](https://npm-gui.nullapps.dev/docs/npm-gui/)

---

## Enhancements in This Distribution (Hermes / apoapostolov)

This fork exists because stock `npm-gui` only ever talks to **one** global npm prefix (the one resolved from your current `npm` / `NPM_CONFIG_PREFIX`).

On machines that split global packages across:

- NVM-managed Node (`~/.nvm/versions/node/vX.Y.Z`)
- A separate custom global prefix (`~/.npm-global` for AI CLIs, etc.)

...the stock tool only ever sees ~12 packages instead of 40+ and, more critically, **never reports available updates** for the packages it can't see.

### What was fixed / added

- **`dist/server/ls-global.js`** — new module (the heart of the patch)
  - Runs `npm ls --prefix <path> -g` against **all** configured prefixes and merges the results.
  - Same for `npm outdated`.
  - Robust handling of the fact that `npm outdated` exits with code 1 when it finds updates (the original code path in the bundled server swallowed the JSON in the error case).
  - Version backfilling for packages that `npm ls` reports without a `version` field (common with some NVM installs).
  - 5-minute cache for `outdated` results + version cache to keep the UI fast.

- Update detection (`/api/global/dependencies/full` etc.) now correctly populates `latest` / `wanted` for packages in **any** prefix.

- `outdated-pkg <name>` after an in-UI global install/upgrade forces a fresh check so you immediately see the correct state instead of waiting for the TTL.

### How the patches are applied at runtime

The service (`npm-gui.service`) runs with:

```ini
Environment=NPM_CONFIG_PREFIX=/home/apoapostolov/.npm-global
ExecStart=.../npm-gui localhost:13377
```

Then `dist/server/index.js` is lightly patched (string replace on the command lines) so that all four global operations go through our `ls-global.js` instead of raw `npm ls -g ...` / `npm outdated -g ...`.

See the full management notes and the exact one-liner patch script in the accompanying skill:
https://github.com/apoapostolov (npm-gui-management skill)

### Using this copy

1. Clone or download this tree.
2. `npm pack` (or just copy the contents over an existing global install of `npm-gui@4.0.4`).
3. Re-apply the 4 tiny string replacements in `dist/server/index.js` (documented in the skill) + drop `dist/server/ls-global.js`.
4. (Recommended) Run it behind the systemd user service so you get a stable web UI on a fixed port.

If you only care about the update-detection fix and multi-prefix listing, you only need the `ls-global.js` file + the command rewrites.

---

## Next features on roadmap (upstream)

- npm-gui integrated into VS Code as an extension
- ... (see original list above)
