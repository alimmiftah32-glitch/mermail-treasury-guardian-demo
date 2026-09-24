# Mermail Treasury Guardian - Interactive Showcase & Simulation

> **Official Pull Request**: [Nudgen-Marketing/mermail-skills #369](https://github.com/Nudgen-Marketing/mermail-skills/pull/369)  
> **Live Interactive Demo**: [https://alimmiftah32-glitch.github.io/mermail-treasury-guardian-demo/](https://alimmiftah32-glitch.github.io/mermail-treasury-guardian-demo/)  
> **Target Bounty**: "Build and Demo a Mermail Agent Skill" ($500 USDC on Superteam Earn)  
> **Author**: [@alimmiftah32-glitch](https://github.com/alimmiftah32-glitch)

---

## Overview

**Mermail Treasury Guardian** is an enterprise-grade infrastructure skill for agent-assisted grant milestone disbursements and treasury management on the Solana blockchain.

While typical AI skills unsafely trigger automated wallet payouts from unauthenticated emails, the Treasury Guardian enforces strict cryptographic invariants, eliminating the single largest attack vector in Web3 today: **Address Poisoning Attacks**.

### Key Invariants & Features
1. **Cryptographic Anti-Address-Poisoning**: Always pays the vendor address from `workspace/treasury-policy.json`, never one from the email, and compares any invoice-supplied address by exact full-string Base58 equality. Detects prefix/suffix vanity collisions (>= 4 leading and trailing character matches with internal divergence) and immediately freezes execution into emergency quarantine.
2. **Prompt Injection Containment**: Inbound email bodies, subject lines, and invoices are treated as untrusted inputs with bounded reads (< 10,000 chars) and zero tool-triggering authority.
3. **Strict No-Unattended-Payout Policy**: Payouts are never executed autonomously. The agent stages transfers only on a PayBox credential whose `approval_mode` is `always_approve` or `iframe` (autonomous credentials are blocked), then hands the operator the signing link (`signing_handoff.console_url`). The PayBox console always shows the full recipient address.
4. **Solana ATA & Gas Solvency**: Keeps at least 0.05 SOL after the payout, network fees, and any Associated Token Account (ATA) creation rent (~0.00204 SOL).
5. **Deterministic 6-Phase Lifecycle**:
   - Phase 1: Intake & Metadata Discovery
   - Phase 2: Anti-Poisoning Allowlist Check
   - Phase 3: Deliverable Proof Audit (PR, Commit SHA, Tests)
   - Phase 4: Solvency, Gas & Credential Check
   - Phase 5: Staging Signing Handoff
   - Phase 6: Terminal Solscan Finality Receipt & Vendor Notification

---

## Interactive Simulation Scenarios

Open `index.html` in any modern web browser or visit the [Live GitHub Pages Demo](https://alimmiftah32-glitch.github.io/mermail-treasury-guardian-demo/):

- **Scenario A (Happy Path)**: Legitimate milestone claim from registered vendor `Solana Security Audits LLC`. Agent verifies deliverables, validates allowlist address, checks ATA gas solvency, stages transfer in PayBox, and records Solscan finality upon human co-signing.
- **Scenario B (Vanity Address Poisoning Attack)**: Attacker sends an urgent email spoofing the vendor with an address matching the first 5 (`4uQeV`) and last 6 (`ziofM8`) characters. Agent halts execution into emergency quarantine. Zero wallet tools are invoked, and treasury funds remain 100% secure.
- **Scenario C (Prompt Injection)**: Attacker embeds instructions in the invoice attempting to override the agent. Agent sandboxing prevents any unauthorized execution.

The simulator's default policy is the same object as the canonical `workspace/treasury-policy.json` in the skill's `references/policy.md`: vendors are matched by `authorized_emails`, and the limits are $5,000 per transfer, $15,000 per day, $75,000 per month, and a 0.05 SOL reserve.

---

## Styling

`styles.css` is compiled with Tailwind 3.4.17 from `tailwind.config.js` and `src/tailwind.css`; the Pages workflow rebuilds it on every deploy. After changing classes in `index.html`, rebuild it locally:

```bash
npx tailwindcss@3.4.17 -c tailwind.config.js -i src/tailwind.css -o styles.css --minify
```

---

## Verification & Test Evidence
- Demo tests in this repo (zero dependencies, 185 checks; details in [TEST_READY.md](TEST_READY.md)):
  ```bash
  node tests/verify-all.mjs        # 129 tests
  node tests/adversarial-m1.mjs    # 37 checks
  node tests/challenger-m1-2.mjs   # 19 checks
  ```
- Monorepo tests in `Nudgen-Marketing/mermail-skills`:
  ```bash
  node tests/validate.mjs
  # Output: Validated 18 skills and 73 business tools. (0 errors)
  ```
- Automated GitHub Bot Check (`ecc-tools`): **Security evidence gate passed (success)**.
