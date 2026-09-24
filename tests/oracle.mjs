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
      message: `Address length (${addr.length}) must be between 32 and 44 characters (canonical 44).`
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
 * Constant-time comparison between two public keys.
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
      message: 'Full 44-character Base58 public key equality verified.',
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
 * Invariant: Initial balance >= 0.05 SOL AND post-disbursement balance >= 0.05 SOL.
 * @param {number} treasurySol
 * @param {boolean} recipientNeedsAta
 * @returns {object}
 */
export function evaluateGasSolvency(treasurySol, recipientNeedsAta = false) {
  if (typeof treasurySol !== 'number' || isNaN(treasurySol) || treasurySol < 0) {
    return { isSolvent: false, reason: 'Invalid treasury SOL balance' };
  }

  const ataCost = recipientNeedsAta ? ATA_RENT_EXEMPT_SOL : 0;
  const totalFees = BASE_TX_FEE_SOL + ataCost;
  const postBalance = Number((treasurySol - totalFees).toFixed(8));

  let isSolvent = true;
  let reason = 'Solvency verified: Gas reserve exceeds 0.05 SOL minimum invariant.';

  if (treasurySol < MIN_GAS_RESERVE_SOL) {
    isSolvent = false;
    reason = `Initial balance (${treasurySol.toFixed(6)} SOL) is below 0.05 SOL minimum reserve invariant.`;
  } else if (postBalance < MIN_GAS_RESERVE_SOL) {
    isSolvent = false;
    reason = `Post-disbursement balance (${postBalance.toFixed(6)} SOL) breaches 0.05 SOL reserve invariant by ${(MIN_GAS_RESERVE_SOL - postBalance).toFixed(6)} SOL.`;
  }

  return {
    treasurySol,
    recipientNeedsAta,
    ataCost,
    baseTxFee: BASE_TX_FEE_SOL,
    totalFees,
    postBalance,
    minReserveRequired: MIN_GAS_RESERVE_SOL,
    reserveSurplus: Number((postBalance - MIN_GAS_RESERVE_SOL).toFixed(8)),
    isSolvent,
    reason
  };
}

/**
 * Authoritative initial policy schema and in-memory store.
 */
export function createDefaultTreasuryPolicy() {
  return {
    version: '2.1.0',
    network: 'mainnet-beta',
    updated_at: '2026-09-24T12:00:00Z',
    thresholds: {
      max_single_transfer_usdc: 5000,
      daily_cumulative_limit_usdc: 25000,
      daily_cumulative_spent_usdc: 0,
      min_ata_gas_reserve_sol: 0.05
    },
    quarantine_rules: {
      on_poisoning_detected: 'alert_and_freeze',
      on_limit_exceeded: 'block_transfer',
      on_unregistered_vendor: 'reject_and_notify',
      vanity_prefix_len: 4,
      vanity_suffix_len: 4
    },
    allowlisted_vendors: [
      {
        vendor_id: 'vnd_solana_audits',
        name: 'Solana Security Audits LLC',
        contact_email: 'invoices@solana-audits.io',
        // Canonical 44-char valid 32-byte Ed25519 Solana public key
        solana_address: '4uQeVj5tqViQh7yWWGStvfEG1Zmhx6uasJtWCJziofM8',
        max_single_transfer: 5000,
        daily_cap: 15000,
        status: 'active',
        deliverable_required: true
      },
      {
        vendor_id: 'vnd_acme_infra',
        name: 'Acme Infrastructure Inc',
        contact_email: 'billing@acme-infra.sol',
        solana_address: 'AcmeRPC1111111111111111111111111111111111111',
        max_single_transfer: 10000,
        daily_cap: 20000,
        status: 'active',
        deliverable_required: false
      }
    ]
  };
}

export class TreasuryPolicyStore {
  constructor(initialPolicy = createDefaultTreasuryPolicy()) {
    this.policy = JSON.parse(JSON.stringify(initialPolicy));
  }

  getActivePolicy() {
    return JSON.parse(JSON.stringify(this.policy));
  }

  updateThresholds(updates) {
    if (updates.max_single_transfer_usdc !== undefined) {
      if (typeof updates.max_single_transfer_usdc !== 'number' || updates.max_single_transfer_usdc <= 0) {
        throw new Error('max_single_transfer_usdc must be a positive number');
      }
      this.policy.thresholds.max_single_transfer_usdc = updates.max_single_transfer_usdc;
    }
    if (updates.daily_cumulative_limit_usdc !== undefined) {
      if (typeof updates.daily_cumulative_limit_usdc !== 'number' || updates.daily_cumulative_limit_usdc <= 0) {
        throw new Error('daily_cumulative_limit_usdc must be a positive number');
      }
      this.policy.thresholds.daily_cumulative_limit_usdc = updates.daily_cumulative_limit_usdc;
    }
    this.policy.updated_at = new Date().toISOString();
  }

  addVendor(vendor) {
    if (!vendor || !vendor.vendor_id || !vendor.solana_address) {
      return { success: false, error: 'Vendor must have vendor_id and solana_address' };
    }
    const val = validateSolanaAddress(vendor.solana_address);
    if (!val.valid) {
      return { success: false, error: `Invalid Solana Address: ${val.message}` };
    }
    const exists = this.policy.allowlisted_vendors.some(v => v.vendor_id === vendor.vendor_id);
    if (exists) {
      return { success: false, error: `Vendor ${vendor.vendor_id} already exists` };
    }
    this.policy.allowlisted_vendors.push({
      vendor_id: vendor.vendor_id,
      name: vendor.name || vendor.vendor_id,
      contact_email: vendor.contact_email || '',
      solana_address: vendor.solana_address,
      max_single_transfer: vendor.max_single_transfer || this.policy.thresholds.max_single_transfer_usdc,
      daily_cap: vendor.daily_cap || this.policy.thresholds.daily_cumulative_limit_usdc,
      status: vendor.status || 'active',
      deliverable_required: vendor.deliverable_required ?? true
    });
    return { success: true };
  }

  toggleVendorStatus(vendorId) {
    const v = this.policy.allowlisted_vendors.find(item => item.vendor_id === vendorId);
    if (v) {
      v.status = v.status === 'active' ? 'quarantined' : 'active';
    }
  }

  removeVendor(vendorId) {
    this.policy.allowlisted_vendors = this.policy.allowlisted_vendors.filter(v => v.vendor_id !== vendorId);
  }

  evaluateTransferPolicy(vendorId, amountUsdc, candidateAddress) {
    const vendor = this.policy.allowlisted_vendors.find(v => v.vendor_id === vendorId);
    if (!vendor) {
      return { allowed: false, phase: 'PHASE_2_ALLOWLIST', reason: 'Unregistered vendor ID' };
    }
    if (vendor.status === 'quarantined') {
      return { allowed: false, phase: 'PHASE_2_ALLOWLIST', reason: 'Vendor is currently quarantined' };
    }

    const poisonAnalysis = analyzeAddressPoisoning(
      candidateAddress,
      vendor.solana_address,
      this.policy.quarantine_rules.vanity_prefix_len
    );

    if (poisonAnalysis.isPoisoning) {
      return {
        allowed: false,
        phase: 'QUARANTINE_FREEZE',
        reason: 'SEV-1 Vanity address poisoning collision detected',
        poisonAnalysis
      };
    }

    if (!poisonAnalysis.isAuthorized) {
      return { allowed: false, phase: 'PHASE_2_ALLOWLIST', reason: 'Destination address mismatch' };
    }

    const singleCap = Math.min(vendor.max_single_transfer, this.policy.thresholds.max_single_transfer_usdc);
    if (amountUsdc > singleCap) {
      return {
        allowed: false,
        phase: 'PHASE_4_SOLVENCY',
        reason: `Amount ($${amountUsdc}) exceeds single transfer limit ($${singleCap})`
      };
    }

    if (this.policy.thresholds.daily_cumulative_spent_usdc + amountUsdc > this.policy.thresholds.daily_cumulative_limit_usdc) {
      return {
        allowed: false,
        phase: 'PHASE_4_SOLVENCY',
        reason: `Amount ($${amountUsdc}) exceeds daily cumulative limit ($${this.policy.thresholds.daily_cumulative_limit_usdc})`
      };
    }

    return { allowed: true, phase: 'PHASE_5_PAYBOX_STAGE', vendor, singleCap };
  }
}

/**
 * Deterministic Finite State Machine (GuardianFSM).
 */
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

  processInboundClaim({ email, vendorId, address, amountUsdc, deliverables = {}, treasurySol = 1.84, recipientNeedsAta = false }) {
    this.receipt = null;
    this.stagedRequest = null;
    this.transitionTo('PHASE_1_INTAKE', { email, amountUsdc });

    // Sanitize and check intake
    if (!email || !email.includes('@') || amountUsdc <= 0) {
      this.transitionTo('HALTED_INTAKE_INVALID', { reason: 'Malformed email or non-positive amount' });
      return { success: false, state: this.state, reason: 'Malformed email or amount' };
    }

    // Phase 2: Allowlist & Address Poisoning Check
    this.transitionTo('PHASE_2_ALLOWLIST', { address, vendorId });
    const policyEval = this.policyStore.evaluateTransferPolicy(vendorId, amountUsdc, address);

    if (policyEval.phase === 'QUARANTINE_FREEZE') {
      this.transitionTo('QUARANTINE_FREEZE', { reason: policyEval.reason, analysis: policyEval.poisonAnalysis });
      return { success: false, state: 'QUARANTINE_FREEZE', reason: policyEval.reason };
    }

    if (!policyEval.allowed && policyEval.phase === 'PHASE_2_ALLOWLIST') {
      this.transitionTo('HALTED_ALLOWLIST_REJECTED', { reason: policyEval.reason });
      return { success: false, state: 'HALTED_ALLOWLIST_REJECTED', reason: policyEval.reason };
    }

    // Phase 3: Deliverable Audit Check
    this.transitionTo('PHASE_3_AUDIT', { deliverables });
    const requiresDeliverable = policyEval.vendor?.deliverable_required ?? true;
    if (requiresDeliverable) {
      if (!deliverables.prMerged || !deliverables.commitSha || deliverables.testsPassed !== true) {
        this.transitionTo('HALTED_AUDIT_FAILURE', { reason: 'Incomplete or unverified deliverable' });
        return { success: false, state: 'HALTED_AUDIT_FAILURE', reason: 'Deliverable audit verification failed' };
      }
    }

    // Phase 4: Solvency & Gas Solver Check
    this.transitionTo('PHASE_4_SOLVENCY', { treasurySol, recipientNeedsAta });
    if (!policyEval.allowed && policyEval.phase === 'PHASE_4_SOLVENCY') {
      this.transitionTo('HALTED_POLICY_EXCEEDED', { reason: policyEval.reason });
      return { success: false, state: 'HALTED_POLICY_EXCEEDED', reason: policyEval.reason };
    }

    const gasReport = evaluateGasSolvency(treasurySol, recipientNeedsAta);
    if (!gasReport.isSolvent) {
      this.transitionTo('HALTED_INSOLVENT', { reason: gasReport.reason, gasReport });
      return { success: false, state: 'HALTED_INSOLVENT', reason: gasReport.reason };
    }

    // Phase 5: Stage into PayBox HITL Console (Requires Operator Signature)
    this.stagedRequest = {
      requestId: `req_tr_${Date.now().toString(16)}`,
      vendor: policyEval.vendor,
      amountUsdc,
      recipientAddress: address,
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
    // Generate Solscan Receipt
    const txHash = '5RzKpQe8XwN3tVb7Ym9L4uH2sJ6kF1cD0aE9gB8vW7xZ5qM3pL4sK6tN8rV0yX2w';
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

    // Update cumulative spent
    this.policyStore.policy.thresholds.daily_cumulative_spent_usdc += req.amountUsdc;
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
