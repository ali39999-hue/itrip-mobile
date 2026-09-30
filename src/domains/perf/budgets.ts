/**
 * Performance Budgets (R9 — Performance + Accessibility).
 *
 * Build-verifiable budgets enforced by the perf gate test. Device
 * profiling (cold start, scroll FPS on low-end hardware) remains in the
 * R9 device-lab checklist; these budgets guard the artifact surface.
 */

export const PERF_BUDGETS = {
  /** Android JS bundle ceiling (Hermes-ready, exported by build:bundle). */
  androidBundleBytes: 4.2 * 1024 * 1024,
  /** Test suite wall-clock ceiling (regression canary for heavy imports). */
  testSuiteSeconds: 5,
  /** List rendering: max items without virtualization (FlatList required above). */
  unvirtualizedListMaxItems: 30,
  /** Max inline SVG paths in a single component (hint to extract to asset). */
  inlineSvgPathBudget: 12,
} as const;

export interface BundleBudgetResult {
  ok: boolean;
  actualBytes: number;
  budgetBytes: number;
  headroomPct: number;
}

export function checkBundleBudget(actualBytes: number): BundleBudgetResult {
  const budgetBytes = PERF_BUDGETS.androidBundleBytes;
  return {
    ok: actualBytes <= budgetBytes,
    actualBytes,
    budgetBytes,
    headroomPct: Math.round(((budgetBytes - actualBytes) / budgetBytes) * 100),
  };
}
