import { render, screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { PersistentItemStatus } from 'admin/features/apps/types/workflows/WorkflowStatus';
import { WorkflowStatusIcon, WorkflowStatusMark } from './WorkflowStatusTag';

describe('WorkflowStatusIcon', () => {
  it('is named by the status it stands for', () => {
    renderWorkflowStatusIcon('Held');
    expect(
      screen.getByRole('img', { name: textMock('admin.workflows.status.held') }),
    ).toBeInTheDocument();
  });

  it('spins while the engine is working on it', () => {
    renderWorkflowStatusIcon('Processing');
    expect(screen.getByTestId('studio-spinner-test-id')).toHaveAccessibleName(
      textMock('admin.workflows.status.processing'),
    );
  });

  it('still names a status this build does not know', () => {
    renderWorkflowStatusIcon('Paused' as PersistentItemStatus);
    expect(screen.getByRole('img', { name: 'Paused' })).toBeInTheDocument();
  });
});

describe('WorkflowStatusMark', () => {
  it('is a check mark for a completed status', () => {
    renderWorkflowStatusMark('Completed');
    expect(
      screen.getByRole('img', { name: textMock('admin.workflows.status.completed') }),
    ).toBeInTheDocument();
    // Named by its title inside the icon, not by any text beside it.
    expect(
      screen.queryByText(textMock('admin.workflows.status.completed'), {
        ignore: 'script, style, title',
      }),
    ).not.toBeInTheDocument();
  });

  it('spells out any other status', () => {
    renderWorkflowStatusMark('Failed');
    expect(screen.getByText(textMock('admin.workflows.status.failed'))).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});

const renderWorkflowStatusIcon = (status: PersistentItemStatus) =>
  render(<WorkflowStatusIcon status={status} />);

const renderWorkflowStatusMark = (status: PersistentItemStatus) =>
  render(<WorkflowStatusMark status={status} />);
