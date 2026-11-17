import React from 'react';

import { act, render as rtlRender, renderHook, screen } from '@testing-library/react';

import { getInstanceAtServiceTaskMock, getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import {
  useIsWorkflowHavingTrouble,
  WorkflowProcessing,
  WorkflowTroubleBanner,
} from 'src/components/process/WorkflowEngine';
import { fetchFreshInstanceData } from 'src/core/queries/instance';
import { createQueryTestWrapper } from 'src/test/queryTestUtils';
import type { IProcessWorkflow } from 'src/types/shared';

vi.mock('src/core/loading/Loader', () => ({ Loader: ({ overlay }: { overlay?: React.ReactNode }) => overlay }));
vi.mock('src/features/language/Lang', () => ({ Lang: ({ id }: { id: string }) => id }));

let onServiceTaskPage = false;
let queryTest: ReturnType<typeof createQueryTestWrapper>;
beforeEach(() => {
  onServiceTaskPage = false;
  queryTest = createQueryTestWrapper({}, '/instance/123/instance/Task_1');
});
async function setWorkflow(workflow: IProcessWorkflow | undefined) {
  const instance = onServiceTaskPage ? getInstanceAtServiceTaskMock() : getInstanceWithProcessMock();
  instance.process.workflow = workflow;
  queryTest.queries.getInstance.mockResolvedValue(instance);
  await act(async () => {
    await fetchFreshInstanceData(queryTest.queryClient, {
      instanceOwnerPartyId: '123',
      instanceGuid: 'instance',
      instanceApi: queryTest.queries,
    });
    await vi.advanceTimersByTimeAsync(0);
  });
}
function render(ui: React.ReactNode) {
  return rtlRender(ui, { wrapper: queryTest.wrapper });
}

const startedAt = '2026-09-16T12:00:00.000Z';

interface Failing {
  /** Attempts in a row of the current step that have failed. */
  failedAttempts?: number;
  /** How long ago, on the engine clock, the first of them failed. Unknown when left out. */
  failingForMs?: number;
}

/** A processing workflow whose current run has lasted `elapsedMs` on the engine clock. */
function processingFor(elapsedMs: number, { failedAttempts, failingForMs }: Failing = {}) {
  const currentTime = Date.parse(startedAt) + elapsedMs;
  return {
    status: 'processing' as const,
    startedAt,
    currentTime: new Date(currentTime).toISOString(),
    failedAttempts,
    firstFailedAt: failingForMs === undefined ? undefined : new Date(currentTime - failingForMs).toISOString(),
  };
}

it('only counts time in processing status and resets when processing ends', async () => {
  vi.useFakeTimers();
  try {
    await setWorkflow({ status: 'idle' });
    const { rerender } = render(<WorkflowProcessing />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await setWorkflow({ status: 'processing' });
    rerender(<WorkflowProcessing />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });

    await setWorkflow({ status: 'idle' });
    rerender(<WorkflowProcessing />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await setWorkflow({ status: 'processing' });
    rerender(<WorkflowProcessing />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(7_999);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByRole('status')).toHaveTextContent('process_workflow.still_working');

    await setWorkflow({ status: 'idle' });
    rerender(<WorkflowProcessing />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  } finally {
    vi.useRealTimers();
  }
});

describe('engine clock reference', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it.each([-10 * 60_000, 10 * 60_000])('waits only the remaining time with clock skew of %i ms', async (skew) => {
    const startedAt = new Date(Date.now() + skew).toISOString();
    await setWorkflow({
      status: 'processing',
      startedAt,
      currentTime: new Date(Date.parse(startedAt) + 3_000).toISOString(),
    });
    const { rerender } = render(<WorkflowProcessing />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    // A poll updates the engine reference without starting a fresh eight-second wait.
    await setWorkflow({
      status: 'processing',
      startedAt,
      currentTime: new Date(Date.parse(startedAt) + 5_000).toISOString(),
    });
    rerender(<WorkflowProcessing />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_999);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it.each([8_000, 15_000])('shows the notice immediately on reload after %i ms of processing', async (elapsed) => {
    await setWorkflow({
      status: 'processing',
      startedAt: '2026-09-16T12:00:00.000Z',
      currentTime: new Date(Date.parse('2026-09-16T12:00:00.000Z') + elapsed).toISOString(),
    });
    const first = render(<WorkflowProcessing />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    first.unmount();
    render(<WorkflowProcessing />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('resets the notice when a different workflow starts processing', async () => {
    await setWorkflow({
      status: 'processing',
      startedAt: '2026-09-16T12:00:00Z',
      currentTime: '2026-09-16T12:00:15Z',
    });
    const { rerender } = render(<WorkflowProcessing />);
    expect(screen.getByRole('status')).toBeInTheDocument();

    await setWorkflow({
      status: 'processing',
      startedAt: '2026-09-16T12:00:15Z',
      currentTime: '2026-09-16T12:00:15Z',
    });
    rerender(<WorkflowProcessing />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(8_000);
    });
    expect(screen.getByRole('status')).toBeInTheDocument();

    await setWorkflow({ status: 'idle' });
    rerender(<WorkflowProcessing />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it.each([
    { startedAt: '2026-09-16T12:00:00Z' },
    { currentTime: '2026-09-16T12:00:00Z' },
    { startedAt: 'invalid', currentTime: '2026-09-16T12:00:00Z' },
    { startedAt: '2026-09-16T12:00:00Z', currentTime: 'invalid' },
    { startedAt: '2026-09-16T12:00:01Z', currentTime: '2026-09-16T12:00:00Z' },
  ])('falls back to a local wait for missing, invalid or reversed timestamps: %o', async (timestamps) => {
    await setWorkflow({ status: 'processing', ...timestamps });
    const { rerender } = render(<WorkflowProcessing />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });
    rerender(<WorkflowProcessing />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_999);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

describe('failing transition', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('warns about a single failed attempt once the step has kept failing for twenty seconds', async () => {
    await setWorkflow(processingFor(10_000, { failedAttempts: 1, failingForMs: 19_999 }));
    const { rerender } = render(<WorkflowProcessing />);
    expect(screen.getByRole('status')).toHaveTextContent('process_workflow.still_working');

    await setWorkflow(processingFor(10_001, { failedAttempts: 1, failingForMs: 20_000 }));
    rerender(<WorkflowProcessing />);
    expect(screen.getByRole('status')).toHaveTextContent('process_workflow.having_trouble');
  });

  it('warns at once after a second failed attempt, before the still-working notice', async () => {
    await setWorkflow(processingFor(3_000, { failedAttempts: 2, failingForMs: 1_000 }));
    render(<WorkflowProcessing />);
    expect(screen.getByRole('status')).toHaveTextContent('process_workflow.having_trouble');
  });

  it('does not warn at once about a single failed attempt after a long wait', async () => {
    // A task that deferred for hours and then failed one re-check.
    await setWorkflow(processingFor(3 * 60 * 60_000, { failedAttempts: 1, failingForMs: 1_000 }));
    render(<WorkflowProcessing />);
    expect(screen.getByRole('status')).toHaveTextContent('process_workflow.still_working');
  });

  it('returns to the still-working notice once the failing step succeeds', async () => {
    await setWorkflow(processingFor(30_000, { failedAttempts: 3, failingForMs: 10_000 }));
    const { rerender } = render(<WorkflowProcessing />);
    expect(screen.getByRole('status')).toHaveTextContent('process_workflow.having_trouble');

    await setWorkflow(processingFor(35_000));
    rerender(<WorkflowProcessing />);
    expect(screen.getByRole('status')).toHaveTextContent('process_workflow.still_working');
  });
});

describe('useIsWorkflowHavingTrouble', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  /** Renders the hook with a first poll's workflow; `poll` delivers the next one. */
  async function renderWithPolls(first: IProcessWorkflow | undefined) {
    await setWorkflow(first);
    const { result, rerender, unmount } = renderHook(() => useIsWorkflowHavingTrouble(), {
      wrapper: queryTest.wrapper,
    });
    const poll = async (workflow: IProcessWorkflow | undefined) => {
      await setWorkflow(workflow);
      rerender();
      return result.current;
    };
    return { result, poll, unmount };
  }

  it('reports trouble at once after two failed attempts', async () => {
    const { result } = await renderWithPolls(processingFor(1_000, { failedAttempts: 2, failingForMs: 500 }));
    expect(result.current).toBe(true);
  });

  it('reports a single failed attempt once the step has kept failing for twenty seconds', async () => {
    const { result, poll } = await renderWithPolls(processingFor(5_000, { failedAttempts: 1, failingForMs: 0 }));
    expect(result.current).toBe(false);
    expect(await poll(processingFor(24_999, { failedAttempts: 1, failingForMs: 19_999 }))).toBe(false);
    expect(await poll(processingFor(25_000, { failedAttempts: 1, failingForMs: 20_000 }))).toBe(true);
  });

  it('gives the same answer after a reload, from the engine status alone', async () => {
    const failing = processingFor(60_000, { failedAttempts: 1, failingForMs: 30_000 });
    const first = await renderWithPolls(failing);
    expect(first.result.current).toBe(true);
    first.unmount();

    expect((await renderWithPolls(failing)).result.current).toBe(true);
  });

  it('does not report a single failed attempt at once, however long the run has lasted', async () => {
    // A task that deferred for hours and then failed one re-check.
    const { result } = await renderWithPolls(processingFor(3 * 60 * 60_000, { failedAttempts: 1, failingForMs: 0 }));
    expect(result.current).toBe(false);
  });

  it('decides only when a poll arrives, so a step that recovers in between is never reported', async () => {
    const { result, poll } = await renderWithPolls(processingFor(5_000, { failedAttempts: 1, failingForMs: 0 }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(result.current).toBe(false);
    expect(await poll(processingFor(65_000))).toBe(false);
  });

  it('never reports trouble without failed attempts, however long the run', async () => {
    const { result } = await renderWithPolls(processingFor(10 * 60_000));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(result.current).toBe(false);
  });

  it('clears when failedAttempts returns to zero, and times the next failure from its own first attempt', async () => {
    const { result, poll } = await renderWithPolls(processingFor(30_000, { failedAttempts: 3, failingForMs: 25_000 }));
    expect(result.current).toBe(true);

    // The failing step succeeded or deferred.
    expect(await poll(processingFor(35_000))).toBe(false);
    expect(await poll(processingFor(40_000, { failedAttempts: 1, failingForMs: 0 }))).toBe(false);
    expect(await poll(processingFor(59_999, { failedAttempts: 1, failingForMs: 19_999 }))).toBe(false);
    expect(await poll(processingFor(60_000, { failedAttempts: 1, failingForMs: 20_000 }))).toBe(true);
  });

  it('counts only the second failure when the engine does not say when the first one happened', async () => {
    const { result, poll } = await renderWithPolls(processingFor(10 * 60_000, { failedAttempts: 1 }));
    expect(result.current).toBe(false);
    expect(await poll(processingFor(11 * 60_000, { failedAttempts: 2 }))).toBe(true);
  });

  it.each([{ status: 'idle' as const }, { status: 'failed' as const }, undefined])(
    'never reports trouble when the workflow is not processing: %o',
    async (workflow) => {
      const { result } = await renderWithPolls(workflow);
      expect(result.current).toBe(false);
    },
  );
});

describe('WorkflowTroubleBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    onServiceTaskPage = true;
  });
  afterEach(() => vi.useRealTimers());

  /** Gives a newly added status region time to register with screen readers. */
  async function letRegionSettle() {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
  }

  it('puts the warning into a status region that exists before the trouble starts', async () => {
    await setWorkflow(processingFor(3_000, { failedAttempts: 1, failingForMs: 0 }));
    const { container, rerender } = render(<WorkflowTroubleBanner />);
    // A live region inserted with its text already in it is not reliably announced.
    const region = screen.getByRole('status');
    await letRegionSettle();
    expect(region).toBeEmptyDOMElement();

    await setWorkflow(processingFor(4_000, { failedAttempts: 2, failingForMs: 1_000 }));
    rerender(<WorkflowTroubleBanner />);
    expect(screen.getByRole('status')).toBe(region);
    expect(region).toHaveTextContent('process_workflow.having_trouble');

    // The visible warning sits beside the region and is hidden from screen readers, so the text is
    // announced once. role='status' is already polite; aria-live would make VoiceOver announce twice.
    const visible = container.querySelector('[aria-hidden="true"]');
    expect(visible).toHaveTextContent('process_workflow.having_trouble');
    expect(region).not.toContainElement(visible as HTMLElement);
    expect(container.querySelector('[aria-live]')).toBeNull();
  });

  it('mounts its status region empty when the trouble is already active, and fills it after', async () => {
    // After a reload or on entering the page, the trouble can be active before the region exists.
    await setWorkflow(processingFor(3_000, { failedAttempts: 2, failingForMs: 1_000 }));
    const { container } = render(<WorkflowTroubleBanner />);
    const region = screen.getByRole('status');
    expect(region).toBeEmptyDOMElement();
    expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent('process_workflow.having_trouble');

    await letRegionSettle();
    expect(screen.getByRole('status')).toBe(region);
    expect(region).toHaveTextContent('process_workflow.having_trouble');
  });

  it("renders nothing, not even its status region, on a page that is not a service task's", async () => {
    onServiceTaskPage = false;
    await setWorkflow(processingFor(3_000, { failedAttempts: 2, failingForMs: 1_000 }));
    const { container } = render(<WorkflowTroubleBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    ['idle', { status: 'idle' as const }],
    ['processing without failures', processingFor(3_000)],
    ['a long but healthy run', processingFor(10 * 60_000)],
    ['a single quick failure', processingFor(3_000, { failedAttempts: 1, failingForMs: 0 })],
  ])('is not shown when %s', async (_, workflow) => {
    await setWorkflow(workflow);
    const { container } = render(<WorkflowTroubleBanner />);
    await letRegionSettle();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });
});
