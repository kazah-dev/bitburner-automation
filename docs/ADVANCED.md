# Advanced services and imported-save adoption

## Compatibility and ownership

The runtime targets Bitburner 3.0.1. Copy JavaScript files with their repository-relative paths. Start `economy.js` on home and set it as Autoexec in Options > System. The supervisor gives an existing corporation priority at startup and reclaims only tagged sharing workers when a service needs memory. Corporation management requires hundreds of GB; use `mem services/corporation.js` to check the installed version.

The core handles farming, sharing, contracts and bounded capital spending. Optional services are selected when their files and game prerequisites are present. Restart the supervisor after unlocking a new subsystem. No Singularity dependency is introduced. Manual progression, augment installation and BitNode transitions are not automated.

## Adopting an imported installation

Export a save and preserve the original source outside the game. Upload this runtime, run `tools/adopt.js`, inspect the preview, then run `tools/adopt.js apply`.

This tool is specifically for adopting a `scripts/` layout. It treats scripts under that prefix as the old managed installation, stops its controllers before workers, moves its home sources into `archive/imported/scripts/`, verifies their contents and starts `economy.js`. Other paths are retained. Existing archive conflicts stop the migration. Archived source preserves original imports; move it back to its original paths before using it as a rollback. Original saves, runtime state and archived imports are private and excluded from publication.

## Corporation policy

`services/corporation.js` manages an existing corporation and its existing divisions. It buys missing warehouses, grows product offices to 120 employees at headquarters and 30 elsewhere, and ensures material offices have at least nine employees. Job assignment releases excess positions before filling shortages. A failed hire terminates the hire loop.

Discretionary purchases share one budget per market cycle: at most 5% of starting funds, while retaining the greater of $1b, 20% of starting funds, or ten minutes of current operating expenses. Each purchase rechecks actual funds. Recurring salaries and Smart Supply are operating costs outside this discretionary budget. Manual material purchase rates and exports between managed divisions are cleared; Smart Supply uses stored inputs first. This trades export optimization for predictable, independent supplies.

Product investment is bounded, only one product develops at a time, and the weakest completed product is replaced only when a larger funded development is ready and another product remains. Research checks fresh balances and preserves research points. Sales use Market-TA.II when available; otherwise product and produced-material prices adapt to observed inventory and sales, including inherited output backlogs. Warehouse expansion waits while outputs exceed 20 production cycles of inventory, so slow sales do not trigger repeated capacity purchases. No investor offer is accepted automatically, no corporation is created, and shares or dividends are not changed.

For Agriculture, Chemical and Tobacco, boost-material targets maximize the production factor within a 60% warehouse allocation using the [official industry exponents](https://github.com/bitburner-official/bitburner-src/blob/dev/src/Corporation/data/IndustryData.ts). Purchases use immediate bulk orders, respect free space and share the cycle budget; no unattended continuous boost-buy rate is left behind. Other industries receive ordinary maintenance without a guessed boost allocation.

## Market policy

`services/stocks.js` waits for TIX and 4S API access. It buys long positions above a 0.60 forecast and exits below 0.50, subject to spread, commission and exposure checks. It does not use shorts or manipulate stocks. New allocations reserve at least $1b and 80% of marked portfolio wealth in cash, with at most 4% allocated to one symbol. Market movement can carry held positions beyond their entry allocation. Portfolio value is not profit. The dashboard's realized P/L is for the current service session; pre-existing entry commissions are not reconstructed.

## Darknet policy

`services/darknet.js` owns temporary `workers/darknet.js` instances in Bitburner's fictional Darknet. Supported models: ZeroLogon, Pr0verFl0, DeskMemo_3.1, FreshInstall_1.0, CloudBlare(tm), OctantVoxel and Laika4. Each worker retries with a cooldown, clears attempts for departed neighbors, collects caches and attempts to free blocked RAM. Servers lacking enough available RAM cannot host the worker. Unknown puzzles are skipped. No external networks, real credentials or Storm Seed are used.

## Monitoring and verification

The Farming Monitor adds corporation cash flow, treasury and product development, stock exposure and session P/L, Darknet worker/cache counts and contract outcomes. Missing or stale reports are shown as unavailable. Telemetry is stored under `data/` and is not published.

Run `npm test` locally. Regression checks cover independent arithmetic oracles, exact large integer roots, portfolio affordability, bounded staffing and spending, failed hires, process ownership, restart recovery, RAM allocation and contract quarantine. Live validation remains required: successful offline tests do not establish an optimal strategy or universal compatibility.

Use `tools/business-audit.js` for a private corporation snapshot and `tools/audit.js` for network/process diagnostics. The latter serializes BigInt contract data as strings so a Square Root contract cannot break the report. `tools/achievements.js nodes` previews bounded purchases toward 30 Hacknet nodes; append `apply` only if wanted. The optional `market` mode skips API purchases unless exact BitNode pricing is available through Source-File 5.
