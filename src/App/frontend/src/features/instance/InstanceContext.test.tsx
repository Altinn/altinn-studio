import React from 'react';

import { act, screen } from '@testing-library/react';

import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { InstanceProvider } from 'src/features/instance/InstanceContext';
import { InstanceRouter, renderWithDefaultProviders } from 'src/test/renderWithProviders';
import type { IInstanceWithProcess } from 'src/core/api-client/instance.api';

// The error page (UnknownError) calls the real axios isAxiosError on the thrown error.
jest.unmock('axios');

// The provider polls the instance every 2-3s (jittered) while a workflow transition is processing.
// Each failed refetch cycle internally retries 3 times with exponential backoff (1s/2s/4s), so a
// full failed cycle takes at most ~10s including the preceding poll tick. Advancing 12s per step
// therefore completes exactly one cycle (the next cycle needs ~9-10s more and cannot finish).
const ONE_POLL_CYCLE_MS = 12_000;

function getProcessingInstance(): IInstanceWithProcess {
  const instance = getInstanceWithProcessMock();
  instance.process.workflow = { status: 'processing', targetTask: 'Task_2' };
  return instance;
}

async function advanceOnePollCycle() {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ONE_POLL_CYCLE_MS);
  });
}

async function renderInstanceProvider(getInstance: () => Promise<IInstanceWithProcess>) {
  return renderWithDefaultProviders({
    renderer: () => (
      <InstanceProvider>
        <div data-testid='instance-probe'>Instance loaded</div>
      </InstanceProvider>
    ),
    router: ({ children }) => <InstanceRouter>{children}</InstanceRouter>,
    waitUntilLoaded: false,
    apis: {
      instanceApi: {
        getInstance,
      },
    },
  });
}

describe('InstanceProvider poll-failure tolerance', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // setupTests makes every window.log* throw to fail tests on unexpected logging; swallowed
    // poll failures log a warning by design, so stub it here (and assert on it where relevant).
    jest.spyOn(window, 'logWarnOnce').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('shows the error page immediately when the initial load fails', async () => {
    await renderInstanceProvider(async () => {
      throw new Error('initial load failed');
    });

    // Let the initial fetch exhaust its internal retries (~7s of backoff). The extra cycles just
    // advance time past provider startup; the query settles into error along the way.
    await advanceOnePollCycle();
    await advanceOnePollCycle();

    // No cached data to fall back on: the full error page is the only sensible render.
    expect(await screen.findByText(/det har skjedd en ukjent feil/i)).toBeInTheDocument();
    expect(screen.queryByTestId('instance-probe')).not.toBeInTheDocument();
  });

  it('keeps the last known instance UI through transient poll failures, then escalates', async () => {
    let failing = false;
    await renderInstanceProvider(async () => {
      if (failing) {
        throw new Error('poll failed');
      }
      return getProcessingInstance();
    });

    expect(await screen.findByTestId('instance-probe')).toBeInTheDocument();

    failing = true;

    // Cycles 1 and 2: swallowed - the user keeps the last known (processing) view while the
    // poll loop retries underneath. No scary error page for a blip or a pod restart.
    await advanceOnePollCycle();
    expect(screen.getByTestId('instance-probe')).toBeInTheDocument();
    expect(screen.queryByText(/det har skjedd en ukjent feil/i)).not.toBeInTheDocument();

    await advanceOnePollCycle();
    expect(screen.getByTestId('instance-probe')).toBeInTheDocument();
    expect(screen.queryByText(/det har skjedd en ukjent feil/i)).not.toBeInTheDocument();

    // Cycle 3: sustained failure - now the outage is real and the error page is honest.
    await advanceOnePollCycle();
    expect(screen.getByText(/det har skjedd en ukjent feil/i)).toBeInTheDocument();
    expect(screen.queryByTestId('instance-probe')).not.toBeInTheDocument();
  });

  it('resets the failure count on a successful poll, so intermittent blips never escalate', async () => {
    let failing = false;
    await renderInstanceProvider(async () => {
      if (failing) {
        throw new Error('poll failed');
      }
      return getProcessingInstance();
    });

    expect(await screen.findByTestId('instance-probe')).toBeInTheDocument();

    // Two failed cycles - one short of the escalation threshold...
    failing = true;
    await advanceOnePollCycle();
    await advanceOnePollCycle();
    expect(screen.getByTestId('instance-probe')).toBeInTheDocument();

    // ...then a successful poll resets the count...
    failing = false;
    await advanceOnePollCycle();
    expect(screen.getByTestId('instance-probe')).toBeInTheDocument();
    expect(screen.queryByText(/det har skjedd en ukjent feil/i)).not.toBeInTheDocument();

    // ...so two MORE failed cycles still don't escalate (a stale count would have: 2 + 2 >= 3).
    failing = true;
    await advanceOnePollCycle();
    await advanceOnePollCycle();
    expect(screen.getByTestId('instance-probe')).toBeInTheDocument();
    expect(screen.queryByText(/det har skjedd en ukjent feil/i)).not.toBeInTheDocument();
  });

  it('polls slowly while the workflow is failed, and stops once it settles', async () => {
    // The failed state must poll (at a slow ~10-12s jittered cadence): the failed screen offers no
    // Retry, so an ops-driven resume converging through this poll is the user's only recovery path.
    let fetchCount = 0;
    let resumedByOps = false;
    await renderInstanceProvider(async () => {
      fetchCount++;
      const instance = getInstanceWithProcessMock();
      instance.process.workflow = resumedByOps ? undefined : { status: 'failed', failure: { kind: 'stepFailed' } };
      return instance;
    });

    expect(await screen.findByTestId('instance-probe')).toBeInTheDocument();
    const fetchesAfterLoad = fetchCount;

    // One failed-state poll window (max 12s jitter) always contains at least one tick.
    await act(async () => {
      await jest.advanceTimersByTimeAsync(13_000);
    });
    expect(fetchCount).toBeGreaterThan(fetchesAfterLoad);

    // Ops resumes the workflow and it settles: the next poll picks up the settled
    // instance (no annotation -> idle)...
    resumedByOps = true;
    await act(async () => {
      await jest.advanceTimersByTimeAsync(13_000);
    });
    expect(screen.getByTestId('instance-probe')).toBeInTheDocument();
    const fetchesAfterSettle = fetchCount;

    // ...and polling stops: idle with no pending scans means no refetch interval at all.
    await act(async () => {
      await jest.advanceTimersByTimeAsync(30_000);
    });
    expect(fetchCount).toBe(fetchesAfterSettle);
  });
});
