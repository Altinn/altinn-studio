import React from 'react';

import { act, render, screen } from '@testing-library/react';

import { WorkflowProcessing } from 'src/components/process/WorkflowEngine';
import { useProcessWorkflow } from 'src/features/instance/useProcessQuery';

vi.mock('src/features/instance/useProcessQuery', () => ({ useProcessWorkflow: vi.fn() }));
vi.mock('src/core/loading/Loader', () => ({ Loader: ({ overlay }: { overlay?: React.ReactNode }) => overlay }));
vi.mock('src/features/language/Lang', () => ({ Lang: ({ id }: { id: string }) => id }));

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
  const startedAt = '2026-09-16T12:00:00.000Z';
  const processingFor = (elapsedMs: number, failedAttempts?: number) => ({
    status: 'processing' as const,
    startedAt,
    currentTime: new Date(Date.parse(startedAt) + elapsedMs).toISOString(),
    failedAttempts,
  });

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('gives a single quick failure until twenty seconds into processing', async () => {
    vi.mocked(useProcessWorkflow).mockReturnValue(processingFor(2_000, 1));
    render(<WorkflowProcessing />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6_000);
    });
    expect(screen.getByRole('status')).toHaveTextContent('process_workflow.still_working');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(11_999);
    });
    expect(screen.getByRole('status')).toHaveTextContent('process_workflow.still_working');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByRole('status')).toHaveTextContent('process_workflow.having_trouble');
  });

  it('warns at once after a second failed attempt, before the still-working notice', () => {
    vi.mocked(useProcessWorkflow).mockReturnValue(processingFor(3_000, 2));
    render(<WorkflowProcessing />);
    expect(screen.getByRole('status')).toHaveTextContent('process_workflow.having_trouble');
  });

  it('warns at once when a first attempt failed slowly', () => {
    vi.mocked(useProcessWorkflow).mockReturnValue(processingFor(100_000, 1));
    render(<WorkflowProcessing />);
    expect(screen.getByRole('status')).toHaveTextContent('process_workflow.having_trouble');
  });

  it('times a resumed transition from the resume, not the original submit', async () => {
    const resumedAt = new Date(Date.parse(startedAt) + 10 * 60_000).toISOString();
    vi.mocked(useProcessWorkflow).mockReturnValue({
      status: 'processing',
      startedAt,
      resumedAt,
      currentTime: new Date(Date.parse(resumedAt) + 2_000).toISOString(),
      failedAttempts: 1,
    });
    render(<WorkflowProcessing />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6_000);
    });
    expect(screen.getByRole('status')).toHaveTextContent('process_workflow.still_working');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(12_000);
    });
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
