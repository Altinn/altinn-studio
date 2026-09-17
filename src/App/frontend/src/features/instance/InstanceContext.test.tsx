import React from 'react';

import { act, screen } from '@testing-library/react';

import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { InstanceProvider, useInstanceDataQuery } from 'src/features/instance/InstanceContext';
import { InstanceRouter, renderWithDefaultProviders } from 'src/test/renderWithProviders';
import type { IInstanceWithProcess } from 'src/core/api-client/instance.api';

// The error page (UnknownError) calls the real axios isAxiosError on the thrown error.
vi.unmock('axios');

function InstanceProbe() {
  const { dataUpdatedAt, errorUpdateCount } = useInstanceDataQuery();
  return (
    <div
      data-testid='instance-probe'
      data-poll-result={`${dataUpdatedAt}:${errorUpdateCount}`}
    >
      Instance loaded
    </div>
  );
}

function getProcessingInstance(): IInstanceWithProcess {
  const instance = getInstanceWithProcessMock();
  instance.process.workflow = { status: 'processing', targetTask: 'Task_2' };
  return instance;
}

async function advanceOnePollCycle() {
  const previousResult = screen.getByTestId('instance-probe').getAttribute('data-poll-result');
  // Wait for a completed refetch rather than assuming a fixed polling or retry cadence.
  for (let elapsed = 0; elapsed < 60_000; elapsed += 250) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    const probe = screen.queryByTestId('instance-probe');
    if (!probe || probe.getAttribute('data-poll-result') !== previousResult) {
      return;
    }
  }
  throw new Error('Instance poll did not settle within sixty seconds');
}

async function renderInstanceProvider(getInstance: () => Promise<IInstanceWithProcess>) {
  return renderWithDefaultProviders({
    renderer: () => (
      <InstanceProvider>
        <InstanceProbe />
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
    vi.useFakeTimers();
    // setupTests makes every window.log* throw to fail tests on unexpected logging; swallowed
    // poll failures log a warning by design, so stub it here (and assert on it where relevant).
    vi.spyOn(window, 'logWarnOnce').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows the error page immediately when the initial load fails', async () => {
    await renderInstanceProvider(async () => {
      throw new Error('initial load failed');
    });

    // Let the initial fetch exhaust its internal retries (~7s of backoff).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(24_000);
    });

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

  it('does not poll while the workflow is failed', async () => {
    // A terminal failure requires manual (ops) intervention either way, so the failed state is
    // deliberately static: no poll, no expensive failed-path engine reads from an open tab. After
    // an ops resume, a manual refresh picks up the recovered state.
    let fetchCount = 0;
    await renderInstanceProvider(async () => {
      fetchCount++;
      const instance = getInstanceWithProcessMock();
      instance.process.workflow = { status: 'failed', failure: { kind: 'stepFailed' } };
      return instance;
    });

    expect(await screen.findByTestId('instance-probe')).toBeInTheDocument();
    const fetchesAfterLoad = fetchCount;

    // Well past any active polling interval: no ticks.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(fetchCount).toBe(fetchesAfterLoad);
  });
});
