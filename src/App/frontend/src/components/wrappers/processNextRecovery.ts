import type { MutationStatus } from '@tanstack/react-query';

/**
 * How long after a successful process/next we consider being stranded on the previous task a lost
 * navigation (and recover automatically) rather than a deliberate visit to an old task. The window
 * is anchored at the time the mutation *succeeded* (see reportProcessNextSuccess), not when it was
 * submitted - a slow process/next (or slow refetches settling after it) must not age out of
 * recovery before the wrong-task check even runs.
 */
export const ProcessNextNavigationGraceMs = 5000;

let lastSuccessAt: number | undefined;

/**
 * Called from useProcessNext's onSuccess at the moment it dispatches the navigation to the next
 * task. TanStack mutations only expose submittedAt (mutation start), so we record the completion
 * time ourselves to anchor the recovery grace window correctly.
 */
export function reportProcessNextSuccess(now = Date.now()): void {
  lastSuccessAt = now;
}

export function getLastProcessNextSuccessAt(): number | undefined {
  return lastSuccessAt;
}

let lastHistoryNavigationAt: number | undefined;

/**
 * All programmatic navigation in the app goes through react-router's navigate()
 * (history.pushState/replaceState), which never fires popstate. A popstate event therefore means
 * the user deliberately moved through browser history (back/forward), and recovery must not
 * override that choice by navigating them forward again.
 */
window.addEventListener('popstate', () => {
  lastHistoryNavigationAt = Date.now();
});

export function getLastHistoryNavigationAt(): number | undefined {
  return lastHistoryNavigationAt;
}

interface ProcessNextRecoveryParams {
  /** Status of the latest process/next mutation in this session, if any */
  lastMutationStatus: MutationStatus | undefined;
  /** The task that mutation's navigation was (or would have been) headed to */
  targetTask: string | undefined;
  /** When the latest successful process/next dispatched its navigation (reportProcessNextSuccess) */
  successAt: number | undefined;
  /** When the user last navigated through browser history (back/forward), if ever */
  lastUserNavigationAt: number | undefined;
  now: number;
}

/**
 * Decides whether being stranded on a non-current task is a lost process/next navigation that
 * should be finished automatically (returns the task to navigate to) or a deliberate visit to an
 * old task (returns undefined, showing the navigation error instead).
 *
 * Recovery only happens when the last process/next in this session succeeded within the grace
 * window, and the user has not moved through browser history since it succeeded. Residual
 * tradeoff: a programmatic in-app navigation to a previous task inside the window would still be
 * recovered over - no such navigation exists today (task links always target the current task).
 */
export function getProcessNextRecoveryTarget({
  lastMutationStatus,
  targetTask,
  successAt,
  lastUserNavigationAt,
  now,
}: ProcessNextRecoveryParams): string | undefined {
  if (lastMutationStatus !== 'success' || targetTask === undefined || successAt === undefined) {
    return undefined;
  }
  if (now - successAt >= ProcessNextNavigationGraceMs) {
    // Too long ago: being on an old task now is a deliberate visit, not a lost navigation
    return undefined;
  }
  if (lastUserNavigationAt !== undefined && lastUserNavigationAt >= successAt) {
    // The user went back/forward through history after the process advanced - respect it
    return undefined;
  }
  return targetTask;
}
