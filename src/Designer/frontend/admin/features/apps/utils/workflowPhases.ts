import type {
  WorkflowStatus,
  WorkflowStepStatus,
} from 'admin/features/apps/types/workflows/WorkflowStatus';
import { orderedSteps } from './workflowTriage';

/**
 * The part of a process transition a step belongs to: ending the task the process leaves, starting
 * the task it enters, or ending the process. The step names mirror the app runtime's command set,
 * the same mapping the engine's own dashboard brackets its pipelines with. Every other step — the
 * state change itself, a service task's work, enqueueing auxiliary workflows — belongs to no phase.
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
 * `Process next: Form -> Verify`, with an auxiliary workflow's `· Command` suffix dropped. A
 * workflow named any other way is not a transition.
 */
export function parseTransition(workflow: WorkflowStatus): Transition | undefined {
  const match = /^Process next(?: side-effects)?:\s*(.*?)\s*(?:->|→)\s*(.*?)(?:\s+·\s+.*)?$/.exec(
    workflow.operationId,
  );
  return match ? { from: match[1], to: match[2] } : undefined;
}

/**
 * The step label the app runtime puts on every step of a task's lifecycle: the id of the BPMN
 * element the step runs for — the task being left, the task being entered, or the end event the
 * process ends at. The steps of the transition itself, a service task's work and the auxiliary
 * workflows carry none: they belong to no element.
 */
export const PROCESS_ELEMENT_LABEL = 'processNextElement';

export type StepGroup = {
  /**
   * What the run of steps has in common; absent for steps that belong to no element. A label and a
   * guess from the command name never share a key, so the two never merge into one run.
   */
  key?: string;
  /** The BPMN element the run belongs to, by its id in the process, when it is known. */
  elementId?: string;
  steps: WorkflowStepStatus[];
};

/**
 * Which element a step runs for. The app runtime's own label wins: it names the element outright,
 * whatever the command is called. Without one — a workflow enqueued before the label existed, or
 * by an app on older app libraries — the command name says which end of the transition the step
 * sits at, and the transition names the element there.
 */
function groupOf(
  step: WorkflowStepStatus,
  transition: Transition | undefined,
): Omit<StepGroup, 'steps'> {
  const element = step.labels?.[PROCESS_ELEMENT_LABEL];
  if (element) {
    return { key: `element:${element}`, elementId: element };
  }
  const phase = stepPhase(step);
  return phase ? { key: `phase:${phase}`, elementId: phaseElementId(phase, transition) } : {};
}

/**
 * The steps in order, cut into runs of the same element: the task a run of a transition ends or
 * starts, or the end event. Steps of no element make runs of their own.
 */
export function groupStepsByElement(
  steps: WorkflowStepStatus[],
  transition: Transition | undefined,
): StepGroup[] {
  const groups: StepGroup[] = [];
  for (const step of steps) {
    const group = groupOf(step, transition);
    const current = groups.at(-1);
    if (current && current.key === group.key) {
      current.steps.push(step);
    } else {
      groups.push({ ...group, steps: [step] });
    }
  }
  return groups;
}

/** A step with the workflow it belongs to, for a row that shows several workflows as one. */
export type OwnedStep = { step: WorkflowStepStatus; workflow: WorkflowStatus };

export type OwnedStepGroup = Omit<StepGroup, 'steps'> & { steps: OwnedStep[] };

/**
 * The steps of workflows that ran one after another, cut into runs of the same element as
 * `groupStepsByElement` cuts one workflow's. A run that carries on into the next workflow stays one
 * run: a service task's stages belong to no element, wherever they ran.
 */
export function groupStepsOfWorkflows(workflows: WorkflowStatus[]): OwnedStepGroup[] {
  const groups: OwnedStepGroup[] = [];
  for (const workflow of workflows) {
    for (const group of groupStepsByElement(orderedSteps(workflow), parseTransition(workflow))) {
      const steps = group.steps.map((step) => ({ step, workflow }));
      const current = groups.at(-1);
      if (current && current.key === group.key) {
        current.steps.push(...steps);
      } else {
        groups.push({ key: group.key, elementId: group.elementId, steps });
      }
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
