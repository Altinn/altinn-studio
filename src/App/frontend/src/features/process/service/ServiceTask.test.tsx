import React from 'react';

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { ServiceTask } from 'src/features/process/service/ServiceTask';
import { doProcessNext, doProcessResume } from 'src/queries/queries';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { IInstanceWithProcess } from 'src/core/api-client/instance.api';
import type { IProcessWorkflow } from 'src/types/shared';

jest.mock('src/queries/queries', () => ({
  ...jest.requireActual<typeof import('src/queries/queries')>('src/queries/queries'),
  doProcessNext: jest.fn(),
  doProcessResume: jest.fn(),
}));

function getServiceTaskInstance(workflow?: IProcessWorkflow): IInstanceWithProcess {
  const instance = getInstanceWithProcessMock();
  instance.process.currentTask = {
    ...instance.process.currentTask!,
    elementId: 'Task_Service',
    elementType: 'ServiceTask',
    altinnTaskType: 'scenario',
    userActions: [{ id: 'write', authorized: true, type: 'ProcessAction' }],
  };
  instance.process.workflow = workflow;
  return instance;
}

async function renderServiceTask(workflow?: IProcessWorkflow, after?: IInstanceWithProcess) {
  let mutated = false;
  await renderWithInstanceAndLayout({
    renderer: () => <ServiceTask />,
    taskId: 'Task_Service',
    apis: {
      instanceApi: {
        getInstance: async () => (mutated && after ? after : getServiceTaskInstance(workflow)),
      },
    },
  });
  return {
    markMutated: () => {
      mutated = true;
    },
  };
}

describe('ServiceTask retry button', () => {
  beforeEach(() => {
    jest.mocked(doProcessNext).mockReset();
    jest.mocked(doProcessResume).mockReset();
  });

  it('retries a workflow failure owned by this service task via process/resume, not process/next', async () => {
    // A terminally failed workflow blocks process/next (409/resumeRequired) until it is resumed,
    // so when the failure is owned by the current service task the retry button must go through
    // POST process/resume - the engine re-runs the failed step in place.
    const user = userEvent.setup();
    const settled = getServiceTaskInstance();
    settled.process.currentTask = {
      ...settled.process.currentTask!,
      elementId: 'Task_2',
      elementType: 'Task',
      altinnTaskType: 'data',
    };

    const { markMutated } = await renderServiceTask(
      { status: 'failed', targetTask: 'Task_Service', failure: { kind: 'stepFailed' } },
      settled,
    );
    jest.mocked(doProcessResume).mockImplementation(async () => {
      markMutated();
      return { data: settled.process } as Awaited<ReturnType<typeof doProcessResume>>;
    });

    await user.click(screen.getByRole('button', { name: 'Prøv igjen' }));

    expect(doProcessResume).toHaveBeenCalledTimes(1);
    expect(doProcessNext).not.toHaveBeenCalled();
  });

  it('advances a parked (non-failed) service task via process/next', async () => {
    // Without a terminal failure the task is merely parked; process/next is still the correct way
    // to (re)trigger the advance, exactly like before the resume endpoint existed.
    const user = userEvent.setup();
    const instance = getServiceTaskInstance();
    jest
      .mocked(doProcessNext)
      .mockImplementation(async () => ({ data: instance }) as Awaited<ReturnType<typeof doProcessNext>>);

    await renderServiceTask(undefined);

    await user.click(screen.getByRole('button', { name: 'Prøv igjen' }));

    expect(doProcessNext).toHaveBeenCalledTimes(1);
    expect(doProcessResume).not.toHaveBeenCalled();
  });

  it('a resume that fails again converges on the refetched workflow state instead of toasting', async () => {
    // Because setupTests makes window.logError throw, this also proves the mutation's error path
    // is NOT taken: the workflowFailure body is consumed by the state machine (refetch), the view
    // stays on the recoverable service task screen, and no raw backend detail reaches the citizen.
    const user = userEvent.setup();
    jest.mocked(doProcessResume).mockImplementation(async () => {
      throw Object.assign(new Error('Request failed with status code 500'), {
        response: {
          status: 500,
          data: {
            title: 'Something went wrong while resuming the current task.',
            detail: 'A workflow step failed while performing the process action.',
            workflowFailure: { kind: 'stepFailed', retryAction: 'resumeWorkflow' },
          },
        },
      });
    });

    await renderServiceTask({ status: 'failed', targetTask: 'Task_Service', failure: { kind: 'stepFailed' } });

    await user.click(screen.getByRole('button', { name: 'Prøv igjen' }));

    expect(doProcessResume).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: 'Prøv igjen' })).toBeInTheDocument();
  });
});
