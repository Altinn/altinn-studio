import React from 'react';

import { renderHook } from '@testing-library/react';

import { getProcessDataMock } from 'src/__mocks__/getProcessDataMock';
import { TaskOverrides } from 'src/core/contexts/TaskOverrides';
import { useProcessQuery } from 'src/features/instance/useProcessQuery';
import { useIsPayment } from 'src/features/payment/utils';
import { useNavigationParam } from 'src/hooks/navigation';
import { useIsPdf } from 'src/hooks/useIsPdf';

vi.mock('src/features/instance/useProcessQuery', () => ({ useProcessQuery: vi.fn() }));
vi.mock('src/hooks/navigation', () => ({ useNavigationParam: vi.fn() }));
vi.mock('src/hooks/useIsPdf', () => ({ useIsPdf: vi.fn() }));

describe('useIsPayment', () => {
  let process: ReturnType<typeof getProcessDataMock>;

  beforeEach(() => {
    process = getProcessDataMock();
    process.currentTask = { ...process.currentTask!, elementId: 'Payment', altinnTaskType: 'payment' };
    process.processTasks = [
      { elementId: 'Payment', altinnTaskType: 'payment' },
      { elementId: 'SubformPdf', altinnTaskType: 'subformPdf' },
    ];
    vi.mocked(useProcessQuery).mockReturnValue({ data: process, refetch: vi.fn() });
    vi.mocked(useIsPdf).mockReturnValue(true);
    vi.mocked(useNavigationParam).mockReturnValue('SubformPdf');
  });

  it('does not label a subform preview as a payment receipt when the instance is on payment', () => {
    const { result } = renderHook(useIsPayment);
    expect(result.current).toBe(false);
  });

  it('uses the rendered payment task in PDF mode', () => {
    process.currentTask = { ...process.currentTask!, elementId: 'Other', altinnTaskType: 'data' };
    const { result } = renderHook(useIsPayment, {
      wrapper: ({ children }) => <TaskOverrides taskId='Payment'>{children}</TaskOverrides>,
    });
    expect(result.current).toBe(true);
  });

  it('keeps the actual process task for interactive views', () => {
    vi.mocked(useIsPdf).mockReturnValue(false);
    const { result } = renderHook(useIsPayment);
    expect(result.current).toBe(true);
  });
});
