import { renderHook } from '@testing-library/react';
import { useBpmnElementIds } from './useBpmnElementIds';

const allElementIds = ['Task_1', 'PdfServiceTask_1', 'StartEvent_1', 'Gateway_1'];

jest.mock('../utils/bpmnModeler/StudioModeler', () => ({
  StudioModeler: jest.fn().mockImplementation(() => ({
    getAllElementIds: () => allElementIds,
  })),
}));

describe('useBpmnElementIds', () => {
  it('should return the ids of every element in the diagram, not only the tasks', () => {
    const { result } = renderHook(() => useBpmnElementIds());

    expect(result.current).toEqual(allElementIds);
  });
});
