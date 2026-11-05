# Bitburner Automation

Netscript tools for operating an automated Bitburner network: discovery, coordinated hacking, deployment and progression support. The project emphasizes explicit behavior, resource awareness and repeatable execution.

## Getting started

Copy the JavaScript files into the in-game editor on `home`, preserving their filenames. Read [the operating guide](OPERATIONS.md) before replacing an existing setup.

```text
home
mem cycle.js
mem task.js
run cycle.js sigma-cosmetics
```

The chosen target must already have root access, money and a required hacking level within your reach. Check each script's RAM requirement with `mem` and leave sufficient free RAM on home. The controller can take multiple preparation rounds before producing money.

## Components

| Component | Responsibility |
| --- | --- |
| [cycle.js](cycle.js) | Coordinate preparation and capped hacking phases across available servers |
| [task.js](task.js) | Execute a single operation with the threads assigned by the controller |
| [inspect.js](inspect.js) | Inventory contracts, faction routes, access requirements and candidate targets |
| [contracts.js](contracts.js) | Find and solve supported coding contracts across the network |
| [monitor.js](monitor.js) | Display a live operations dashboard inside the game |
| [share.js](share.js) | Share spare RAM to improve faction reputation gain |
| [hacknet.js](hacknet.js) | Make bounded Hacknet investments using a payback estimate |
| [deploy.js](deploy.js) and [inicio.js](inicio.js) | Preserve the independent-worker baseline as an alternative operating mode |

Source comments and the operating guide describe parameters, side effects and limitations. Use **Active Scripts** and script logs to inspect the running state.

## Live dashboard

Run `monitor.js` on home to open an English operations panel. It refreshes every two seconds and tracks cash, script income, target preparation, worker threads, network RAM, programs, contracts and faction access requirements. It follows the active `cycle.js` target automatically and uses the game's supported tail window.

```text
mem monitor.js
run monitor.js
tail monitor.js
```

The monitor is read-only and needs no Singularity access. Exact faction reputation, current faction work and queued augmentations remain in the game's dedicated screens. See [dashboard operation and metric definitions](OPERATIONS.md#live-monitor) for RAM requirements and controls.

## Automatic coding contracts

On `home`, run `mem contracts.js` to check the RAM requirement, then `run contracts.js` with one thread and no arguments. The first scan starts immediately. The worker scans the network again every minute and runs alongside the hacking controller. Use `tail contracts.js` for scan counts and `kill contracts.js` to stop it. Start it again after an augmentation reset.

| Contract | How the worker solves it |
| --- | --- |
| Algorithmic Stock Trader I | Tracks the lowest earlier price and the best profit from one trade. Returns zero when buying would lose money. |
| Encryption I: Caesar Cipher | Shifts each uppercase letter left by the supplied key and preserves spaces. |
| Find Largest Prime Factor | Divides out each prime factor and compares the last divisor with the remaining factor. |

Successful submissions print the host, filename and reward in the terminal. Unsupported types and unexpected input stay available for manual review. If the game rejects an answer, the worker records the contract in `contracts-rejected.txt` on home and skips it on subsequent scans and restarts.

## Operating principles

Run a single controller and choose one hacking mode at a time. Keep worker copies consistent, inspect failures, and distinguish allocated capacity from measured income. Compare production over similar time windows, including preparation costs when evaluating targets.

The scripts operate within Bitburner's simulated environment. They do not automate faction membership, augmentation installation or resets. Purchases made by the Hacknet helper use game currency and explicit budget limits.

## Development

Changes are published with their purpose, usage and validation. Commit history records the implementation's evolution; live levels, balances and network counts stay in the game and its logs.

Compatibility, RAM costs and available APIs depend on the game version and progression state. Consult the in-game documentation when adapting the tools.
