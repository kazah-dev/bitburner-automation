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

For unattended service recovery, run `economy.js` instead. It starts missing hacking, contract, dashboard and investment services in that order, checks every 30 seconds and backs off for five minutes after each launch attempt. Low-memory waits are retried on the next sweep. Existing instances and their arguments are preserved. If Autoexec and a saved supervisor start together, the lowest-PID instance remains active. Stop `economy.js` first when you intentionally want a service to remain stopped. The supervised `capital.js` service makes bounded infrastructure purchases by default. The supervisor does not install augmentations or reset the game.

Save `cycle.js`, `task.js` and `share.js` on home. Check their RAM requirements with `mem`. The controller discovers the network, uses available port-opening programs and runs independent cycles on up to four accessible money targets. It can take multiple preparation rounds before producing money.

Target selection estimates revenue across a full hack, grow and weaken cycle, including preparation, success chance and available worker capacity. It compares several hack fractions and requires a meaningful improvement before switching targets. These are planning estimates, not guaranteed returns or a global optimum.

Growth and weakening allocations account for host CPU cores. Each target has a bounded thread budget and never overlaps its own phases. With sharing enabled, at least 25% of usable worker capacity is kept out of hacking allocations; all spare capacity supports faction work. The controller preserves unrelated processes and keeps 32 GB free on home by default. New network capacity and port openers are detected without restarting.

To pin a target or disable automatic sharing, use `run cycle.js sigma-cosmetics 16 off`. See [the operating guide](OPERATIONS.md#coordinated-mode) for ownership, migration and model limitations.

## Components

| Component | Responsibility |
| --- | --- |
| [cycle.js](cycle.js) | Select targets, size operations and reclaim spare RAM across available servers |
| [economy.js](economy.js) | Start missing core services and recover them with bounded retries |
| [capital.js](capital.js) | Reinvest a limited share of new wealth in demand-driven cloud capacity and short-payback Hacknet upgrades |
| [task.js](task.js) | Execute a single operation with the threads assigned by the controller |
| [inspect.js](inspect.js) | Inventory contracts, faction routes, access requirements and candidate targets |
| [audit.js](audit.js) | Export a read-only local snapshot of server processes, contracts and economic signals |
| [contracts.js](contracts.js) | Find and solve supported coding contracts across the network |
| [monitor.js](monitor.js) | Display a live operations dashboard inside the game |
| [share.js](share.js) | Share spare RAM to improve faction reputation gain |
| [hacknet.js](hacknet.js) | Make bounded Hacknet investments using a payback estimate |
| [fleet.js](fleet.js) | Preview or purchase cloud capacity within a spending cap and cash reserve |
| [deploy.js](deploy.js) and [inicio.js](inicio.js) | Preserve the independent-worker baseline as an alternative operating mode |

Source comments and the operating guide describe parameters, side effects and limitations. Use **Active Scripts** and script logs to inspect the running state.

## Live dashboard

Run `monitor.js` on home to open **Farming Monitor** in the game. This generic dashboard displays operational metrics without personal branding, progression objectives or reminders. **Overview** explains the current hacking phase, charts your balance and breaks down hacking, growing and weakening threads across all farming workers. It also shows Hacknet production, contract-scanner status, sharing threads and RAM use. **Network** lets you inspect servers and routes. **Details** breaks down income, scripts, character stats and open contracts. The dashboard refreshes every two seconds by default.

```text
mem monitor.js
run monitor.js
tail monitor.js
```

Use `run monitor.js 2000` to set the refresh interval in milliseconds. Legacy reminder arguments are ignored. Reopen an existing instance from **Active Scripts**. Read [the monitor guide](OPERATIONS.md#live-monitor) for chart definitions and controls.

## Automatic coding contracts

On `home`, run `mem contracts.js` to check the RAM requirement, then `run contracts.js` with one thread and no arguments. The first scan starts immediately. The worker scans the network again every minute and runs alongside the hacking controller. Use `tail contracts.js` for scan counts and `kill contracts.js` to stop it. Start it again after an augmentation reset.

| Contract | How the worker solves it |
| --- | --- |
| Algorithmic Stock Trader I | Tracks the lowest earlier price and the best profit from one trade. Returns zero when buying would lose money. |
| Encryption I: Caesar Cipher | Shifts each uppercase letter left by the supplied key and preserves spaces. |
| Find Largest Prime Factor | Divides out each prime factor and compares the last divisor with the remaining factor. |
| Subarray with Maximum Sum | Finds the best nonempty contiguous sum in one pass, including all-negative arrays. |
| Total Ways to Sum | Counts unordered integer partitions with at least two parts. Rejects unsafe numeric results and inputs outside the supported range of 1–1,000. |

Successful submissions print the host, filename and reward in the terminal. Unsupported types and unexpected input stay available for manual review. If the game rejects an answer, the worker records the contract in `contracts-rejected.txt` on home and skips it on subsequent scans and restarts.

The summary strip tracks script income, recent hacking XP per hour, available memory and running processes. Open **Trends** to compare balance, experience, RAM use and all farming worker threads over the same ten-minute window. **Details** shows the target-selection policy and leading candidate estimates separately from measured income. Hacking XP includes every source. The hourly rate extrapolates the last minute of samples and can jump when an operation completes.

## Operating principles

For additional worker capacity, `run fleet.js` previews one 1,024 GB cloud server with a $60m spending cap and $90m cash reserve. Use `run fleet.js 1024 1 60000000 90000000 apply` to place that order. It preserves existing names, stops when limits are reached and never deletes or replaces a server. See [cloud capacity](OPERATIONS.md#cloud-capacity) before choosing limits.

Run a single controller and choose one hacking mode at a time. Keep worker copies consistent, inspect failures, and distinguish allocated capacity from measured income. Compare production over similar time windows, including preparation costs when evaluating targets.

The scripts operate within Bitburner's simulated environment. They do not automate faction membership, work selection, TOR/program purchases, home upgrades, backdoors, augmentation installation or resets; those actions need Singularity access for script automation. Purchases use game currency.

## Automatic investment and reset recovery

With `economy.js` configured as Autoexec, `capital.js` starts automatically alongside the core services. Its persistent ledger allows an initial 5% of the balance plus 20% of subsequent new wealth highs, less all of its previous spending. Each pass is additionally capped at 5% of current cash and preserves a cash reserve for missing port-opening programs. Restarts do not refresh the allowance. A genuine augmentation reset starts a new ledger using the reset timestamps.

Cloud expansion requires three consecutive one-minute samples with at least 60% of usable rooted RAM assigned to farming workers. Sharing does not count as demand. It buys 64 GB servers or doubles existing purchased servers in place, with defaults of 8,192 GB per server and 65,536 GB across the purchased fleet. It never deletes servers or stops their scripts. Hacknet upgrades require an estimated payback within 30 minutes; a first node in BitNode 1 can be seeded for at most $5,000 before production is measurable. Hash-producing nodes are skipped.

Inspect decisions with `tail capital.js` or `cat capital-status.txt`. To pause purchases while keeping farming active, create `capital-config.txt` on home containing `{"enabled":false}`. Configuration is read every minute; the [example configuration](capital.config.example.json) lists all available settings. Configuration, spending records and status files stay local.

After an augmentation installation, verify Autoexec has restarted `economy.js`; if needed, run it once manually. It resumes hacking, supported contracts, monitoring and investment as funds and access recover. It detects programs you acquire manually through the existing controller. Read the [recovery and investment guide](OPERATIONS.md#automatic-investment-and-recovery) for limits and migration.

## Development

Changes are published with their purpose, usage and validation. Commit history records the implementation's evolution; live levels, balances and network counts stay in the game and its logs.

Run `node cycle.test.mjs`, `node monitor.test.mjs`, `node contracts.test.mjs`, `node hacknet.test.mjs`, `node fleet.test.mjs`, `node economy.test.mjs` and `node capital.test.mjs` outside the game. The suites cover preparation-aware ranking, concurrent targets, phase isolation, RAM reserves, worker ownership, restart draining, failed copies or launches, dashboard telemetry, contract quarantine and investment payback. Contract arithmetic is compared with brute-force reference results. They do not replace in-game performance measurements.

Compatibility, RAM costs and available APIs depend on the game version and progression state. Consult the in-game documentation when adapting the tools.

The fleet planner has a separate regression suite: `node fleet.test.mjs`.
