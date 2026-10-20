import { describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUpdateUserControlledImplementation } from './useUpdateUserControlledImplementation';
import { useBpmnContext } from '../../../../contexts/BpmnContext';

vi.mock('../../../../contexts/BpmnContext');

describe('useUpdateUserControlledImplementation', () => {
  it('throws an error and does not call updateModdleProperties when ensureHasSignatureConfig fails', () => {
    const mockUpdateModdleProperties = vi.fn();

    const faultyElement = {
      businessObject: {
        extensionElements: {
          values: [{ $type: 'altinn:TaskExtension' }],
        },
      },
    };

    (useBpmnContext as Mock).mockReturnValue({
      bpmnDetails: { element: faultyElement },
      modelerRef: {
        current: {
          get: () => ({
            updateModdleProperties: mockUpdateModdleProperties,
          }),
        },
      },
    });

    const { result } = renderHook(() => useUpdateUserControlledImplementation());

    expect(() => {
      act(() => {
        result.current('failValue');
      });
    }).toThrow('Missing signature config in BPMN extension element');

    expect(mockUpdateModdleProperties).not.toHaveBeenCalled();
  });

  it('calls updateModdleProperties when ensureHasSignatureConfig does not throw', () => {
    const mockUpdateModdleProperties = vi.fn();

    const element = {
      businessObject: {
        extensionElements: {
          values: [
            {
              $type: 'altinn:TaskExtension',
              signatureConfig: { signeeProviderId: 'oldValue' },
            },
          ],
        },
      },
    };

    (useBpmnContext as Mock).mockReturnValue({
      bpmnDetails: { element },
      modelerRef: {
        current: {
          get: () => ({
            updateModdleProperties: mockUpdateModdleProperties,
          }),
        },
      },
    });

    const { result } = renderHook(() => useUpdateUserControlledImplementation());

    act(() => {
      result.current('newSigneeId');
    });

    expect(mockUpdateModdleProperties).toHaveBeenCalledWith(
      element,
      element.businessObject.extensionElements.values[0].signatureConfig,
      { signeeProviderId: 'newSigneeId' },
    );
  });
});
