# Bitburner Automation

A working early-game Netscript baseline and a one-shot deployment tool. This repository records the code used in our live playthrough and the engineering decisions behind each iteration.

## Files

| File | Purpose | RAM measured in v3.0.1 |
| --- | --- | --- |
| `inicio.js` | Continuously prepare and hack `n00dles` | 2.40 GB per thread |
| `deploy.js` | Discover the network and deploy workers on accessible machines | 4.45 GB |

## Requirements

- Bitburner with Netscript 2 support. Validated in Steam v3.0.1.
- Both files saved on `home` using their exact filenames.
- At least 4.45 GB free RAM on home to launch the deployer.
- Root access to `n00dles` and hacking skill sufficient for that target.
- Optional `BruteSSH.exe` and `FTPCrack.exe` on home. The deployer uses whichever of these two tools you own.

## Quick start

Create each file in the in-game script editor and paste its source. Save both on home. Run these commands inside the game terminal, one line at a time.

```text
home
connect n00dles
run NUKE.exe
home
mem inicio.js
mem deploy.js
run deploy.js
```

Inspect **Active Scripts** to see each worker and its production. To expand the network after acquiring another supported port opener or freeing RAM, run `run deploy.js` again.

## Deployment behavior

1. Discover the reachable network with a breadth-first traversal.
2. Skip home and darkweb as worker hosts.
3. Use available SSH/FTP openers and NUKE when their count meets the host's port requirement.
4. Skip hosts already running `inicio.js` with no arguments.
5. Compute the thread count from free RAM and the home worker's RAM cost.
6. Copy the worker if the destination filename does not already exist.
7. Launch it, check the returned PID and print a per-host report.

The deployer exits after one pass. It does not buy programs, servers or upgrades. A failed copy or launch is reported and can be retried after resolving the cause.

## Worker strategy

Each worker prioritizes reducing security above minimum + 3, then grows money below 75% of the target's maximum, then hacks. Awaiting each operation keeps execution sequential within one worker.

## Verified execution — November 5, 2026

The live save already had seven workers with 37 threads before this deployment. After purchasing FTPCrack for $1.5 million of in-game currency:

- Discovered 70 hosts.
- Started 10 additional workers with 139 additional threads.
- Reached 17 worker hosts and 176 total threads.
- Re-ran the deployer with the same state. It started zero workers and added zero threads.

These results validate deployment and repeat execution for this save. They do not establish a 4.76x income increase. Actual income depends on the target and on overlapping grow, weaken and hack operations.

## Design limits

- The target is fixed to n00dles. Target selection and coordinated batches are planned.
- Independent workers can overlap and perform redundant operations.
- Only SSH and FTP openers are supported in this revision.
- Existing destination files are reused. Keep all copies of inicio.js identical and do not repurpose that filename.
- Duplicate detection matches the worker with no arguments. Run one deployer at a time. Concurrent deployers and differently parameterized workers are outside this version's supported workflow.
- Thread counts are decided at launch time. Existing workers are not resized or restarted.
- The deployment report measures started processes and allocated threads, rather than profitability.
- Stop a worker from Active Scripts. Stopping deploy.js after it has launched workers leaves those workers running.
- No faction actions, backdoors, augmentations or resets are automated.

## Progress log

- Established the starter n00dles worker and deployed it to seven machines.
- Acquired TOR and BruteSSH, installed the CSEC backdoor and joined CyberSec.
- Started faction hacking contracts.
- Added network discovery and repeatable deployment with SSH/FTP support.
- Next work will compare target profitability, measure income over fixed windows and coordinate worker operations.

Progress snapshots describe the live save at the time recorded. Future changes will document their purpose, usage, validation and trade-offs.

