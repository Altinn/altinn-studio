import { act, renderHook } from '@testing-library/react';
import { useBpmnEditor } from './useBpmnEditor';
import * as bpmnModelerModule from './useBpmnModeler';
import { BpmnConfigPanelFormContextProvider } from '../contexts/BpmnConfigPanelContext';
import { BpmnApiContextProvider } from '../contexts/BpmnApiContext';

jest.mock('./useBpmnModeler', () => ({
  useBpmnModeler: jest.fn().mockReturnValue({
    getModeler: jest.fn(),
  }),
}));

jest.mock('../contexts/BpmnContext', () => ({
  useBpmnContext: jest.fn().mockReturnValue({
    getUpdatedXml: jest.fn().mockResolvedValue('<bpmn></bpmn>'),
    bpmnXml: '<bpmn></bpmn>',
    modelerRef: { current: null },
    setBpmnDetails: jest.fn(),
  }),
}));

describe('useBpmnEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Clear all mock calls before each test
  });

  it('should handle command stack changed event', async () => {
    const saveBpmnMock = jest.fn();
    const resetFormMock = jest.fn();
    jest.spyOn(bpmnModelerModule, 'useBpmnModeler').mockReturnValue({
      getModeler: jest.fn().mockReturnValue({
        on: jest.fn(), // Mock the getModeler function to return a mock BpmnModeler instance
      }),
    });

    const { result: tempResult } = renderHook(() => useBpmnEditor(), {
      wrapper: BpmnConfigPanelFormContextProvider,
    });

    const { result } = renderHook(() => tempResult.current, {
      wrapper: BpmnApiContextProvider,
    });

    // Simulate 'commandStack.changed' event
    const modelerInstance = result.current.modelerRef.current;
    const commandStackChangedHandler = modelerInstance.on.apply('commandStack.changed');
    await act(async () => {
      await commandStackChangedHandler(); // Simulate the event handler
    });

    // Assertions
    expect(saveBpmnMock).toHaveBeenCalledTimes(1); // Check if the saveBpmn function is called
    expect(resetFormMock).toHaveBeenCalledTimes(1); // Check if the resetForm function is called
  });

  // Repeat similar tests for other events like 'shape.add', 'shape.remove', 'element.click', etc.
});
