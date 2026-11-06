import type { BackendValidationIssue } from 'src/features/validation';
import type { IProcessWorkflowFailure, ProblemDetails } from 'src/types/shared';

export type ProcessNextProblemDetails = ProblemDetails & {
  validationIssues?: BackendValidationIssue[] | null;
  processNextState?: 'retrying' | 'resumeRequired' | 'instanceChanged' | 'concurrentTransition';
  workflowFailure?: IProcessWorkflowFailure;
};
