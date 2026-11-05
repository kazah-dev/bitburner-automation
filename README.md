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
| [share.js](share.js) | Share spare RAM to improve faction reputation gain |
| [hacknet.js](hacknet.js) | Make bounded Hacknet investments using a payback estimate |
| [deploy.js](deploy.js) and [inicio.js](inicio.js) | Preserve the independent-worker baseline as an alternative operating mode |

Source comments and the operating guide describe parameters, side effects and limitations. Use **Active Scripts** and script logs to inspect the running state.

## Operating principles

Run a single controller and choose one hacking mode at a time. Keep worker copies consistent, inspect failures, and distinguish allocated capacity from measured income. Compare production over similar time windows, including preparation costs when evaluating targets.

The scripts operate within Bitburner's simulated environment. They do not automate faction membership, augmentation installation or resets. Purchases made by the Hacknet helper use game currency and explicit budget limits.

## Development

Changes are published with their purpose, usage and validation. Commit history records the implementation's evolution; live levels, balances and network counts stay in the game and its logs.

Compatibility, RAM costs and available APIs depend on the game version and progression state. Consult the in-game documentation when adapting the tools.
