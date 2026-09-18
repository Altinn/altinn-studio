import { renderHook, act, waitFor } from '@testing-library/react';
import { useUpdatePdfConfigTaskIds } from './useUpdatePdfConfigTaskIds';
import { useBpmnContext } from '../contexts/BpmnContext';
import { useDebounce } from '@studio/hooks';

jest.mock('../contexts/BpmnContext');
jest.mock('@studio/hooks');

describe('useUpdatePdfConfigTaskIds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useDebounce as jest.Mock).mockReturnValue({
      debounce: (fn: () => void) => fn(),
    });
  });

  it('calls updateModdleProperties with correct arguments when updating task ids', async () => {
    const mockUpdateModdleProperties = jest.fn();
    const mockCreate = jest.fn((type: string, props?: any) => {
      if (type === 'altinn:AutoPdfTaskIds') {
        return { taskIds: [] };
      }
      if (type === 'altinn:TaskId') {
        return { value: props.value };
      }
      return {};
    });

    const pdfConfig = {
      filename: { value: 'test.pdf' },
      autoPdfTaskIds: { taskIds: [] },
    };

    const element = {
      businessObject: {
        extensionElements: {
          values: [{ pdfConfig }],
        },
      },
    };

    (useBpmnContext as jest.Mock).mockReturnValue({
      bpmnDetails: { element },
      modelerRef: {
        current: {
          get: (service: string) => {
            if (service === 'modeling') {
              return { updateModdleProperties: mockUpdateModdleProperties };
            }
            if (service === 'bpmnFactory') {
              return { create: mockCreate };
            }
            return {};
          },
        },
      },
    });

    const { result } = renderHook(() => useUpdatePdfConfigTaskIds());

    const updatedTaskIds = ['task_1', 'task_2'];
    act(() => {
      result.current(updatedTaskIds);
    });

    await waitFor(() => expect(mockUpdateModdleProperties).toHaveBeenCalled());

    expect(mockCreate).toHaveBeenCalledWith('altinn:AutoPdfTaskIds');
    expect(mockCreate).toHaveBeenCalledWith('altinn:TaskId', { value: 'task_1' });
    expect(mockCreate).toHaveBeenCalledWith('altinn:TaskId', { value: 'task_2' });
    expect(mockUpdateModdleProperties).toHaveBeenCalledWith(
      element,
      pdfConfig,
      expect.objectContaining({
        autoPdfTaskIds: expect.objectContaining({ taskIds: expect.any(Array) }),
      }),
    );
  });

  it('updates with empty array when no task ids are provided', async () => {
    const mockUpdateModdleProperties = jest.fn();
    const mockCreate = jest.fn((type: string) => {
      if (type === 'altinn:AutoPdfTaskIds') {
        return { taskIds: [] };
      }
      return {};
    });

    const pdfConfig = {
      filename: { value: 'test.pdf' },
      autoPdfTaskIds: { taskIds: [] },
    };

    const element = {
      businessObject: {
        extensionElements: {
          values: [{ pdfConfig }],
        },
      },
    };

    (useBpmnContext as jest.Mock).mockReturnValue({
      bpmnDetails: { element },
      modelerRef: {
        current: {
          get: (service: string) => {
            if (service === 'modeling') {
              return { updateModdleProperties: mockUpdateModdleProperties };
            }
            if (service === 'bpmnFactory') {
              return { create: mockCreate };
            }
            return {};
          },
        },
      },
    });

    const { result } = renderHook(() => useUpdatePdfConfigTaskIds());

    act(() => {
      result.current([]);
    });

    await waitFor(() => expect(mockUpdateModdleProperties).toHaveBeenCalled());

    expect(mockCreate).toHaveBeenCalledWith('altinn:AutoPdfTaskIds');
    expect(mockCreate).not.toHaveBeenCalledWith('altinn:TaskId', expect.anything());
    expect(mockUpdateModdleProperties).toHaveBeenCalledWith(
      element,
      pdfConfig,
      expect.objectContaining({
        autoPdfTaskIds: expect.objectContaining({ taskIds: [] }),
      }),
    );
  });

  it('creates TaskId elements for each task id in the array', async () => {
    const mockUpdateModdleProperties = jest.fn();
    const taskIds = ['task_1', 'task_2', 'task_3'];
    const mockCreate = jest.fn((type: string, props?: any) => {
      if (type === 'altinn:AutoPdfTaskIds') {
        return { taskIds: [] };
      }
      if (type === 'altinn:TaskId') {
        return { value: props.value };
      }
      return {};
    });

    const pdfConfig = {
      filename: { value: 'test.pdf' },
      autoPdfTaskIds: { taskIds: [] },
    };

    const element = {
      businessObject: {
        extensionElements: {
          values: [{ pdfConfig }],
        },
      },
    };

    (useBpmnContext as jest.Mock).mockReturnValue({
      bpmnDetails: { element },
      modelerRef: {
        current: {
          get: (service: string) => {
            if (service === 'modeling') {
              return { updateModdleProperties: mockUpdateModdleProperties };
            }
            if (service === 'bpmnFactory') {
              return { create: mockCreate };
            }
            return {};
          },
        },
      },
    });

    const { result } = renderHook(() => useUpdatePdfConfigTaskIds());

    act(() => {
      result.current(taskIds);
    });

    await waitFor(() => expect(mockUpdateModdleProperties).toHaveBeenCalled());

    expect(mockCreate).toHaveBeenCalledTimes(4);
    taskIds.forEach((taskId) => {
      expect(mockCreate).toHaveBeenCalledWith('altinn:TaskId', { value: taskId });
    });
  });

  it('uses debounce when updating task ids', () => {
    const debounceMock = jest.fn((fn: () => void) => fn());
    (useDebounce as jest.Mock).mockReturnValue({
      debounce: debounceMock,
    });

    const mockUpdateModdleProperties = jest.fn();
    const mockCreate = jest.fn(() => ({ taskIds: [] }));

    const pdfConfig = {
      filename: { value: 'test.pdf' },
      autoPdfTaskIds: { taskIds: [] },
    };

    const element = {
      businessObject: {
        extensionElements: {
          values: [{ pdfConfig }],
        },
      },
    };

    (useBpmnContext as jest.Mock).mockReturnValue({
      bpmnDetails: { element },
      modelerRef: {
        current: {
          get: (service: string) => {
            if (service === 'modeling') {
              return { updateModdleProperties: mockUpdateModdleProperties };
            }
            if (service === 'bpmnFactory') {
              return { create: mockCreate };
            }
            return {};
          },
        },
      },
    });

    const { result } = renderHook(() => useUpdatePdfConfigTaskIds());

    act(() => {
      result.current(['task_1']);
    });

    expect(debounceMock).toHaveBeenCalled();
  });
});
