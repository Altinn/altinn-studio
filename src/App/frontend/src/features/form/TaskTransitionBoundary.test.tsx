import React from 'react';

import { screen } from '@testing-library/react';

import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { TaskTransitionBoundary } from 'src/features/form/TaskTransitionBoundary';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';

describe('TaskTransitionBoundary', () => {
  it('renders the loader outside PDF mode when the URL task differs from process.currentTask', async () => {
    const instance = getInstanceWithProcessMock();

    await renderWithInstanceAndLayout({
      renderer: () => (
        <TaskTransitionBoundary>
          <div data-testid='task-content'>Task content</div>
        </TaskTransitionBoundary>
      ),
      taskId: 'Task_Other',
      waitUntilLoaded: false,
      apis: {
        instanceApi: {
          getInstance: async () => instance,
        },
      },
    });

    expect(screen.queryByTestId('task-content')).not.toBeInTheDocument();
  });

  it('renders children in PDF mode even when the URL task differs from process.currentTask', async () => {
    // In PDF mode the URL task is chosen by the PDF generator/preview (a later PDF service task
    // preview, or a subform PDF rendered under the parent data task) and may legitimately differ
    // from process.currentTask - the transition loader must not suppress #readyForPrint.
    const instance = getInstanceWithProcessMock();

    await renderWithInstanceAndLayout({
      renderer: () => (
        <TaskTransitionBoundary>
          <div data-testid='task-content'>Task content</div>
        </TaskTransitionBoundary>
      ),
      taskId: 'Task_Other',
      query: 'pdf=1',
      apis: {
        instanceApi: {
          getInstance: async () => instance,
        },
      },
    });

    expect(await screen.findByTestId('task-content')).toBeInTheDocument();
  });
});
