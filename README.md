<!-- markdownlint-disable MD013 -->

# npm-gui Enhanced

A maintained npm-gui distribution for people whose global packages live across NVM and custom npm prefixes.

[![Distribution 4.1.1](https://img.shields.io/badge/distribution-4.1.1-blue?style=flat-square)](https://github.com/apoapostolov/npm-gui/releases/tag/v4.1.1)
[![Upstream npm-gui](https://img.shields.io/badge/upstream-q--nick%2Fnpm--gui-555?style=flat-square)](https://github.com/q-nick/npm-gui)
[![Node.js](https://img.shields.io/badge/Node.js-supported-339933?style=flat-square)](package.json)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow?style=flat-square)](LICENSE)

This distribution keeps the familiar local browser interface from [q-nick/npm-gui](https://github.com/q-nick/npm-gui), then fixes its most frustrating behavior on machines with more than one global package tree. It discovers packages across NVM and custom prefixes, reports updates that the stock tool misses, and sends each upgrade back to the prefix where that package is installed.

![npm-gui interface installing a batch of dependencies](https://npm-gui.nullapps.dev/batch-install.GIF)

## What's New in 4.1.1

- Refreshes the global package list immediately after a successful bulk update.
- Keeps the open page current with a 30-minute background refresh.
- Protects this maintained distribution from being replaced by the older public `npm-gui` package.
- Preserves the multi-prefix update and bulk-install fixes introduced in 4.1.0.

## What This Distribution Adds

- **See every global package tree.** Merge packages from NVM-managed Node versions, `~/.npm-global`, and the active npm prefix into one list.
- **Detect updates reliably.** Preserve and parse `npm outdated` results even though npm exits with status 1 when updates are available.
- **Upgrade in the correct prefix.** Resolve where each package is installed before running its global update, preventing packages from moving into the wrong tree.
- **Install all available updates.** Process the complete update list while isolating individual failures so one problematic package does not cancel the batch.
- **Refresh after bulk work.** Reload the listing shortly after a successful batch and continue checking every 30 minutes while the page stays open.
- **Protect the maintained build.** Exclude `npm-gui` itself from registry lookups and update actions so upstream 4.0.x cannot overwrite this 4.1.x distribution.
- **Retain the original project manager.** Open local projects and manage npm, pnpm, or Yarn dependencies through the same browser interface.

The central compatibility layer is [`dist/server/ls-global.js`](dist/server/ls-global.js). It handles prefix discovery, merged package results, update checks, package-to-prefix routing, and cache invalidation.

## Install This Distribution

The public npm package is the upstream release. To use the enhancements above, install from this repository instead:

```bash
git clone https://github.com/apoapostolov/npm-gui.git
cd npm-gui
npm install
npm install --global .
npm-gui localhost:13377
```

Open [http://localhost:13377](http://localhost:13377) if the browser does not open automatically.

Keep the service bound to `localhost` unless you add authentication and network controls. npm-gui can install and remove packages on the machine where it runs.

## Multi-Prefix Setup

Set the custom prefix you want npm to use as its normal global target:

```bash
export NPM_CONFIG_PREFIX="$HOME/.npm-global"
```

NVM prefixes are discovered from the installed Node versions. The enhanced server merges those results with the active custom prefix instead of assuming that `npm root --global` is the only package tree.

For a persistent service, pass the same prefix environment to the service process and start npm-gui on a fixed local address. The exact service-manager configuration is intentionally left to the host because Node and NVM paths differ between machines.

## Everyday Use

1. Start npm-gui and open the **Global** view.
2. Review installed, wanted, and latest versions across the merged package list.
3. Update one package or choose **Install all** for the available set.
4. Let the page refresh after the batch, then review any package that failed independently.

Project dependency management works as in upstream npm-gui: open a folder containing `package.json`, then inspect, install, update, reinstall, or remove dependencies. Lockfiles select pnpm or Yarn where applicable; otherwise npm is used.

## Distribution Notes

- The maintained package version is pinned at 4.1.0 inside `package.json`; repository tag 4.1.1 identifies the latest distribution snapshot.
- Built files under `dist/` are part of this distribution because the multi-prefix compatibility layer patches the packaged server and client directly.
- Running `npx npm-gui@latest` downloads the upstream npm release, not these enhancements.

## Credits and License

npm-gui was created by [Paweł Stefański (@q-nick)](https://github.com/q-nick). This maintained distribution adds the global-package fixes described above.

Released under the [MIT License](LICENSE).
