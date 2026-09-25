import { renderHook, act } from '@testing-library/react';
import { useUpdateCorrespondenceResource } from './useUpdateCorrespondenceResource';
import { useBpmnContext } from '../../../../contexts/BpmnContext';

jest.mock('../../../../contexts/BpmnContext');

describe('useUpdateCorrespondenceResource', () => {
  it('throws an error and does not call updateModdleProperties when ensureHasSignatureConfig fails', () => {
    const mockUpdateModdleProperties = jest.fn();

    const faultyElement = {
      businessObject: {
        extensionElements: {
          values: [{}], // No signatureConfig
        },
      },
    };

    (useBpmnContext as jest.Mock).mockReturnValue({
      bpmnDetails: { element: faultyElement },
      modelerRef: {
        current: {
          get: () => ({
            updateModdleProperties: mockUpdateModdleProperties,
          }),
        },
      },
    });

    const { result } = renderHook(() => useUpdateCorrespondenceResource());

    expect(() => {
      act(() => {
        result.current('failValue');
      });
    }).toThrow('Missing signature config in BPMN extension element');

    expect(mockUpdateModdleProperties).not.toHaveBeenCalled();
  });

  it('calls updateModdleProperties when ensureHasSignatureConfig does not throw', () => {
    const mockUpdateModdleProperties = jest.fn();
    const element = {
      businessObject: {
        extensionElements: {
          values: [
            {
              signatureConfig: { correspondenceResource: 'oldValue' },
            },
          ],
        },
      },
    };

    (useBpmnContext as jest.Mock).mockReturnValue({
      bpmnDetails: { element },
      modelerRef: {
        current: {
          get: () => ({
            updateModdleProperties: mockUpdateModdleProperties,
          }),
        },
      },
    });

    const { result } = renderHook(() => useUpdateCorrespondenceResource());

    const newValue = 'newValue';
    act(() => {
      result.current(newValue);
    });

    expect(mockUpdateModdleProperties).toHaveBeenCalledWith(
      element,
      element.businessObject.extensionElements.values[0].signatureConfig,
      { correspondenceResource: newValue },
    );
  });
});
