# Operating guide

## Coordinated mode

Save `cycle.js` and `task.js` on home. Establish root access to the target first, then use:

```text
home
mem cycle.js
mem task.js
run cycle.js sigma-cosmetics
tail cycle.js sigma-cosmetics
```

The optional first argument selects the target; sigma-cosmetics is the default. This default is an example, not an automatically optimized choice.

The controller validates the target and rejects another running copy of itself before taking over. On its first network pass it stops processes named `inicio.js` on accessible hosts, including home. It owns processes named `task.js`; reserve that filename for this controller. Other process names are preserved. Darkweb is excluded as a worker host. On home, the controller keeps 8 GB free in addition to RAM used by existing processes; the remainder can run tasks. This reserve leaves room for inspection and other helpers, but is not a guarantee against unrelated processes starting later.

Each phase waits for existing task.js processes, inspects the target and selects one operation:

1. Weaken when security is above minimum + 0.10.
2. Grow when money is below 99% of maximum.
3. Otherwise hack with a thread budget calculated to take roughly 20% of the available money.

Grow and weaken phases use available remote RAM. Hack phases use the calculated cap. At very low per-thread returns, or when one thread exceeds the desired fraction, the cap is approximate. Hacking chance and changing skill affect realized income.

The controller discovers the network every phase and attempts rooting with programs present on home at startup: BruteSSH, FTPCrack, relaySMTP, HTTPWorm and SQLInject. Restart it after buying another opener. Newly accessible hosts join later phases. File copies and process launches are checked and failures are logged.

### Stopping, switching and updating

Stop cycle.js through **Active Scripts** or with `kill cycle.js sigma-cosmetics` using the actual target argument. Already launched tasks finish independently. Wait for them before editing task.js or switching modes. Restarting the controller with the same helper file waits for surviving tasks before its next phase.

Keep only one controller running. Do not launch task.js manually or run another program that manages those same process names. Deployment and execution are not transactional: partial launches can occur if resources or files change during a phase.

This is sequential phase coordination, not a timed HWGW batch scheduler. It does not automatically select targets or buy RAM, programs or servers. A large target may require a long preparation period; compare complete cycles before assuming a throughput improvement.

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
