# TEST_READY: Mermail Treasury Guardian Demo Test Suite

Zero-dependency Node.js (v18+) checks for `index.html`. Each runner loads the page's inline script into a `node:vm` sandbox with a mock DOM, so no browser and no packages are needed.

## How to Run

```bash
node tests/verify-all.mjs                 # full suite (node:test)
node tests/verify-all.mjs --oracle-only   # security engine suites only (skips HTML, DOM, lint, and event modules)
node tests/verify-all.mjs --summary       # print the coverage inventory
node tests/adversarial-m1.mjs             # design lint, layout, and state-machine stress checks
node tests/challenger-m1-2.mjs            # DOM integrity, script parse, and address-format checks
```

Each runner exits `0` when everything passes and non-zero with the failing assertions otherwise.

## Current Results

| Runner | Checks | Result |
| :--- | ---: | :--- |
| `tests/verify-all.mjs` | 129 tests in 10 suites | Pass |
| `tests/adversarial-m1.mjs` | 37 | Pass |
| `tests/challenger-m1-2.mjs` | 19 | Pass |
| **Total** | **185** | **Pass** |

`tests/oracle.mjs` is not a runner. It is an independent reference implementation (Base58 codec, address validation, poisoning analysis, gas solvency, policy store, state machine) that `verify-all.mjs` uses for its baseline suite and as a fallback when the page does not expose an engine.

## What `verify-all.mjs` Covers

| Suite | Tests | What it checks |
| :--- | ---: | :--- |
| Module 1: Syntax & VM parse | 5 | HTML envelope, no BOM, inline scripts compile and initialize without errors |
| Module 2: DOM integrity | 39 | Every element ID the simulator needs is present |
| Module 3: Design lint | 6 | No emoji, glow shadows, neon gradients, pulse animations, or `rounded-full` pills |
| Module 4: Event bindings | 6 | Every control calls a declared handler; no dead `href="#"` links |
| Module 5: Security engines | 8 | Engines exported on `window`, 32-byte Base58 validation, exact equality, poisoning detection, divergent segments, 0.05 SOL reserve, single/daily/monthly limits, operator rejection |
| Tier 1: Feature paths | 6 | Happy path, poisoning defense, prompt injection, admin limit edit, operator rejection, balance diff |
| Tier 2: Boundaries | 14 | Address lengths 43/44/45, illegal characters, prefix/suffix thresholds 3/4/5, gas, single-limit, and daily-budget edges |
| Tier 3: Pairwise matrix | 36 | Vendor state (active, frozen, unregistered) × address match × deliverable × gas solvency |
| Tier 4: Adversarial scenarios | 6 | Vanity spoofing (vendor stays frozen until verified), injection delimiters, admin limit increase with duplicate-invoice rejection, vendor freeze, rejection, marginal gas |
| Oracle baseline | 3 | Base58 round trip, 5/6 vanity match, 0.05 SOL reserve evaluation |

Module 5 and Tiers 1–4 run against the engines the page itself exports (`SolanaCryptoEngine`, `AddressPoisoningEngine`, `SolanaGasSolver`, `TreasuryPolicyStore`, `GuardianFSM`), not against the oracle. Both use the skill's `workspace/treasury-policy.json` schema: vendors are resolved by `authorized_emails`, limits come from `limits`, and spend and vendor freezes live in a ledger and session state outside the policy.

## What the Suites Do Not Cover

- Rendering in a real browser. Layout checks are static class inspections; confirm visuals by opening `index.html`.
- The Mermail MCP server. Tool calls in the terminal panel are simulated log lines; the real tool contracts live in the skill's `references/tools.md`.
