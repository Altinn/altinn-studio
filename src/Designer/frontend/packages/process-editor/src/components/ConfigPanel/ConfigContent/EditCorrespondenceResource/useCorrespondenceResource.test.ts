import { act, renderHook } from '@testing-library/react';
import { useCorrespondenceResource } from './useCorrespondenceResource';
import { useBpmnContext } from '../../../../contexts/BpmnContext';

jest.mock('../../../../contexts/BpmnContext');

describe('useCorrespondenceResource', () => {
  afterEach(jest.clearAllMocks);

  it('fails loudly when the task has no signature config, rather than writing a broken extension', () => {
    const updateModdleProperties = jest.fn();
    const element = {
      businessObject: { extensionElements: { values: [{ $type: 'altinn:TaskExtension' }] } },
    };
    (useBpmnContext as jest.Mock).mockReturnValue({
      bpmnDetails: { element },
      modelerRef: {
        current: {
          get: (name: string) =>
            name === 'moddle' ? { create: jest.fn() } : { updateModdleProperties },
        },
      },
    });

    const { result } = renderHook(() => useCorrespondenceResource());

    expect(() => act(() => result.current.updateEntries([{ value: 'resource' }]))).toThrow(
      'Missing signature config in BPMN extension element',
    );
    expect(updateModdleProperties).not.toHaveBeenCalled();
  });
});
