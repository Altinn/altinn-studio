import { render, screen } from '@testing-library/react';
import type {
  WorkflowStatus,
  WorkflowStepStatus,
} from 'admin/features/apps/types/workflows/WorkflowStatus';
import { PROCESS_ELEMENT_LABEL } from 'admin/features/apps/utils/workflowPhases';
import { WorkflowStepStrip } from './WorkflowStepStrip';

const stepOf = (
  operationId: string,
  processingOrder: number,
  element?: string,
): WorkflowStepStatus => ({
  databaseId: `step-${operationId}`,
  operationId,
  processingOrder,
  status: 'Completed',
  command: { type: 'app' },
  retryCount: 0,
  ...(element ? { labels: { [PROCESS_ELEMENT_LABEL]: element } } : {}),
});

const workflowOf = (operationId: string, steps: WorkflowStepStatus[]): WorkflowStatus => ({
  databaseId: 'wf',
  operationId,
  idempotencyKey: 'key',
  namespace: 'ttd/app',
  createdAt: '2026-10-02T10:00:00Z',
  overallStatus: 'Completed',
  steps,
});

describe('WorkflowStepStrip', () => {
  it("names the element each dot's step runs for, from the step's own label", () => {
    renderWorkflowStepStrip(
      workflowOf('Process next: Form -> Verify', [
        stepOf('EndTask', 0, 'Form'),
        stepOf('SomeNewTaskEndingCommand', 1, 'Form'),
        stepOf('MutateProcessState', 2),
        stepOf('StartTask', 3, 'Verify'),
      ]),
    );

    expect(screen.getByTitle('SomeNewTaskEndingCommand · Completed · Form')).toBeInTheDocument();
    expect(screen.getByTitle('MutateProcessState · Completed')).toBeInTheDocument();
    expect(screen.getByTitle('StartTask · Completed · Verify')).toBeInTheDocument();
  });

  it('names no element for an unlabeled step of a transition it cannot read', () => {
    renderWorkflowStepStrip(workflowOf('Legacy transition', [stepOf('EndTask', 0)]));

    expect(screen.getByTitle('EndTask · Completed')).toBeInTheDocument();
  });
});

const renderWorkflowStepStrip = (workflow: WorkflowStatus) =>
  render(<WorkflowStepStrip workflow={workflow} />);
