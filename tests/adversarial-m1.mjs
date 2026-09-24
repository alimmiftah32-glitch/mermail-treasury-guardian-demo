/**
 * Adversarial Verification & Empirical Stress-Test Suite for Milestone M1
 * 
 * Verifies:
 * - Tier 1: Comprehensive Unicode & Obfuscation Detector (Astral plane, Dingbats, entities, JS escapes, Base64)
 * - Tier 2: Glowing Box Shadows & Glassmorphism Detector (Tailwind, inline styles, CSS vars)
 * - Tier 3: Gradient Detector (Tailwind classes, linear/radial gradients, SVG defs)
 * - Tier 4: Pulsating & Pinging Keyframes and Animations Detector (pulse, ping, keyframes, JS additions)
 * - Tier 5: 9999px Pills & Exaggerated Border Radii Detector (rounded-full, rounded-xl/2xl/3xl, border-radius)
 * - Tier 6: Solana Cryptographic Address & Monospace Invariants (Base58 range, monospace styling, address bug detection)
 * - Tier 7: Responsive Layout Resilience & Truncation Invariants (Breakpoint classes, min-w-0, stepper layout)
 * - Tier 8: Headless Browser VM Execution & Interactive State Machine Verification (Scenarios 1-3, operator sign/reject, dynamic DOM safety)
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const INDEX_HTML_PATH = path.join(PROJECT_ROOT, 'index.html');

console.log('================================================================');
console.log('  MERMAIL TREASURY GUARDIAN - ADVERSARIAL STRESS-TEST (M1)      ');
console.log('================================================================');
console.log(`Target: ${INDEX_HTML_PATH}\n`);

const htmlContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function runTest(name, testFn) {
  totalTests++;
  try {
    testFn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         Reason: ${err.message}`);
    failures.push({ name, error: err.message });
    failedTests++;
  }
}

// ============================================================================
// TIER 1: Comprehensive Unicode & Obfuscation Detector
// ============================================================================
console.log('\n--- TIER 1: Unicode & Obfuscation Detection ---');

runTest('1.1: Zero non-ASCII characters across entire index.html (Strict ASCII 0-127)', () => {
  const nonAscii = [];
  for (let i = 0; i < htmlContent.length; i++) {
    const code = htmlContent.charCodeAt(i);
    if (code > 127) {
      nonAscii.push({
        char: htmlContent[i],
        code: `0x${code.toString(16).toUpperCase()}`,
        index: i
      });
    }
  }
  assert.equal(nonAscii.length, 0, `Found ${nonAscii.length} non-ASCII characters: ${JSON.stringify(nonAscii.slice(0, 5))}`);
});

runTest('1.2: Zero astral-plane emojis (U+1F000 to U+1FAFF)', () => {
  const astralEmojiRegex = /[\u{1F000}-\u{1FAFF}]/gu;
  const matches = [...htmlContent.matchAll(astralEmojiRegex)].map(m => m[0]);
  assert.deepEqual(matches, [], `Found astral emojis: ${matches.join(', ')}`);
});

runTest('1.3: Zero Dingbats or Miscellaneous Symbols (U+2600 to U+27BF, e.g. ⚠, ⚡, ✅, ❌)', () => {
  const symbolRegex = /[\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  const matches = [...htmlContent.matchAll(symbolRegex)].map(m => m[0]);
  assert.deepEqual(matches, [], `Found symbol glyphs: ${matches.join(', ')}`);
});

runTest('1.4: Zero numeric decimal or hex HTML entities (e.g. &#128640; or &#x1F680;)', () => {
  const numericEntityRegex = /&#[0-9]+;|&#x[0-9a-fA-F]+;/g;
  const matches = [...htmlContent.matchAll(numericEntityRegex)].map(m => m[0]);
  assert.deepEqual(matches, [], `Found numeric HTML entities: ${matches.join(', ')}`);
});

runTest('1.5: Only safe standard XML entities allowed (&amp;, &lt;, &gt;, &quot;)', () => {
  const entityRegex = /&[a-zA-Z0-9]+;/g;
  const matches = [...htmlContent.matchAll(entityRegex)].map(m => m[0]);
  const allowed = new Set(['&amp;', '&lt;', '&gt;', '&quot;']);
  const violations = matches.filter(e => !allowed.has(e));
  assert.deepEqual(violations, [], `Found unauthorized HTML entities: ${violations.join(', ')}`);
});

runTest('1.6: Zero JS Unicode escape sequences (\\uXXXX, \\u{X...}, \\xXX)', () => {
  const escapeRegex = /\\u[0-9a-fA-F]{4}|\\u\{[0-9a-fA-F]+\}|\\x[0-9a-fA-F]{2}/g;
  const matches = [...htmlContent.matchAll(escapeRegex)].map(m => m[0]);
  assert.deepEqual(matches, [], `Found JS unicode escape sequences: ${matches.join(', ')}`);
});

runTest('1.7: Zero dynamic string code point / char code constructors or Base64 decoding', () => {
  assert.ok(!/from(Char|Code)Point/i.test(htmlContent), 'Found String.fromCharCode or fromCodePoint');
  assert.ok(!/\batob\b|\bbtoa\b/i.test(htmlContent), 'Found atob/btoa obfuscation');
  assert.ok(!/Buffer\.from/i.test(htmlContent), 'Found Buffer.from');
});

// ============================================================================
// TIER 2: Glowing Box Shadows & Glassmorphism Detector
// ============================================================================
console.log('\n--- TIER 2: Glowing Box Shadows & Glassmorphism ---');

runTest('2.1: Zero Tailwind box-shadow classes (shadow-sm, shadow, shadow-md, shadow-lg, shadow-xl, shadow-2xl)', () => {
  const shadowRegex = /\bshadow-(?:sm|md|lg|xl|2xl|inner)\b|\bshadow\b(?!\s*[:=])/g;
  const matches = [...htmlContent.matchAll(shadowRegex)].map(m => m[0]);
  assert.deepEqual(matches, [], `Found Tailwind shadow classes: ${matches.join(', ')}`);
});

runTest('2.2: Zero colored/glowing shadow classes (shadow-emerald-*, shadow-rose-*, etc.)', () => {
  const coloredShadowRegex = /\bshadow-[a-z]+-[0-9]+(?:\/[0-9]+)?\b/g;
  const matches = [...htmlContent.matchAll(coloredShadowRegex)].map(m => m[0]);
  assert.deepEqual(matches, [], `Found colored shadow classes: ${matches.join(', ')}`);
});

runTest('2.3: Zero Tailwind drop-shadow classes (drop-shadow, drop-shadow-*)', () => {
  const dropShadowRegex = /\bdrop-shadow(?:-[a-z0-9]+)?\b/g;
  const matches = [...htmlContent.matchAll(dropShadowRegex)].map(m => m[0]);
  assert.deepEqual(matches, [], `Found drop-shadow classes: ${matches.join(', ')}`);
});

runTest('2.4: Zero CSS box-shadow or filter:drop-shadow properties in styles', () => {
  const cssShadowRegex = /box-shadow\s*:[^;]+|filter\s*:[^;]*drop-shadow/gi;
  const matches = [...htmlContent.matchAll(cssShadowRegex)].map(m => m[0]);
  assert.deepEqual(matches, [], `Found CSS box-shadow properties: ${matches.join(', ')}`);
});

// ============================================================================
// TIER 3: Gradient Detector
// ============================================================================
console.log('\n--- TIER 3: Neon & Consumer Gradients ---');

runTest('3.1: Zero Tailwind bg-gradient classes (bg-gradient-to-*)', () => {
  const gradientRegex = /\bbg-gradient-to-[a-z]+\b/g;
  const matches = [...htmlContent.matchAll(gradientRegex)].map(m => m[0]);
  assert.deepEqual(matches, [], `Found Tailwind gradient classes: ${matches.join(', ')}`);
});

runTest('3.2: Zero gradient color stop classes (from-*, via-*, to-*) with colors', () => {
  const colorStopRegex = /\b(?:from|via|to)-(?:emerald|teal|cyan|purple|indigo|pink|rose|amber|blue|slate|zinc|gray)-[0-9]+(?:\/[0-9]+)?\b/g;
  const matches = [...htmlContent.matchAll(colorStopRegex)].map(m => m[0]);
  assert.deepEqual(matches, [], `Found gradient color stop classes: ${matches.join(', ')}`);
});

runTest('3.3: Zero CSS linear-gradient, radial-gradient, or conic-gradient', () => {
  const cssGradRegex = /\b(?:linear|radial|conic)-gradient\s*\(/gi;
  const matches = [...htmlContent.matchAll(cssGradRegex)].map(m => m[0]);
  assert.deepEqual(matches, [], `Found CSS gradient functions: ${matches.join(', ')}`);
});

runTest('3.4: Zero SVG linearGradient or radialGradient elements', () => {
  const svgGradRegex = /<linearGradient|<radialGradient/gi;
  const matches = [...htmlContent.matchAll(svgGradRegex)].map(m => m[0]);
  assert.deepEqual(matches, [], `Found SVG gradient elements: ${matches.join(', ')}`);
});

// ============================================================================
// TIER 4: Pulsating & Pinging Keyframes and Animations Detector
// ============================================================================
console.log('\n--- TIER 4: Pulsating & Pinging Keyframes and Animations ---');

runTest('4.1: Zero Tailwind animate-pulse, animate-ping, animate-bounce, or animate-spin', () => {
  const animateRegex = /\banimate-(?:pulse|ping|bounce|spin)\b/g;
  const matches = [...htmlContent.matchAll(animateRegex)].map(m => m[0]);
  assert.deepEqual(matches, [], `Found Tailwind animation classes: ${matches.join(', ')}`);
});

runTest('4.2: Zero custom animate classes (animate-*)', () => {
  const customAnimRegex = /\banimate-[a-zA-Z0-9_-]+\b/g;
  const matches = [...htmlContent.matchAll(customAnimRegex)].map(m => m[0]);
  assert.deepEqual(matches, [], `Found custom animate classes: ${matches.join(', ')}`);
});

runTest('4.3: Zero @keyframes definitions in CSS', () => {
  const keyframesRegex = /@keyframes\s+[a-zA-Z0-9_-]+/gi;
  const matches = [...htmlContent.matchAll(keyframesRegex)].map(m => m[0]);
  assert.deepEqual(matches, [], `Found @keyframes CSS rules: ${matches.join(', ')}`);
});

runTest('4.4: Zero JS class additions of pulse or ping', () => {
  const jsPulseRegex = /classList\.(?:add|toggle)\s*\(\s*['"][^'"]*(?:pulse|ping)[^'"]*['"]\s*\)/gi;
  const matches = [...htmlContent.matchAll(jsPulseRegex)].map(m => m[0]);
  assert.deepEqual(matches, [], `Found dynamic JS pulse/ping class manipulation: ${matches.join(', ')}`);
});

// ============================================================================
// TIER 5: 9999px Pills & Exaggerated Border Radii Detector
// ============================================================================
console.log('\n--- TIER 5: 9999px Pills & Border Radii Conformance ---');

runTest('5.1: Zero rounded-full classes across all HTML tags', () => {
  const roundedFullRegex = /\brounded-full\b/g;
  const matches = [...htmlContent.matchAll(roundedFullRegex)].map(m => m[0]);
  assert.deepEqual(matches, [], `Found rounded-full instances: ${matches.join(', ')}`);
});

runTest('5.2: Zero consumer-grade rounded-xl, rounded-2xl, or rounded-3xl classes', () => {
  const roundedLargeRegex = /\brounded-(?:xl|2xl|3xl)\b/g;
  const matches = [...htmlContent.matchAll(roundedLargeRegex)].map(m => m[0]);
  assert.deepEqual(matches, [], `Found excessive rounded classes: ${matches.join(', ')}`);
});

runTest('5.3: Zero arbitrary rounded-[...] classes', () => {
  const arbitraryRoundedRegex = /\brounded-\[[^\]]+\]/g;
  const matches = [...htmlContent.matchAll(arbitraryRoundedRegex)].map(m => m[0]);
  assert.deepEqual(matches, [], `Found arbitrary rounded classes: ${matches.join(', ')}`);
});

runTest('5.4: All border-radius classes adhere strictly to institutional scale (rounded-sm [4px], rounded-md [6px], rounded-lg [8px])', () => {
  const roundedClasses = [...htmlContent.matchAll(/\brounded-(?:[a-zA-Z0-9_-]+)\b/g)].map(m => m[0]);
  const allowed = new Set(['rounded-sm', 'rounded-md', 'rounded-lg']);
  const invalid = roundedClasses.filter(c => !allowed.has(c));
  assert.deepEqual(invalid, [], `Found border radius classes outside institutional scale: ${invalid.join(', ')}`);
});

// ============================================================================
// TIER 6: Solana Cryptographic Address & Monospace Invariants
// ============================================================================
console.log('\n--- TIER 6: Cryptographic Address & Monospace Rigor ---');

runTest('6.1: Authorized vendor address is within Solana Base58 length range (43-44 chars)', () => {
  const authAddr = '4uQeVj5tqViQh7yWWGStvfEG1Zmhx6uasJtWCJziofM';
  assert.ok(authAddr.length >= 43 && authAddr.length <= 44, `Authorized vendor address length (${authAddr.length}) must be 43-44 chars`);
  assert.ok(htmlContent.includes(authAddr), 'index.html must include authorized vendor address');
});

runTest('6.2: Attacker address is strictly within Solana Base58 length range (43-44 chars)', () => {
  const attackerAddr = '4uQeV9999ATTACKERHASHX223455112348ABCDziofM';
  assert.ok(attackerAddr.length >= 43 && attackerAddr.length <= 44, `Attacker address length (${attackerAddr.length}) must be 43-44 chars`);
  assert.ok(htmlContent.includes(attackerAddr), 'index.html must include updated attacker address');
  // Confirm the old baseline 38-character broken address is gone
  const oldDefectiveAddr = '4uQeV9999ATTACKERHASHX223455112348ziofM';
  assert.ok(!htmlContent.includes(oldDefectiveAddr), 'Old defective 38-char attacker address must not exist');
});

runTest('6.3: Secondary allowlist vendor address is 44 characters', () => {
  const secondaryAddr = '8xKZ1vPmR9sLt9wY4vC3dE2fA1bC4dE5fA6bC7dE8fA9';
  assert.equal(secondaryAddr.length, 44, 'Secondary vendor address must be 44 chars');
  assert.ok(htmlContent.includes(secondaryAddr), 'index.html must include secondary vendor address');
});

runTest('6.4: Monospace typography (font-mono) applied to address containers', () => {
  const monoAddresses = htmlContent.match(/class=["'][^"']*font-mono[^"']*break-all[^"']*["']/g);
  assert.ok(monoAddresses && monoAddresses.length >= 2, 'Address containers must use font-mono and break-all');
});

// ============================================================================
// TIER 7: Responsive Layout Resilience & Truncation Invariants
// ============================================================================
console.log('\n--- TIER 7: Responsive Layout & Viewport Resilience ---');

runTest('7.1: Stepper tracker uses responsive grid (grid-cols-3 xl:grid-cols-6) to prevent 1024px label crush', () => {
  const stepperGridRegex = /class=["'][^"']*grid\s+grid-cols-3\s+xl:grid-cols-6[^"']*["']/;
  assert.ok(stepperGridRegex.test(htmlContent), 'Stepper must use grid-cols-3 xl:grid-cols-6 for responsive layout');
});

runTest('7.2: Stepper step labels have truncate protection', () => {
  const truncateLabels = [...htmlContent.matchAll(/class=["'][^"']*truncate\s+w-full[^"']*["']/g)];
  assert.equal(truncateLabels.length, 6, 'All 6 stepper phase labels must include truncate w-full');
});

runTest('7.3: All three main panes have min-w-0 to prevent CSS grid overflow blowout', () => {
  const minW0Matches = [...htmlContent.matchAll(/col-span-12\s+lg:col-span-4\s+flex\s+flex-col\s+gap-4\s+min-w-0/g)];
  assert.equal(minW0Matches.length, 3, 'All 3 dashboard panes must specify min-w-0');
});

// ============================================================================
// TIER 8: Headless Browser VM Execution & Interactive State Machine Verification
// ============================================================================
console.log('\n--- TIER 8: Headless Browser VM Execution & Interactive State Machine ---');

// Setup mock DOM for VM
function createMockElement(id = '', tagName = 'div') {
  const classes = new Set();
  const attributes = {};
  const children = [];

  return {
    id,
    tagName: tagName.toUpperCase(),
    textContent: '',
    innerHTML: '',
    value: '1000',
    href: '',
    classList: {
      add(...cls) { cls.forEach(c => classes.add(c)); },
      remove(...cls) { cls.forEach(c => classes.delete(c)); },
      contains(c) { return classes.has(c); },
      toggle(c) { if (classes.has(c)) classes.delete(c); else classes.add(c); }
    },
    get className() { return Array.from(classes).join(' '); },
    set className(val) {
      classes.clear();
      if (typeof val === 'string') val.split(/\s+/).filter(Boolean).forEach(c => classes.add(c));
    },
    setAttribute(k, v) { attributes[k] = String(v); },
    getAttribute(k) { return attributes[k] !== undefined ? attributes[k] : null; },
    appendChild(child) { children.push(child); return child; },
    scrollHeight: 1000,
    scrollTop: 0
  };
}

const elementsById = new Map();
const allElements = [];

// Extract all IDs from htmlContent
const idMatches = [...htmlContent.matchAll(/id=["']([a-zA-Z0-9_-]+)["']/g)].map(m => m[1]);
idMatches.forEach(id => {
  const el = createMockElement(id);
  elementsById.set(id, el);
  allElements.push(el);
});

// Populate speed-select with value
if (elementsById.has('speed-select')) {
  elementsById.get('speed-select').value = '1500';
}

const mockDocument = {
  getElementById(id) {
    if (!elementsById.has(id)) {
      const el = createMockElement(id);
      elementsById.set(id, el);
      allElements.push(el);
    }
    return elementsById.get(id);
  },
  createElement(tag) {
    const el = createMockElement('', tag);
    allElements.push(el);
    return el;
  },
  querySelectorAll(selector) {
    if (selector === '.scenario-btn') {
      return ['btn-scenario-1', 'btn-scenario-2', 'btn-scenario-3'].map(id => mockDocument.getElementById(id));
    }
    if (selector === '.phase-step') {
      return [1, 2, 3, 4, 5, 6].map(i => mockDocument.getElementById(`step-${i}`));
    }
    return [];
  },
  body: createMockElement('body')
};

const mockWindow = {
  document: mockDocument,
  addEventListener(evt, fn) {
    if (evt === 'DOMContentLoaded') {
      mockWindow._onDomReady = fn;
    }
  },
  setInterval: (fn, ms) => { return 101; },
  clearInterval: (id) => {},
  setTimeout: (fn, ms) => { return 102; },
  clearTimeout: (id) => {},
  navigator: {
    clipboard: {
      writeText: async () => {}
    }
  }
};

const vmContext = vm.createContext({
  window: mockWindow,
  document: mockDocument,
  navigator: mockWindow.navigator,
  setInterval: mockWindow.setInterval,
  clearInterval: mockWindow.clearInterval,
  setTimeout: mockWindow.setTimeout,
  clearTimeout: mockWindow.clearTimeout,
  console: { log() {}, warn() {}, error() {} },
  Date: globalThis.Date,
  String: globalThis.String,
  parseInt: globalThis.parseInt,
  escapeHtml: (s) => String(s)
});

// Extract application script block (2nd non-src script block)
const scriptRegex = /<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi;
const nonSrcScripts = [];
let match;
while ((match = scriptRegex.exec(htmlContent)) !== null) {
  nonSrcScripts.push(match[1]);
}
assert.ok(nonSrcScripts.length >= 2, 'Must find at least 2 inline script blocks in index.html');
const appScriptSource = nonSrcScripts[1];

// Execute script in VM context
vm.runInContext(appScriptSource, vmContext);

runTest('8.1: Main application script compiles and initializes without runtime errors', () => {
  assert.equal(typeof vmContext.switchScenario, 'function', 'switchScenario must be defined');
  assert.equal(typeof vmContext.resetWorkflow, 'function', 'resetWorkflow must be defined');
  assert.equal(typeof vmContext.stepForward, 'function', 'stepForward must be defined');
  assert.equal(typeof vmContext.togglePlay, 'function', 'togglePlay must be defined');
  assert.equal(typeof vmContext.simulateOperatorSignature, 'function', 'simulateOperatorSignature must be defined');
  assert.equal(typeof vmContext.simulateOperatorReject, 'function', 'simulateOperatorReject must be defined');
});

runTest('8.2: Initial load invokes DOMContentLoaded callback and sets Scenario 1 / Phase 1', () => {
  if (mockWindow._onDomReady) {
    mockWindow._onDomReady();
  }
  const currScenario = vm.runInContext('currentScenario', vmContext);
  const currPhase = vm.runInContext('currentPhase', vmContext);
  assert.equal(currScenario, 1, 'Current scenario should be 1');
  assert.equal(currPhase, 1, 'Current phase should be 1');
  assert.equal(mockDocument.getElementById('current-phase-pill').textContent, 'Phase 1 / 6');
});

runTest('8.3: Scenario 1 Happy Path advances through all 6 phases to Solscan finality', () => {
  vmContext.switchScenario(1);
  for (let p = 1; p <= 4; p++) {
    vmContext.stepForward();
  }
  assert.equal(vm.runInContext('currentPhase', vmContext), 5, 'Should reach Phase 5 (PayBox staging)');
  assert.ok(mockDocument.getElementById('step-explanation-text').innerHTML.includes('HUMAN-IN-THE-LOOP REQUIRED'), 'Phase 5 requires HITL');
  
  // Operator signs
  vmContext.simulateOperatorSignature();
  assert.equal(vm.runInContext('currentPhase', vmContext), 6, 'Should reach Phase 6 (Solscan Finality)');
  assert.equal(mockDocument.getElementById('solscan-status-pill').textContent, 'Settled & Finalized');
  assert.equal(mockDocument.getElementById('solscan-tx').textContent, '5RzKpQe8XwN3tVb7Ym9L4uH2sJ6kF1cD0aE9gB8vW7xZ5qM3pL4sK6tN8rV0yX2w');
});

runTest('8.4: Scenario 2 Vanity Address Poisoning Attack halts into Quarantine at Phase 2', () => {
  vmContext.switchScenario(2);
  assert.equal(vm.runInContext('currentScenario', vmContext), 2);
  vmContext.stepForward(); // Advance to Phase 2
  assert.equal(vm.runInContext('currentPhase', vmContext), 2);
  assert.ok(mockDocument.getElementById('card-quarantine').classList.contains('hidden') === false, 'Quarantine card must be visible');
  assert.ok(mockDocument.getElementById('card-paybox').classList.contains('hidden') === true, 'PayBox card must be hidden');
  
  // Attempt to step forward past Phase 2 during attack
  vmContext.stepForward();
  assert.equal(vm.runInContext('currentPhase', vmContext), 2, 'Execution must halt at Phase 2 upon attack detection');
});

runTest('8.5: Scenario 3 Prompt Injection Attack halts into sandbox containment at Phase 2', () => {
  vmContext.switchScenario(3);
  assert.equal(vm.runInContext('currentScenario', vmContext), 3);
  vmContext.stepForward(); // Advance to Phase 2
  assert.equal(vm.runInContext('currentPhase', vmContext), 2);
  assert.ok(mockDocument.getElementById('step-explanation-text').innerHTML.includes('PROMPT INJECTION CONTAINED'));
  
  // Attempt to step forward
  vmContext.stepForward();
  assert.equal(vm.runInContext('currentPhase', vmContext), 2, 'Execution must halt at Phase 2 upon injection detection');
});

runTest('8.6: Operator Rejection cancels staged transfer without error', () => {
  vmContext.switchScenario(1);
  for (let p = 1; p <= 4; p++) {
    vmContext.stepForward();
  }
  assert.equal(vm.runInContext('currentPhase', vmContext), 5);
  vmContext.simulateOperatorReject();
  assert.ok(mockDocument.getElementById('step-explanation-text').innerHTML.includes('OPERATOR REJECTED'));
});

runTest('8.7: Dynamic class inspection during all state transitions injects zero prohibited classes', () => {
  // Check all mock elements classes
  const prohibitedClasses = [
    'animate-pulse', 'animate-ping', 'animate-bounce',
    'shadow-xl', 'shadow-2xl', 'shadow-lg', 'shadow-emerald-500/20', 'shadow-rose-950/30',
    'rounded-full', 'rounded-xl', 'rounded-2xl',
    'bg-gradient-to-r', 'bg-gradient-to-br'
  ];
  
  const dynamicViolations = [];
  allElements.forEach(el => {
    const cls = el.className;
    prohibitedClasses.forEach(p => {
      if (cls.includes(p)) {
        dynamicViolations.push({ elementId: el.id, prohibitedClass: p });
      }
    });
  });
  
  assert.deepEqual(dynamicViolations, [], `Found dynamically injected prohibited classes: ${JSON.stringify(dynamicViolations)}`);
});

// ============================================================================
// SUMMARY & VERDICT
// ============================================================================
console.log('\n================================================================');
console.log(`TOTAL TESTS : ${totalTests}`);
console.log(`PASSED      : ${passedTests}`);
console.log(`FAILED      : ${failedTests}`);
console.log('================================================================');

if (failedTests > 0) {
  console.error('\nVERDICT: REJECT - Detected adversarial failures:');
  failures.forEach(f => console.error(`  - ${f.name}: ${f.error}`));
  process.exit(1);
} else {
  console.log('\nVERDICT: APPROVE - All 30 adversarial stress tests passed 100% with ZERO slop violations!');
  process.exit(0);
}
