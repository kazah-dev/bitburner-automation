# Bitburner Automation

An evolving Netscript toolkit for coordinated farming, supported coding contracts, bounded infrastructure investment and a live in-game monitor. Implementation history and validation are shared here; transient playthrough statistics stay in the game.

## Quick start

Copy the runtime JavaScript files to **home**, preserving their folder paths, then run `economy.js`. Set `economy.js` in **Options → System → Autoexec Script + Args** to recover services when loading the game. After installing augmentations, check that it is running and start it manually if needed. Check script RAM costs with `mem` on small home servers.

**Updating a flat installation:** export a save, upload the full new layout, run `tools/migrate.js` to preview, then `tools/migrate.js apply`. The migration drains hacking tasks, preserves the investment ledger and rejected-contract list, archives old scripts, and restarts the supervisor. Read the [migration guide](docs/OPERATIONS.md#folder-migration) first.

## Layout

| Path | Purpose |
| --- | --- |
| [economy.js](economy.js) | Single entry point and service recovery |
| [services/](services/) | Farming controller, contract scanner and investment policy |
| [workers/](workers/) | One-operation workers and reclaimable faction sharing |
| [ui/monitor.js](ui/monitor.js) | Farming Monitor: balance, XP, RAM, workload and network views |
| [tools/](tools/) | Inspection, audit snapshots, migration and bounded purchase helpers |
| [legacy/](legacy/) | Independent-worker baseline, used separately from the controller |
| [config/](config/) | Example investment settings |
| [tests/](tests/) | Offline behavioral regression checks |
| [docs/OPERATIONS.md](docs/OPERATIONS.md) | Parameters, ownership, limits and recovery |
| data/ | Private in-game state and telemetry, created at runtime |
| archive/ | Private migration rollback copies, excluded from version control |

## Behavior

- **Farming:** up to four independent targets, selected using estimated complete-cycle returns and preparation costs. Each target finishes one phase before starting the next. New port openers and available RAM are discovered automatically; unrelated scripts and the home RAM reserve are preserved.
- **Sharing:** spare capacity supports faction work. Tagged sharing workers release RAM when farming needs it, and do not count as demand for infrastructure purchases.
- **Contracts:** Algorithmic Stock Trader I, Encryption I: Caesar Cipher, Find Largest Prime Factor, Subarray with Maximum Sum and Total Ways to Sum. Unsupported inputs remain untouched; rejected answers are quarantined across restarts.
- **Investment:** persistent spending allowance, cash reserves, per-pass limits, measured farming demand and estimated Hacknet payback constrain purchases. Cloud servers are upgraded in place.
- **Monitoring:** generic operational metrics and recent trends, without personal branding, progression goals or reminders. Planning estimates are separate from measured income.
- **Recovery:** missing services are checked every 30 seconds, with bounded retries and deterministic ownership on reload.

The toolkit does not automate faction membership, work selection, backdoors, TOR/program purchases, home upgrades or augmentation resets. Those progression actions require manual interaction until the relevant Singularity APIs are unlocked. All scripts operate inside Bitburner's simulated environment and spend only game currency.

## Controls

```text
run tools/inspect.js
run tools/audit.js
cat data/capital-status.txt
tail services/cycle.js auto 32 share 4
```

To pause purchases, save `{"enabled":false}` in `data/capital-config.txt`. The [example configuration](config/capital.example.json) lists supported limits. To intentionally stop services, stop `economy.js` first so it does not restart them.

## Validation

Optional concurrency check: run `tools/concurrency.js` for a preview, then add `apply` to hold 1,000 small workers for 20 seconds. This meets the "Need more real life ram" achievement condition. It requires about 1,600 GB on home plus a 32 GB reserve, temporarily reclaims only controller-owned sharing workers, and cleans up its own processes on completion or launch failure. Farming tasks remain running. The generated helper in `workers/concurrency-wait.js` also expires after 60 seconds; the tool is never started automatically.

Run `npm test` with Node.js from the repository root. Tests cover ranking, phase isolation, RAM ownership, restart draining, contract arithmetic and quarantine, investment limits, crash accounting, service recovery and folder migration. Live checks remain necessary for compatibility and throughput: estimates are not guaranteed income or a claim of globally optimal farming.

The [operating guide](docs/OPERATIONS.md) documents assumptions and tradeoffs. Changes include their purpose, usage and verification; this README remains independent of any level, balance or reset count.
