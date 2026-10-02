import type {
  WorkflowStatus,
  WorkflowStepStatus,
} from 'admin/features/apps/types/workflows/WorkflowStatus';

/**
 * The part of a process transition a step belongs to: ending the task the process leaves, starting
 * the task it enters, or ending the process. The step names mirror the app runtime's command set,
 * the same mapping the engine's own dashboard brackets its pipelines with. Every other step — the
 * state change itself, a service task's work, enqueueing side effects — belongs to no phase.
 */
export type StepPhase = 'end' | 'start' | 'processEnd';

const PHASE_BY_STEP: Readonly<Record<string, StepPhase>> = {
  EndTask: 'end',
  CommonTaskFinalization: 'end',
  OnTaskEndingHook: 'end',
  LockTaskData: 'end',
  AbandonTask: 'end',
  OnTaskAbandonHook: 'end',
  UnlockTaskData: 'start',
  CleanupGeneratedFromTask: 'start',
  StartTask: 'start',
  OnTaskStartingHook: 'start',
  CommonTaskInitialization: 'start',
  OnProcessEndingHook: 'processEnd',
  EndProcessLegacyHook: 'processEnd',
};

export function stepPhase(step: WorkflowStepStatus): StepPhase | undefined {
  return PHASE_BY_STEP[step.operationId];
}

export type Transition = { from: string; to: string };

/**
 * The tasks a process transition moves between, read from the name the app runtime gives it:
 * `Process next: Form -> Verify`, with the side effects' `· Command` suffix dropped. A workflow
 * named any other way is not a transition.
 */
export function parseTransition(workflow: WorkflowStatus): Transition | undefined {
  const match = /^Process next(?: side-effects)?:\s*(.*?)\s*(?:->|→)\s*(.*?)(?:\s+·\s+.*)?$/.exec(
    workflow.operationId,
  );
  return match ? { from: match[1], to: match[2] } : undefined;
}

export type StepGroup = {
  /** The phase the run of steps belongs to, if any. */
  phase?: StepPhase;
  steps: WorkflowStepStatus[];
};

/** The steps in order, cut into runs of the same phase. Steps of no phase make runs of their own. */
export function groupStepsByPhase(steps: WorkflowStepStatus[]): StepGroup[] {
  const groups: StepGroup[] = [];
  for (const step of steps) {
    const phase = stepPhase(step);
    const current = groups.at(-1);
    if (current && current.phase === phase) {
      current.steps.push(step);
    } else {
      groups.push({ phase, steps: [step] });
    }
  }
  return groups;
}

/**
 * The process element a phase is about, by its id in the process: the task the transition leaves
 * for the steps that end it, and for the rest where the transition goes — the task it starts, or
 * the end event the process ends at. Nothing when the transition does not name it.
 */
export function phaseElementId(
  phase: StepPhase,
  transition: Transition | undefined,
): string | undefined {
  return (phase === 'end' ? transition?.from : transition?.to) || undefined;
}
