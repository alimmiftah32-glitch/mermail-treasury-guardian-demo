/**
 * Authoritative Reference Oracle & Security Invariant Engine
 * Mermail Treasury Guardian - Rebuild Test Harness
 *
 * Implements authoritative mathematical specifications from PROJECT.md,
 * TEST_INFRA.md, and ORIGINAL_REQUEST.md.
 */

export const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE58_MAP = new Uint8Array(256);
BASE58_MAP.fill(255);
for (let i = 0; i < BASE58_ALPHABET.length; i++) {
  BASE58_MAP[BASE58_ALPHABET.charCodeAt(i)] = i;
}

export const ATA_RENT_EXEMPT_SOL = 0.00203928;
export const BASE_TX_FEE_SOL = 0.000005;
export const MIN_GAS_RESERVE_SOL = 0.05;

/**
 * Decodes a Base58 string into a Uint8Array byte buffer.
 * Enforces valid alphabet and returns null on corrupt characters.
 * @param {string} str
 * @returns {Uint8Array | null}
 */
export function decodeBase58(str) {
  if (typeof str !== 'string' || str.length === 0) return null;

  const bytes = [0];
  for (let i = 0; i < str.length; i++) {
    const val = BASE58_MAP[str.charCodeAt(i)];
    if (val === 255) return null; // Illegal character (e.g. 0, O, I, l)

    for (let j = 0; j < bytes.length; j++) {
      bytes[j] *= 58;
    }
    bytes[0] += val;

    let carry = 0;
    for (let j = 0; j < bytes.length; j++) {
      const b = bytes[j] + carry;
      bytes[j] = b & 0xff;
      carry = b >> 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  // Preserve leading zeros ('1' in Base58)
  for (let i = 0; i < str.length && str[i] === '1'; i++) {
    bytes.push(0);
  }

  return new Uint8Array(bytes.reverse());
}

/**
 * Encodes a Uint8Array byte buffer into a Base58 string.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function encodeBase58(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length === 0) return '';
  const digits = [0];
  for (let i = 0; i < bytes.length; i++) {
    for (let j = 0; j < digits.length; j++) {
      digits[j] <<= 8;
    }
    digits[0] += bytes[i];

    let carry = 0;
    for (let j = 0; j < digits.length; j++) {
      const d = digits[j] + carry;
      digits[j] = d % 58;
      carry = Math.floor(d / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }

  let result = '';
  // Leading zeros in bytes encode to '1'
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
    result += '1';
  }
  for (let i = digits.length - 1; i >= 0; i--) {
    result += BASE58_ALPHABET[digits[i]];
  }
  return result;
}

/**
 * Validates a Solana Ed25519 public key string.
 * Strictly verifies Base58 alphabet, character length (43-44 canonical), and 32-byte payload.
 * @param {string} addr
 * @returns {{ valid: boolean, error?: string, message?: string, bytes?: Uint8Array }}
 */
export function validateSolanaAddress(addr) {
  if (typeof addr !== 'string') {
    return { valid: false, error: 'INVALID_TYPE', message: 'Address must be a string' };
  }
  if (addr.length < 32 || addr.length > 44) {
    return {
      valid: false,
      error: 'INVALID_LENGTH',
      message: `Address length (${addr.length}) must be between 32 and 44 Base58 characters.`
    };
  }
  const bytes = decodeBase58(addr);
  if (!bytes) {
    return {
      valid: false,
      error: 'INVALID_BASE58_ALPHABET',
      message: 'Address contains illegal Base58 characters (e.g. 0, O, I, l, or symbols).'
    };
  }
  if (bytes.length !== 32) {
    return {
      valid: false,
      error: 'INVALID_BYTE_LENGTH',
      message: `Decoded payload is ${bytes.length} bytes. Ed25519 public keys must be strictly 32 bytes.`
    };
  }
  return { valid: true, bytes };
}

/**
 * Exact full-string equality between two public keys. Public keys are not
 * secret, so this compares every character without any timing guarantees.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function verifyPublicKeyEquality(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Analyzes candidate address against authorized address for vanity address collision (poisoning).
 * Flags collision if candidate != authorized AND prefix >= threshold AND suffix >= threshold.
 * Extracts divergent byte spans and telemetry.
 * @param {string} inputAddr
 * @param {string} authAddr
 * @param {number} threshold
 * @returns {object}
 */
export function analyzeAddressPoisoning(inputAddr, authAddr, threshold = 4) {
  if (typeof inputAddr !== 'string' || typeof authAddr !== 'string' || !inputAddr || !authAddr) {
    return { status: 'INVALID_INPUT', isAuthorized: false, isPoisoning: false };
  }

  // Exact equality check
  if (verifyPublicKeyEquality(inputAddr, authAddr)) {
    return {
      status: 'EXACT_MATCH',
      isAuthorized: true,
      isPoisoning: false,
      prefixLen: inputAddr.length,
      suffixLen: 0,
      divergentCharLength: 0,
      byteMismatchCount: 0,
      message: 'Full-string Base58 public key equality verified.',
      segments: {
        input: { prefix: inputAddr, diverged: '', suffix: '' },
        auth: { prefix: authAddr, diverged: '', suffix: '' }
      }
    };
  }

  // Calculate matching prefix
  let prefixLen = 0;
  const maxPrefix = Math.min(inputAddr.length, authAddr.length);
  while (prefixLen < maxPrefix && inputAddr[prefixLen] === authAddr[prefixLen]) {
    prefixLen++;
  }

  // Calculate matching non-overlapping suffix
  let suffixLen = 0;
  const maxSuffix = Math.min(inputAddr.length - prefixLen, authAddr.length - prefixLen);
  while (
    suffixLen < maxSuffix &&
    inputAddr[inputAddr.length - 1 - suffixLen] === authAddr[authAddr.length - 1 - suffixLen]
  ) {
    suffixLen++;
  }

  const isPoisoning = prefixLen >= threshold && suffixLen >= threshold;

  // Segment slices
  const inputPrefix = inputAddr.slice(0, prefixLen);
  const inputDiverged = inputAddr.slice(prefixLen, inputAddr.length - suffixLen);
  const inputSuffix = suffixLen > 0 ? inputAddr.slice(inputAddr.length - suffixLen) : '';

  const authPrefix = authAddr.slice(0, prefixLen);
  const authDiverged = authAddr.slice(prefixLen, authAddr.length - suffixLen);
  const authSuffix = suffixLen > 0 ? authAddr.slice(authAddr.length - suffixLen) : '';

  // Calculate raw byte mismatches
  const inBytes = decodeBase58(inputAddr);
  const authBytes = decodeBase58(authAddr);
  let byteMismatchCount = -1;
  if (inBytes && authBytes && inBytes.length === 32 && authBytes.length === 32) {
    byteMismatchCount = 0;
    for (let i = 0; i < 32; i++) {
      if (inBytes[i] !== authBytes[i]) byteMismatchCount++;
    }
  }

  return {
    status: isPoisoning ? 'POISONING_COLLISION' : 'UNAUTHORIZED_MISMATCH',
    isAuthorized: false,
    isPoisoning,
    prefixLen,
    suffixLen,
    divergentCharLength: inputDiverged.length,
    byteMismatchCount,
    message: isPoisoning
      ? `Vanity collision detected: ${prefixLen} prefix and ${suffixLen} suffix matching characters with ${inputDiverged.length} diverged characters.`
      : 'Address does not match authorized allowlist.',
    segments: {
      input: { prefix: inputPrefix, diverged: inputDiverged, suffix: inputSuffix },
      auth: { prefix: authPrefix, diverged: authDiverged, suffix: authSuffix }
    }
  };
}

/**
 * Solves and evaluates Solana ATA rent-exempt gas reserve invariant.
 * Invariant: Initial balance >= minReserve AND post-disbursement balance >= minReserve.
 * @param {number} treasurySol
 * @param {boolean} recipientNeedsAta
 * @param {number} minReserve
 * @returns {object}
 */
export function evaluateGasSolvency(treasurySol, recipientNeedsAta = false, minReserve = MIN_GAS_RESERVE_SOL) {
  if (typeof treasurySol !== 'number' || isNaN(treasurySol) || treasurySol < 0) {
    return { isSolvent: false, reason: 'Invalid treasury SOL balance' };
  }

  const ataCost = recipientNeedsAta ? ATA_RENT_EXEMPT_SOL : 0;
  const totalFees = BASE_TX_FEE_SOL + ataCost;
  const postBalance = Number((treasurySol - totalFees).toFixed(8));

  let isSolvent = true;
  let reason = `Solvency verified: Gas reserve exceeds ${minReserve} SOL minimum invariant.`;

  if (treasurySol < minReserve) {
    isSolvent = false;
    reason = `Initial balance (${treasurySol.toFixed(6)} SOL) is below ${minReserve} SOL minimum reserve invariant.`;
  } else if (postBalance < minReserve) {
    isSolvent = false;
    reason = `Post-disbursement balance (${postBalance.toFixed(6)} SOL) breaches ${minReserve} SOL reserve invariant by ${(minReserve - postBalance).toFixed(6)} SOL.`;
  }

  return {
    treasurySol,
    recipientNeedsAta,
    ataCost,
    baseTxFee: BASE_TX_FEE_SOL,
    totalFees,
    postBalance,
    minReserveRequired: minReserve,
    reserveSurplus: Number((postBalance - minReserve).toFixed(8)),
    isSolvent,
    reason
  };
}

// Lookalike threshold from the skill: at least 4 leading and 4 trailing characters match.
export const VANITY_MATCH_THRESHOLD = 4;

// Mirrors the canonical workspace/treasury-policy.json in the skill's references/policy.md.
export function createDefaultTreasuryPolicy() {
  return {
    version: '1.0.0',
    workspace_id: '7a8b9c0d-1e2f-4a5b-8c9d-0e1f2a3b4c5d',
    treasury_credential_id: 'cred_sol_treasury_01',
    treasury_wallet: 'TresW4LLet111111111111111111111111111111111',
    allowed_tokens: [
      { symbol: 'USDC', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6, name: 'USD Coin' },
      { symbol: 'SOL', mint: 'So11111111111111111111111111111111111111112', decimals: 9, name: 'Wrapped SOL' }
    ],
    limits: {
      max_single_transfer_usd: 5000,
      daily_budget_usd: 15000,
      monthly_budget_usd: 75000,
      min_sol_gas_reserve: 0.05
    },
    vendors: [
      {
        vendor_id: 'vnd_acme_corp',
        name: 'Acme Infrastructure Inc',
        authorized_emails: ['billing@acmeinfra.com', 'accounts@acmeinfra.com'],
        solana_address: '8xKZ1vPmR9sLt9wY4vC3dE2fA1bC4dE5fA6bC7dE8fA9',
        default_asset: 'USDC',
        deliverable_required: true
      },
      {
        vendor_id: 'vnd_solana_audits',
        name: 'Solana Security Audits LLC',
        authorized_emails: ['invoices@solana-audits.io'],
        solana_address: '4uQeVj5tqViQh7yWWGStvfEG1Zmhx6uasJtWCJziofM8',
        default_asset: 'USDC',
        deliverable_required: true
      }
    ]
  };
}

export class TreasuryPolicyStore {
  constructor(initialPolicy = createDefaultTreasuryPolicy()) {
    this.policy = JSON.parse(JSON.stringify(initialPolicy));
    // As in the skill, spend history and session freezes live outside the policy file.
    this.ledger = [];
    this.frozenVendors = new Set();
  }

  getActivePolicy() {
    return JSON.parse(JSON.stringify(this.policy));
  }

  // Simulates an administrator editing the policy file; the Guardian itself never writes it.
  updateLimits(updates) {
    for (const key of ['max_single_transfer_usd', 'daily_budget_usd', 'monthly_budget_usd', 'min_sol_gas_reserve']) {
      if (updates[key] === undefined) continue;
      if (typeof updates[key] !== 'number' || !(updates[key] > 0)) {
        throw new Error(`${key} must be a positive number`);
      }
      this.policy.limits[key] = updates[key];
    }
  }

  addVendor(vendor) {
    if (!vendor || !vendor.vendor_id || !vendor.solana_address) {
      return { success: false, error: 'Vendor must have vendor_id and solana_address' };
    }
    const val = validateSolanaAddress(vendor.solana_address);
    if (!val.valid) {
      return { success: false, error: `Invalid Solana Address: ${val.message}` };
    }
    const exists = this.policy.vendors.some(v => v.vendor_id === vendor.vendor_id);
    if (exists) {
      return { success: false, error: `Vendor ${vendor.vendor_id} already exists` };
    }
    this.policy.vendors.push({
      vendor_id: vendor.vendor_id,
      name: vendor.name || vendor.vendor_id,
      authorized_emails: [...(vendor.authorized_emails || [])],
      solana_address: vendor.solana_address,
      default_asset: vendor.default_asset || 'USDC',
      deliverable_required: vendor.deliverable_required ?? true
    });
    return { success: true };
  }

  removeVendor(vendorId) {
    this.policy.vendors = this.policy.vendors.filter(v => v.vendor_id !== vendorId);
  }

  findVendorByEmail(email) {
    const sender = String(email || '').trim().toLowerCase();
    return this.policy.vendors.find(v => v.authorized_emails.some(item => item.toLowerCase() === sender)) || null;
  }

  // A vendor stays frozen for the session until the operator verifies it out of band.
  freezeVendor(vendorId) {
    this.frozenVendors.add(vendorId);
  }

  unfreezeVendor(vendorId) {
    this.frozenVendors.delete(vendorId);
  }

  isVendorFrozen(vendorId) {
    return this.frozenVendors.has(vendorId);
  }

  recordLedgerEntry(entry) {
    this.ledger.push({ recorded_at: new Date().toISOString(), ...entry });
  }

  hasLedgerEntry(vendorId, invoiceId) {
    return this.ledger.some(e => e.vendor_id === vendorId && e.invoice_id === invoiceId);
  }

  // Sum of settled payouts whose ISO timestamp starts with the given date prefix (YYYY-MM-DD or YYYY-MM).
  settledTotal(datePrefix) {
    return this.ledger
      .filter(e => e.status === 'settled' && String(e.recorded_at).startsWith(datePrefix))
      .reduce((sum, e) => sum + Number(e.amount), 0);
  }

  evaluateTransferPolicy(vendorId, amountUsd, candidateAddress) {
    const vendor = this.policy.vendors.find(v => v.vendor_id === vendorId);
    if (!vendor) {
      return { allowed: false, phase: 'PHASE_2_ALLOWLIST', reason: 'Unregistered vendor ID' };
    }
    if (this.isVendorFrozen(vendorId)) {
      return { allowed: false, phase: 'PHASE_2_ALLOWLIST', reason: 'Vendor is frozen pending out-of-band verification' };
    }

    // The payout always goes to the allowlisted address; an address stated in the invoice is only compared.
    if (candidateAddress) {
      const poisonAnalysis = analyzeAddressPoisoning(candidateAddress, vendor.solana_address, VANITY_MATCH_THRESHOLD);

      if (poisonAnalysis.isPoisoning) {
        return {
          allowed: false,
          phase: 'QUARANTINE_FREEZE',
          reason: 'SEV-1 Vanity address poisoning collision detected',
          poisonAnalysis,
          vendor
        };
      }

      if (!poisonAnalysis.isAuthorized) {
        return { allowed: false, phase: 'PHASE_2_ALLOWLIST', reason: 'Destination address mismatch' };
      }
    }

    const { max_single_transfer_usd, daily_budget_usd, monthly_budget_usd } = this.policy.limits;
    if (amountUsd > max_single_transfer_usd) {
      return {
        allowed: false,
        phase: 'PHASE_4_SOLVENCY',
        reason: `Amount ($${amountUsd}) exceeds single transfer limit ($${max_single_transfer_usd})`
      };
    }

    const now = new Date().toISOString();
    if (this.settledTotal(now.slice(0, 10)) + amountUsd > daily_budget_usd) {
      return {
        allowed: false,
        phase: 'PHASE_4_SOLVENCY',
        reason: `Amount ($${amountUsd}) exceeds remaining daily budget ($${daily_budget_usd})`
      };
    }
    if (this.settledTotal(now.slice(0, 7)) + amountUsd > monthly_budget_usd) {
      return {
        allowed: false,
        phase: 'PHASE_4_SOLVENCY',
        reason: `Amount ($${amountUsd}) exceeds remaining monthly budget ($${monthly_budget_usd})`
      };
    }

    return { allowed: true, phase: 'PHASE_5_PAYBOX_STAGE', vendor, singleCap: max_single_transfer_usd };
  }
}

export class GuardianFSM {
  constructor(policyStore = new TreasuryPolicyStore()) {
    this.policyStore = policyStore;
    this.state = 'IDLE';
    this.stagedRequest = null;
    this.history = [];
    this.receipt = null;
  }

  transitionTo(newState, meta = {}) {
    this.state = newState;
    this.history.push({ state: newState, timestamp: new Date().toISOString(), meta });
  }

  processInboundClaim({ email, vendorId, invoiceId, address, amountUsdc, deliverables = {}, treasurySol = 1.84, recipientNeedsAta = false }) {
    this.receipt = null;
    this.stagedRequest = null;
    this.transitionTo('PHASE_1_INTAKE', { email, invoiceId, amountUsdc });

    if (!email || !email.includes('@') || amountUsdc <= 0) {
      this.transitionTo('HALTED_INTAKE_INVALID', { reason: 'Malformed email or non-positive amount' });
      return { success: false, state: this.state, reason: 'Malformed email or amount' };
    }

    this.transitionTo('PHASE_2_ALLOWLIST', { address, vendorId });
    // The vendor is resolved from the sender's authorized email; a claimed vendor ID must agree with it.
    const vendor = this.policyStore.findVendorByEmail(email);
    if (!vendor || (vendorId && vendorId !== vendor.vendor_id)) {
      const reason = vendor
        ? `Claimed vendor ${vendorId} does not match the sender's vendor ${vendor.vendor_id}`
        : 'Sender is not an authorized email of any registered vendor';
      this.transitionTo('HALTED_ALLOWLIST_REJECTED', { reason });
      return { success: false, state: 'HALTED_ALLOWLIST_REJECTED', reason };
    }

    if (invoiceId && this.policyStore.hasLedgerEntry(vendor.vendor_id, invoiceId)) {
      const reason = `Invoice ${invoiceId} already has a ledger entry`;
      this.transitionTo('HALTED_DUPLICATE_INVOICE', { reason });
      return { success: false, state: 'HALTED_DUPLICATE_INVOICE', reason };
    }

    const policyEval = this.policyStore.evaluateTransferPolicy(vendor.vendor_id, amountUsdc, address);

    if (policyEval.phase === 'QUARANTINE_FREEZE') {
      this.policyStore.freezeVendor(vendor.vendor_id);
      this.transitionTo('QUARANTINE_FREEZE', { reason: policyEval.reason, analysis: policyEval.poisonAnalysis });
      return { success: false, state: 'QUARANTINE_FREEZE', reason: policyEval.reason };
    }

    if (!policyEval.allowed && policyEval.phase === 'PHASE_2_ALLOWLIST') {
      this.transitionTo('HALTED_ALLOWLIST_REJECTED', { reason: policyEval.reason });
      return { success: false, state: 'HALTED_ALLOWLIST_REJECTED', reason: policyEval.reason };
    }

    this.transitionTo('PHASE_3_AUDIT', { deliverables });
    if (vendor.deliverable_required) {
      if (!deliverables.prMerged || !deliverables.commitSha || deliverables.testsPassed !== true) {
        this.transitionTo('HALTED_AUDIT_FAILURE', { reason: 'Incomplete or unverified deliverable' });
        return { success: false, state: 'HALTED_AUDIT_FAILURE', reason: 'Deliverable audit verification failed' };
      }
    }

    this.transitionTo('PHASE_4_SOLVENCY', { treasurySol, recipientNeedsAta });
    if (!policyEval.allowed && policyEval.phase === 'PHASE_4_SOLVENCY') {
      this.transitionTo('HALTED_POLICY_EXCEEDED', { reason: policyEval.reason });
      return { success: false, state: 'HALTED_POLICY_EXCEEDED', reason: policyEval.reason };
    }

    const gasReport = evaluateGasSolvency(treasurySol, recipientNeedsAta, this.policyStore.policy.limits.min_sol_gas_reserve);
    if (!gasReport.isSolvent) {
      this.transitionTo('HALTED_INSOLVENT', { reason: gasReport.reason, gasReport });
      return { success: false, state: 'HALTED_INSOLVENT', reason: gasReport.reason };
    }

    this.stagedRequest = {
      requestId: `req_tr_${Date.now().toString(16)}`,
      vendor,
      invoiceId: invoiceId || null,
      amountUsdc,
      recipientAddress: vendor.solana_address,
      gasReport,
      stagedAt: new Date().toISOString()
    };
    this.transitionTo('PHASE_5_PAYBOX_STAGE', { stagedRequest: this.stagedRequest });
    return { success: true, state: 'PHASE_5_PAYBOX_STAGE', stagedRequest: this.stagedRequest };
  }

  operatorSign() {
    if (this.state !== 'PHASE_5_PAYBOX_STAGE' || !this.stagedRequest) {
      throw new Error(`Cannot sign in state ${this.state}. Payout must be staged in Phase 5.`);
    }

    const req = this.stagedRequest;
    const txHash = '2AhCNJ2E54Fxre9XE6VfrWXDDwi46LN4Xj6zFgAk5YksxgJyq3hRX7HipiFvPVc9ZbQ7Er6ZnaY1bpSYr4fJ6yrq';
    this.receipt = {
      transactionHash: txHash,
      slot: 284910291,
      blockTime: Math.floor(Date.now() / 1000),
      timestampIso: new Date().toISOString(),
      feeSol: req.gasReport.totalFees,
      balanceChanges: {
        vaultDiff: -req.amountUsdc,
        recipientDiff: req.amountUsdc,
        solDiff: -req.gasReport.totalFees
      },
      status: 'finalized'
    };

    this.policyStore.recordLedgerEntry({
      vendor_id: req.vendor.vendor_id,
      invoice_id: req.invoiceId,
      amount: req.amountUsdc,
      asset: req.vendor.default_asset,
      recipient_address: req.recipientAddress,
      request_id: req.requestId,
      status: 'settled',
      solscan_url: `https://solscan.io/tx/${txHash}`
    });
    this.stagedRequest = null;
    this.transitionTo('PHASE_6_SOLSCAN', { receipt: this.receipt });
    return { success: true, state: 'PHASE_6_SOLSCAN', receipt: this.receipt };
  }

  operatorReject(reason = 'Operator manual rejection') {
    if (this.state !== 'PHASE_5_PAYBOX_STAGE') {
      throw new Error(`Cannot reject in state ${this.state}. Payout must be staged in Phase 5.`);
    }
    const cancelledReq = this.stagedRequest;
    this.stagedRequest = null;
    this.transitionTo('REJECTED_BY_OPERATOR', { reason, cancelledReq });
    return { success: true, state: 'REJECTED_BY_OPERATOR', reason };
  }
}
