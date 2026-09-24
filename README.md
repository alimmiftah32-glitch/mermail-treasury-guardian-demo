# Mermail Treasury Guardian - Interactive Showcase & Simulation

> **Official Pull Request**: [Nudgen-Marketing/mermail-skills #369](https://github.com/Nudgen-Marketing/mermail-skills/pull/369)  
> **Live Interactive Demo**: [https://alimmiftah32-glitch.github.io/mermail-treasury-guardian-demo/](https://alimmiftah32-glitch.github.io/mermail-treasury-guardian-demo/)  
> **Target Bounty**: "Build and Demo a Mermail Agent Skill" ($500 USDC on Superteam Earn)  
> **Author**: [@alimmiftah32-glitch](https://github.com/alimmiftah32-glitch)

---

## Overview

**Mermail Treasury Guardian** is an enterprise-grade infrastructure skill for autonomous grant milestone disbursements and treasury management on the Solana blockchain.

While typical AI skills unsafely trigger automated wallet payouts from unauthenticated emails, the Treasury Guardian enforces strict cryptographic invariants, eliminating the single largest attack vector in Web3 today: **Address Poisoning Attacks**.

### Key Invariants & Features
1. **Cryptographic Anti-Address-Poisoning**: Enforces strict 44-character Base58 equality matching against `workspace/treasury-policy.json`. Detects prefix/suffix vanity collisions (>= 4 leading and trailing character matches with internal divergence) and immediately freezes execution into emergency quarantine.
2. **Prompt Injection Containment**: Inbound email bodies, subject lines, and invoices are treated as untrusted inputs with bounded reads (< 10,000 chars) and zero tool-triggering authority.
3. **Strict No-Unattended-Payout Policy**: Payouts are never executed autonomously. The agent stages transfers in Mermail PayBox (`paybox_request_transfer`) and delivers a secure human-in-the-loop signing console link (`signing_handoff.console_url`).
4. **Solana ATA & Gas Solvency**: Enforces a minimum 0.05 SOL reserve buffer, ensuring rent-exempt Associated Token Account (ATA) creation fees (~0.00204 SOL) and network fees are covered before disbursement.
5. **Deterministic 6-Phase Lifecycle**:
   - Phase 1: Intake & Metadata Discovery
   - Phase 2: Anti-Poisoning Allowlist Check
   - Phase 3: Deliverable Proof Audit (PR, Commit SHA, Tests)
   - Phase 4: Solvency & Gas Check
   - Phase 5: Staging Signing Handoff
   - Phase 6: Terminal Solscan Finality Receipt & Vendor Notification

---

## Interactive Simulation Scenarios

Open `index.html` in any modern web browser or visit the [Live GitHub Pages Demo](https://alimmiftah32-glitch.github.io/mermail-treasury-guardian-demo/):

- **Scenario A (Happy Path)**: Legitimate milestone claim from registered vendor `Solana Security Audits LLC`. Agent verifies deliverables, validates allowlist address, checks ATA gas solvency, stages transfer in PayBox, and records Solscan finality upon human co-signing.
- **Scenario B (Vanity Address Poisoning Attack)**: Attacker sends an urgent email spoofing the vendor with an address matching the first 5 (`4uQeV`) and last 5 (`ziofM`) characters. Agent halts execution into emergency quarantine. Zero wallet tools are invoked, and treasury funds remain 100% secure.
- **Scenario C (Prompt Injection)**: Attacker embeds instructions in the invoice attempting to override the agent. Agent sandboxing prevents any unauthorized execution.

---

## Verification & Test Evidence
- Monorepo tests in `Nudgen-Marketing/mermail-skills`:
  ```bash
  node tests/validate.mjs
  # Output: Validated 18 skills and 73 business tools. (0 errors)
  ```
- Automated GitHub Bot Check (`ecc-tools`): **Security evidence gate passed (success)**.
