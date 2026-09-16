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
