# Operating guide

## Coordinated mode

Save `cycle.js`, `task.js` and `share.js` on home, then run:

```text
home
mem cycle.js
mem task.js
mem share.js
run cycle.js auto
tail cycle.js auto
```

Arguments are `[auto|hostname] [home-reserve-GB] [share|off]`. Defaults are `auto 16 share`. Reserve must be at least 8 GB. A hostname pins the target while still adapting the hack fraction and allocating workers. It must be reachable at the current skill level and rootable with the available programs. For example, `run cycle.js sigma-cosmetics 16 off` pins sigma-cosmetics without automatic sharing.

### Target selection

The selector evaluates rooted money servers within the current hacking level. It normalizes live API measurements to minimum security and compares hack caps of 5%, 10%, 20%, 35% and 50%. Each estimate includes hack success chance, money restoration, security recovery and the number of sequential waves that fit in usable network RAM.

Preparation is charged against a 30-minute planning horizon: `score = steady-cycle income × 1800 / (1800 + preparation seconds)`. The controller reevaluates between operations. It keeps the current target until at least one hack has completed and two minutes have passed since selection; switching then requires a score more than 25% higher. This avoids abandoning preparation for small ranking changes. A target that becomes ineligible can be replaced immediately.

This is an approximate sequential model. It uses one-core capacity estimates for ranking, minimum-security operation times and an approximation for distributed growth; skill changes, security changes during workers' completion, failed hacks and additive growth can change the outcome. Servers at security 100 are excluded from automatic ranking until prepared; pinned mode can weaken them. A single hack thread can exceed a requested percentage at extreme multipliers. The score is not a measurement or a claim of optimality. Compare complete cycles before drawing performance conclusions.

The normalization follows the upstream [hacking formulas](https://github.com/bitburner-official/bitburner-src/blob/stable/src/Hacking.ts) and [growth formulas](https://github.com/bitburner-official/bitburner-src/blob/stable/src/Server/formulas/grow.ts). No Formulas.exe or Singularity access is required. Future game changes may require recalibration.

### Work allocation and sharing

Each phase drains surviving `task.js` workers, reclaims its own sharing workers and reads actual target state:

1. Weaken when security exceeds minimum by more than 0.05.
2. Grow when money is below 99% of maximum.
3. Otherwise hack up to the selected fraction, limited by available RAM.

Higher-core machines receive growth and weakening work first. The remaining work budget is reduced by each host's core-adjusted effect, and actual results are inspected before another phase. Growth from zero uses a conservative multiplicative estimate and may need several rounds. Copy and launch failures are logged; only successfully launched threads consume the budget.

Spare capacity runs `share.js cycle-fill <controller-pid>` when the player belongs to a faction. These workers support faction work; the controller does not start or choose that work. They are stopped before the next operation and on controller exit. The helper also checks its owner between share calls, so orphaned workers stop after the current call. Manual, untagged `share.js` processes are preserved and remain reserved. Sharing returns diminish with capacity, and short phases may interrupt a share call.

The home reserve is additional to existing process RAM. The controller rereads RAM before every launch, but it cannot prevent unrelated scripts from starting afterwards. Small unusable fragments, the reserve and short transitions remain free; 100% utilization is not a goal by itself.

Network discovery and port-opener detection run every phase. New programs, rooted hosts and RAM upgrades become usable without restarting. Darkweb is excluded. No programs, RAM or servers are bought.

### Ownership, stopping and updating

Only one controller may run. It owns all `task.js` processes and stops legacy `inicio.js` workers on its first pass. Reserve those names for this system. Only sharing workers with the `cycle-fill` tag are reclaimed. Contracts, the dashboard and unrelated scripts are preserved.

Stop with `kill cycle.js auto` using the actual launch arguments, or use **Active Scripts**. Existing hacking tasks finish independently. A replacement controller waits for them before scheduling new work. Wait for tasks to finish before modifying `task.js`. Update `cycle.js`, `share.js` and `monitor.js` together when migrating from the fixed-target version, then restart the controller and monitor. The contract worker does not need a restart.

The controller writes `cycle-status.txt` on home with the current target, estimated candidates, selected fraction and a heartbeat. The monitor validates both PID and freshness; stale or invalid status falls back to observed workers. This file is generated runtime data and should not be committed.

This remains a sequential phase scheduler, not a timed HWGW batch system. It does not automate factions, augmentation installation or resets.

## Inspection

`run inspect.js` performs a read-only network traversal. It reports coding contracts, routes to faction servers, unrooted hosts and a rough target ranking. The ranking estimates gross hack income per thread at current conditions; it excludes growth, weakening and preparation. It is a screening aid, not a profitability forecast. Contract answers and backdoors require separate action.

## Live monitor

Start `monitor.js` on home and check the installed version's RAM requirement with `mem monitor.js`. Open its log from **Active Scripts** at any time. Closing the window hides it. Stopping the process clears the chart history. Start a fresh instance after installing augmentations.

```text
run monitor.js
run monitor.js 2000 "Your next faction milestone"
```

Choose one command. The first argument is the sample interval in milliseconds (default 2000, minimum 1000). The optional text pins a reminder on Overview. It stays as entered until the monitor is restarted. If using terminal `tail` or `kill`, supply the same script arguments used at launch.

**Overview** translates the active target operation into a short explanation. The balance chart records up to ten minutes of samples, starting at launch. Its vertical scale follows the observed range. Balance includes purchases, contracts and other income. Faction bars compare the player's current hacking level with each server's requirement. Use the game's character overview or Factions screen for live reputation and Augmentations for the install queue.

**Network** lets you select a server, follow its route from home and inspect its memory, access and activity. The memory ranking shows the five busiest hosts by allocated GB. Network capacity includes rooted servers with RAM and home. Free memory can be available between operations even when the controller is healthy.

**Trends** charts balance, total hacking experience, allocated RAM and target worker threads. All four use the same rolling ten-minute sample window and separate vertical scales. The summary strip shows average script income since installing augmentations, observed hacking XP per hour, free network RAM and process/thread counts. The XP rate uses up to one minute of player experience samples, includes all sources, and warms up for five seconds.

The dashboard aligns its own tail container to the top, including after resizing. Its component restores the container layout when unmounted.

**Details** separates net cash change over the last minute from active-script income and average script income since the last augmentation reset. Hacknet income assumes money-producing nodes. Operation durations are estimates at the current skill and security levels. Open contracts list the host and filename for each discovered puzzle.

The monitor uses the game's React log output and tail controls. Switching views only changes the display. It runs alongside the controller and contract worker without Singularity access.

## Faction reputation

`run share.js -t 2` continuously shares RAM. Choose the thread count using `mem share.js` and current free RAM. This reserves RAM while running and does not choose faction work or join factions. Stop it from Active Scripts when that RAM is needed elsewhere.

## Hacknet investments

`run hacknet.js 500000` runs a one-shot investment pass. Spending is capped at the smaller of the argument and 10% of the initial cash balance. Each candidate purchase must have an estimated payback within 30 minutes.

The helper compares a new node, a level, doubled RAM and an extra core. It buys the affordable candidate with the shortest estimated payback and repeats until no qualifying option remains. It may spend much less than the requested budget. Estimates assume ordinary money-producing Hacknet Nodes and stable multipliers; Hash-producing Hacknet Servers are outside its supported scope.

## Independent-worker baseline

`inicio.js` continuously prepares and hacks n00dles. It weakens above minimum + 3, grows below 75% of maximum and otherwise hacks.

After stopping coordinated mode and allowing its tasks to finish, `run deploy.js` discovers hosts and launches no-argument inicio.js workers on free remote RAM. It refuses to operate while cycle.js is running, regardless of the controller's arguments.

Run one deployer at a time. Existing no-argument workers are skipped, existing destination files are reused, and workers are not resized. Keep inicio.js copies identical. Concurrent deployers and manually parameterized copies are outside this workflow. Stopping the deployer leaves its launched workers running.

## Validation and troubleshooting

The scripts have been exercised in the Steam game: complete prepare/hack cycles, helper inventory, bounded Hacknet purchases, shared RAM, and rejection of legacy deployment during coordinated mode. In-game logs remain the authority for a particular save.

For missing files, failed launches or insufficient RAM, correct the reported condition and retry. For slow production, inspect target money, security, operation duration and preparation rounds. Record income across a full cycle rather than inferring it from thread counts.
