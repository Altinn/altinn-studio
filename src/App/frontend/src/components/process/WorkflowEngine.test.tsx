import React from 'react';

import { act, render, renderHook, screen } from '@testing-library/react';

import {
  useIsWorkflowHavingTrouble,
  WorkflowProcessing,
  WorkflowTroubleBanner,
} from 'src/components/process/WorkflowEngine';
import { useProcessWorkflow } from 'src/features/instance/useProcessQuery';
import { useIsPdf } from 'src/hooks/useIsPdf';
import type { IProcessWorkflow } from 'src/types/shared';

vi.mock('src/features/instance/useProcessQuery', () => ({ useProcessWorkflow: vi.fn() }));
vi.mock('src/core/loading/Loader', () => ({ Loader: ({ overlay }: { overlay?: React.ReactNode }) => overlay }));
vi.mock('src/features/language/Lang', () => ({ Lang: ({ id }: { id: string }) => id }));
vi.mock('src/hooks/useIsPdf', () => ({ useIsPdf: vi.fn(() => false) }));

const startedAt = '2026-09-16T12:00:00.000Z';

/** A processing workflow whose current run has lasted `elapsedMs` on the engine clock. */
function processingFor(elapsedMs: number, failedAttempts?: number, resumedAt?: string) {
  return {
    status: 'processing' as const,
    startedAt,
    resumedAt,
    currentTime: new Date(Date.parse(resumedAt ?? startedAt) + elapsedMs).toISOString(),
    failedAttempts,
  };
}

it('only counts time in processing status and resets when processing ends', async () => {
  vi.useFakeTimers();
  try {
    vi.mocked(useProcessWorkflow).mockReturnValue({ status: 'idle' });
    const { rerender } = render(<WorkflowProcessing />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    vi.mocked(useProcessWorkflow).mockReturnValue({ status: 'processing' });
    rerender(<WorkflowProcessing />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });

    vi.mocked(useProcessWorkflow).mockReturnValue({ status: 'idle' });
    rerender(<WorkflowProcessing />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    vi.mocked(useProcessWorkflow).mockReturnValue({ status: 'processing' });
    rerender(<WorkflowProcessing />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(7_999);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByRole('status')).toHaveTextContent('process_workflow.still_working');

    vi.mocked(useProcessWorkflow).mockReturnValue({ status: 'idle' });
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
    vi.mocked(useProcessWorkflow).mockReturnValue({
      status: 'processing',
      startedAt,
      currentTime: new Date(Date.parse(startedAt) + 3_000).toISOString(),
    });
    const { rerender } = render(<WorkflowProcessing />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    // A poll updates the engine reference without starting a fresh eight-second wait.
    vi.mocked(useProcessWorkflow).mockReturnValue({
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

  it.each([8_000, 15_000])('shows the notice immediately on reload after %i ms of processing', (elapsed) => {
    vi.mocked(useProcessWorkflow).mockReturnValue({
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
    vi.mocked(useProcessWorkflow).mockReturnValue({
      status: 'processing',
      startedAt: '2026-09-16T12:00:00Z',
      currentTime: '2026-09-16T12:00:15Z',
    });
    const { rerender } = render(<WorkflowProcessing />);
    expect(screen.getByRole('status')).toBeInTheDocument();

    vi.mocked(useProcessWorkflow).mockReturnValue({
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

    vi.mocked(useProcessWorkflow).mockReturnValue({ status: 'idle' });
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
    vi.mocked(useProcessWorkflow).mockReturnValue({ status: 'processing', ...timestamps });
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

  it('warns about a single failed attempt once a poll still reports it twenty seconds later', async () => {
    vi.mocked(useProcessWorkflow).mockReturnValue(processingFor(2_000, 1));
    const { rerender } = render(<WorkflowProcessing />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6_000);
    });
    expect(screen.getByRole('status')).toHaveTextContent('process_workflow.still_working');

    vi.mocked(useProcessWorkflow).mockReturnValue(processingFor(21_999, 1));
    rerender(<WorkflowProcessing />);
    expect(screen.getByRole('status')).toHaveTextContent('process_workflow.still_working');

    vi.mocked(useProcessWorkflow).mockReturnValue(processingFor(22_000, 1));
    rerender(<WorkflowProcessing />);
    expect(screen.getByRole('status')).toHaveTextContent('process_workflow.having_trouble');
  });

  it('warns at once after a second failed attempt, before the still-working notice', () => {
    vi.mocked(useProcessWorkflow).mockReturnValue(processingFor(3_000, 2));
    render(<WorkflowProcessing />);
    expect(screen.getByRole('status')).toHaveTextContent('process_workflow.having_trouble');
  });

  it('does not warn at once about a single failed attempt after a long wait', () => {
    // A task that deferred for hours and then failed one re-check.
    vi.mocked(useProcessWorkflow).mockReturnValue(processingFor(3 * 60 * 60_000, 1));
    render(<WorkflowProcessing />);
    expect(screen.getByRole('status')).toHaveTextContent('process_workflow.still_working');
  });

  it('times a resumed transition from the resume, not the original submit', async () => {
    const resumedAt = new Date(Date.parse(startedAt) + 10 * 60_000).toISOString();
    vi.mocked(useProcessWorkflow).mockReturnValue(processingFor(2_000, 1, resumedAt));
    const { rerender } = render(<WorkflowProcessing />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6_000);
    });
    expect(screen.getByRole('status')).toHaveTextContent('process_workflow.still_working');

    vi.mocked(useProcessWorkflow).mockReturnValue(processingFor(22_000, 1, resumedAt));
    rerender(<WorkflowProcessing />);
    expect(screen.getByRole('status')).toHaveTextContent('process_workflow.having_trouble');
  });

  it('returns to the still-working notice once the failing step succeeds', () => {
    vi.mocked(useProcessWorkflow).mockReturnValue(processingFor(30_000, 3));
    const { rerender } = render(<WorkflowProcessing />);
    expect(screen.getByRole('status')).toHaveTextContent('process_workflow.having_trouble');

    vi.mocked(useProcessWorkflow).mockReturnValue(processingFor(35_000));
    rerender(<WorkflowProcessing />);
    expect(screen.getByRole('status')).toHaveTextContent('process_workflow.still_working');
  });
});

describe('useIsWorkflowHavingTrouble', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  /** Renders the hook with a first poll's workflow; `poll` delivers the next one. */
  function renderWithPolls(first: IProcessWorkflow | undefined) {
    vi.mocked(useProcessWorkflow).mockReturnValue(first);
    const { result, rerender } = renderHook(() => useIsWorkflowHavingTrouble());
    const poll = (workflow: IProcessWorkflow | undefined) => {
      vi.mocked(useProcessWorkflow).mockReturnValue(workflow);
      rerender();
      return result.current;
    };
    return { result, poll };
  }

  const laterRun = new Date(Date.parse(startedAt) + 10 * 60_000).toISOString();

  it('reports trouble at once after two failed attempts', () => {
    const { result } = renderWithPolls(processingFor(1_000, 2));
    expect(result.current).toBe(true);
  });

  it('reports a single failed attempt once a poll still reports it twenty seconds after the first', () => {
    const { result, poll } = renderWithPolls(processingFor(5_000, 1));
    expect(result.current).toBe(false);
    expect(poll(processingFor(24_999, 1))).toBe(false);
    expect(poll(processingFor(25_000, 1))).toBe(true);
  });

  it('does not report a single failed attempt at once, however long the run has lasted', () => {
    // A task that deferred for hours and then failed one re-check.
    const { result } = renderWithPolls(processingFor(3 * 60 * 60_000, 1));
    expect(result.current).toBe(false);
  });

  it('decides only when a poll arrives, so a step that recovers in between is never reported', async () => {
    const { result, poll } = renderWithPolls(processingFor(5_000, 1));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(result.current).toBe(false);
    expect(poll(processingFor(65_000))).toBe(false);
  });

  it('never reports trouble without failed attempts, however long the run', async () => {
    const { result } = renderWithPolls(processingFor(10 * 60_000));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(result.current).toBe(false);
  });

  it('clears when failedAttempts returns to zero, and times the next failure from scratch', () => {
    const { result, poll } = renderWithPolls(processingFor(30_000, 3));
    expect(result.current).toBe(true);

    // The failing step succeeded or deferred.
    expect(poll(processingFor(35_000))).toBe(false);
    expect(poll(processingFor(40_000, 1))).toBe(false);
    expect(poll(processingFor(59_999, 1))).toBe(false);
    expect(poll(processingFor(60_000, 1))).toBe(true);
  });

  it.each([
    ['the run is resumed', (elapsedMs: number) => processingFor(elapsedMs, 1, laterRun)],
    [
      'the process moves on to another transition',
      (elapsedMs: number) => ({ ...processingFor(elapsedMs, 1, laterRun), startedAt: laterRun, resumedAt: undefined }),
    ],
  ])('starts over when %s', (_, nextRun) => {
    const { poll } = renderWithPolls(processingFor(0, 1));
    expect(poll(processingFor(20_000, 1))).toBe(true);

    expect(poll(nextRun(2_000))).toBe(false);
    expect(poll(nextRun(21_999))).toBe(false);
    expect(poll(nextRun(22_000))).toBe(true);
  });

  it('times a single failed attempt also when the engine leaves out startedAt', () => {
    const withoutStart = (elapsedMs: number) => ({ ...processingFor(elapsedMs, 1), startedAt: undefined });
    const { result, poll } = renderWithPolls(withoutStart(5_000));
    expect(result.current).toBe(false);
    expect(poll(withoutStart(24_999))).toBe(false);
    expect(poll(withoutStart(25_000))).toBe(true);
  });

  it.each([{ status: 'idle' as const }, { status: 'failed' as const }, undefined])(
    'never reports trouble when the workflow is not processing: %o',
    (workflow) => {
      const { result } = renderWithPolls(workflow);
      expect(result.current).toBe(false);
    },
  );
});

describe('WorkflowTroubleBanner', () => {
  beforeEach(() => vi.mocked(useIsPdf).mockReturnValue(false));

  it('puts the warning into a status region that exists before the trouble starts', () => {
    vi.mocked(useProcessWorkflow).mockReturnValue(processingFor(3_000, 1));
    const { container, rerender } = render(<WorkflowTroubleBanner />);
    // A live region inserted with its text already in it is not reliably announced.
    const region = screen.getByRole('status');
    expect(region).toBeEmptyDOMElement();

    vi.mocked(useProcessWorkflow).mockReturnValue(processingFor(4_000, 2));
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

  it('is never shown in PDF mode', () => {
    vi.mocked(useIsPdf).mockReturnValue(true);
    vi.mocked(useProcessWorkflow).mockReturnValue(processingFor(3_000, 2));
    const { container } = render(<WorkflowTroubleBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    ['idle', { status: 'idle' as const }],
    ['processing without failures', processingFor(3_000)],
    ['a long but healthy run', processingFor(10 * 60_000)],
    ['a single quick failure', processingFor(3_000, 1)],
  ])('is not shown when %s', (_, workflow) => {
    vi.mocked(useProcessWorkflow).mockReturnValue(workflow);
    const { container } = render(<WorkflowTroubleBanner />);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });
});
