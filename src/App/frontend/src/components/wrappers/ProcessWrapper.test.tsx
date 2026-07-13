import React from 'react';

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { ProcessWrapper } from 'src/components/wrappers/ProcessWrapper';
import { doProcessResume } from 'src/queries/queries';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { IInstanceWithProcess } from 'src/core/api-client/instance.api';
import type { IProcessWorkflow } from 'src/types/shared';

jest.mock('src/queries/queries', () => ({
  ...jest.requireActual<typeof import('src/queries/queries')>('src/queries/queries'),
  doProcessResume: jest.fn(),
}));

function getInstanceWithWorkflow(workflow?: IProcessWorkflow): IInstanceWithProcess {
  const instance = getInstanceWithProcessMock();
  instance.process.workflow = workflow;
  return instance;
}

async function renderProcessWrapper(workflow?: IProcessWorkflow, waitUntilLoaded = true, query?: string) {
  return renderWithInstanceAndLayout({
    renderer: () => (
      <ProcessWrapper>
        <div data-testid='task-content'>Task content</div>
      </ProcessWrapper>
    ),
    waitUntilLoaded,
    query,
    apis: {
      instanceApi: {
        getInstance: async () => getInstanceWithWorkflow(workflow),
      },
    },
  });
}

describe('ProcessWrapper workflow state machine', () => {
  beforeEach(() => {
    jest.mocked(doProcessResume).mockClear();
  });

  it('idle renders the current task children', async () => {
    await renderProcessWrapper({ status: 'idle' });

    expect(screen.getByTestId('task-content')).toBeInTheDocument();
    expect(screen.queryByText(/går videre til/i)).not.toBeInTheDocument();
  });

  it('renders children when no workflow annotation is present', async () => {
    await renderProcessWrapper(undefined);

    expect(screen.getByTestId('task-content')).toBeInTheDocument();
  });

  it('processing shows the advancing state and suppresses the task', async () => {
    // waitUntilLoaded is disabled because the blocking state intentionally renders a <Loader />
    // targetTask is set but deliberately NOT rendered in the message (task ids aren't user-facing).
    await renderProcessWrapper({ status: 'processing', targetTask: 'Task_2' }, false);

    expect(await screen.findByText(/går videre til neste steg/i)).toBeInTheDocument();
    expect(screen.queryByText(/task_2/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('task-content')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /send inn/i })).not.toBeInTheDocument();
  });

  it('processing does NOT replace the task in PDF mode', async () => {
    // The PDF service task renders the page while the transition is processing (by definition), so
    // the live-status replacement must not apply - it would swallow #readyForPrint and deadlock
    // the PDF generation the render is part of.
    await renderProcessWrapper({ status: 'processing', targetTask: 'Task_2' }, true, 'pdf=1');

    expect(screen.getByTestId('task-content')).toBeInTheDocument();
    expect(screen.queryByText(/går videre til neste steg/i)).not.toBeInTheDocument();
  });

  it('failed shows the generic localized message, suppresses the task, and Retry calls resume', async () => {
    const user = userEvent.setup();
    jest.mocked(doProcessResume).mockImplementation(async () => new Promise(() => {}));

    await renderProcessWrapper({
      status: 'failed',
      failure: { kind: 'StepFailed' },
    });

    // The citizen sees the localized generic message (the backend deliberately never ships raw
    // failure detail to the client - only the coarse `kind` classification).
    expect(screen.getByText(/noe gikk galt da skjemaet skulle behandles videre/i)).toBeInTheDocument();
    expect(screen.queryByTestId('task-content')).not.toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /prøv igjen/i });
    expect(retryButton).toBeInTheDocument();

    await user.click(retryButton);

    await waitFor(() => {
      expect(doProcessResume).toHaveBeenCalledTimes(1);
    });
  });
});
