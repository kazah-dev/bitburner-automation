# Bitburner Automation

Netscript tools for operating an automated Bitburner network: discovery, coordinated hacking, deployment and progression support. The project emphasizes explicit behavior, resource awareness and repeatable execution.

## Getting started

Copy the JavaScript files into the in-game editor on `home`, preserving their filenames. Read [the operating guide](OPERATIONS.md) before replacing an existing setup.

```text
home
mem cycle.js
mem task.js
mem share.js
run cycle.js auto
```

Save `cycle.js`, `task.js` and `share.js` on home. Check their RAM requirements with `mem`. The controller discovers the network, uses available port-opening programs and chooses an accessible money target. It can take multiple preparation rounds before producing money.

Target selection estimates revenue across a full hack, grow and weaken cycle, including preparation, success chance and available worker capacity. It compares several hack fractions and requires a meaningful improvement before switching targets. These are planning estimates, not guaranteed returns or a global optimum.

Growth and weakening allocations account for host CPU cores. Unused capacity runs faction-sharing workers when the player belongs to a faction. The controller reclaims its sharing workers before each operation, preserves unrelated processes and keeps 16 GB free on home by default. Newly acquired port openers are detected without restarting.

To pin a target or disable automatic sharing, use `run cycle.js sigma-cosmetics 16 off`. See [the operating guide](OPERATIONS.md#coordinated-mode) for ownership, migration and model limitations.

## Components

| Component | Responsibility |
| --- | --- |
| [cycle.js](cycle.js) | Select targets, size operations and reclaim spare RAM across available servers |
| [task.js](task.js) | Execute a single operation with the threads assigned by the controller |
| [inspect.js](inspect.js) | Inventory contracts, faction routes, access requirements and candidate targets |
| [contracts.js](contracts.js) | Find and solve supported coding contracts across the network |
| [monitor.js](monitor.js) | Display a live operations dashboard inside the game |
| [share.js](share.js) | Share spare RAM to improve faction reputation gain |
| [hacknet.js](hacknet.js) | Make bounded Hacknet investments using a payback estimate |
| [fleet.js](fleet.js) | Preview or purchase cloud capacity within a spending cap and cash reserve |
| [deploy.js](deploy.js) and [inicio.js](inicio.js) | Preserve the independent-worker baseline as an alternative operating mode |

Source comments and the operating guide describe parameters, side effects and limitations. Use **Active Scripts** and script logs to inspect the running state.

## Live dashboard

Run `monitor.js` on home to open **Operations desk** in the game. **Overview** explains the current hacking phase, charts your balance and shows upcoming faction unlocks. **Network** lets you pick a server and follow the route to it. **Details** breaks down income, scripts, character stats and open contracts. The dashboard follows the active controller target and refreshes every two seconds by default.

```text
mem monitor.js
run monitor.js
tail monitor.js
```

To pin a personal milestone, start the monitor with a refresh interval and quoted goal, for example `run monitor.js 2000 "Save for the next home upgrade"`. Reopen that instance from **Active Scripts**. Read [the monitor guide](OPERATIONS.md#live-monitor) for chart definitions, controls and the distinction between live data and the pinned reminder.

## Automatic coding contracts

On `home`, run `mem contracts.js` to check the RAM requirement, then `run contracts.js` with one thread and no arguments. The first scan starts immediately. The worker scans the network again every minute and runs alongside the hacking controller. Use `tail contracts.js` for scan counts and `kill contracts.js` to stop it. Start it again after an augmentation reset.

| Contract | How the worker solves it |
| --- | --- |
| Algorithmic Stock Trader I | Tracks the lowest earlier price and the best profit from one trade. Returns zero when buying would lose money. |
| Encryption I: Caesar Cipher | Shifts each uppercase letter left by the supplied key and preserves spaces. |
| Find Largest Prime Factor | Divides out each prime factor and compares the last divisor with the remaining factor. |

Successful submissions print the host, filename and reward in the terminal. Unsupported types and unexpected input stay available for manual review. If the game rejects an answer, the worker records the contract in `contracts-rejected.txt` on home and skips it on subsequent scans and restarts.

The summary strip tracks script income, recent hacking XP per hour, available memory and running processes. Open **Trends** to compare balance, experience, RAM use and target worker threads over the same ten-minute window. **Details** shows the target-selection policy and leading candidate estimates separately from measured income. Hacking XP includes every source. The hourly rate extrapolates the last minute of samples and can jump when an operation completes.

## Operating principles

For additional worker capacity, `run fleet.js` previews one 1,024 GB cloud server with a $60m spending cap and $90m cash reserve. Use `run fleet.js 1024 1 60000000 90000000 apply` to place that order. It preserves existing names, stops when limits are reached and never deletes or replaces a server. See [cloud capacity](OPERATIONS.md#cloud-capacity) before choosing limits.

Run a single controller and choose one hacking mode at a time. Keep worker copies consistent, inspect failures, and distinguish allocated capacity from measured income. Compare production over similar time windows, including preparation costs when evaluating targets.

The scripts operate within Bitburner's simulated environment. They do not automate faction membership, augmentation installation or resets. Purchases made by the Hacknet helper use game currency and explicit budget limits.

## Development

Changes are published with their purpose, usage and validation. Commit history records the implementation's evolution; live levels, balances and network counts stay in the game and its logs.

Run `node cycle.test.mjs` and `node monitor.test.mjs` outside the game. The deterministic suites cover preparation-aware ranking, switch hysteresis, RAM reserves, worker ownership, restart draining, new opener detection, failed copies or launches, and missing or stale dashboard telemetry. They do not replace in-game performance measurements.

Compatibility, RAM costs and available APIs depend on the game version and progression state. Consult the in-game documentation when adapting the tools.

The fleet planner has a separate regression suite: `node fleet.test.mjs`.
