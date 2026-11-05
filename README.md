# Bitburner Automation

Netscript tools for building and operating an automated Bitburner network. The project brings together hacking workers, network discovery and deployment, with an emphasis on clear behavior, efficient resource use and repeatable execution.

## Getting started

Copy the JavaScript files into the in-game script editor on `home`, keeping their filenames. Read the source comments and check the RAM requirements with `mem` before launching a script.

```text
home
mem inicio.js
mem deploy.js
run deploy.js
```

The worker target must be accessible and within your hacking skill. Port-opening programs belong on `home`. Available programs and server access determine how far a deployment can expand.

## Components

- [Hacking worker](inicio.js) — prepares a target and runs its hacking cycle.
- [Network deployment](deploy.js) — discovers servers, attempts supported access methods and starts workers using available RAM.

The source files define the current parameters and supported operations. Use **Active Scripts** and the in-game terminal reports to inspect the live state, resource consumption and production.

## Operating principles

Deployment is designed for deliberate, repeatable runs. Run one deployer at a time and keep worker files consistent across servers. Review each script before running it against an existing setup, especially when changing targets or replacing a previous version.

Track income over comparable time windows before drawing conclusions about performance. Network size and allocated threads are capacity measures, while profitability also depends on target conditions, timing and coordination.

## Development

Changes are published with their purpose, usage and validation. Repository history records the evolution of the implementation. Live character statistics, balances and server counts belong to the running game and its logs.

The project evolves through small, verifiable improvements to target selection, resource allocation, worker coordination and progression support.

## Scope

These tools use Bitburner’s simulated environment and Netscript API. Compatibility, RAM costs and available actions depend on the game version and progression state. Check the in-game documentation when adapting the scripts.
