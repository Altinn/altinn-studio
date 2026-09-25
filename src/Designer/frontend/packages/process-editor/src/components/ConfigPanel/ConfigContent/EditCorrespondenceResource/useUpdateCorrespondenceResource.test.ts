import { renderHook, act } from '@testing-library/react';
import { useUpdateCorrespondenceResource } from './useUpdateCorrespondenceResource';
import { useBpmnContext } from '../../../../contexts/BpmnContext';

jest.mock('../../../../contexts/BpmnContext');

const environmentConfigType = 'altinn:EnvironmentConfig';

const createModdle = () => ({
  create: jest.fn((type: string, properties: object) => ({ $type: type, ...properties })),
});

const setUpBpmnContext = (element: object) => {
  const updateModdleProperties = jest.fn();
  const moddle = createModdle();

  (useBpmnContext as jest.Mock).mockReturnValue({
    bpmnDetails: { element },
    modelerRef: {
      current: {
        get: (name: string) => (name === 'moddle' ? moddle : { updateModdleProperties }),
      },
    },
  });

  return { updateModdleProperties, moddle };
};

const elementWithCorrespondenceResources = (correspondenceResource: unknown) => ({
  businessObject: {
    extensionElements: {
      values: [{ $type: 'altinn:TaskExtension', signatureConfig: { correspondenceResource } }],
    },
  },
});

describe('useUpdateCorrespondenceResource', () => {
  afterEach(() => jest.clearAllMocks());

  it('throws an error and does not call updateModdleProperties when ensureHasSignatureConfig fails', () => {
    const faultyElement = {
      businessObject: {
        extensionElements: {
          values: [{}], // No signatureConfig
        },
      },
    };
    const { updateModdleProperties } = setUpBpmnContext(faultyElement);

    const { result } = renderHook(() => useUpdateCorrespondenceResource());

    expect(() => {
      act(() => {
        result.current('failValue');
      });
    }).toThrow('Missing signature config in BPMN extension element');

    expect(updateModdleProperties).not.toHaveBeenCalled();
  });

  it('adds a default resource when none exists', () => {
    const element = elementWithCorrespondenceResources([]);
    const { updateModdleProperties } = setUpBpmnContext(element);

    const { result } = renderHook(() => useUpdateCorrespondenceResource());
    act(() => result.current('newValue'));

    expect(updateModdleProperties).toHaveBeenCalledWith(
      element,
      element.businessObject.extensionElements.values[0].signatureConfig,
      { correspondenceResource: [{ $type: environmentConfigType, value: 'newValue' }] },
    );
  });

  it('replaces the default resource and preserves environment overrides', () => {
    const tt02Resource = { $type: environmentConfigType, env: 'tt02', value: 'resource-tt02' };
    const globalResource = { $type: environmentConfigType, value: 'resource-global' };
    const element = elementWithCorrespondenceResources([tt02Resource, globalResource]);
    const { updateModdleProperties } = setUpBpmnContext(element);

    const { result } = renderHook(() => useUpdateCorrespondenceResource());
    act(() => result.current('newValue'));

    expect(updateModdleProperties).toHaveBeenCalledWith(
      element,
      element.businessObject.extensionElements.values[0].signatureConfig,
      {
        correspondenceResource: [tt02Resource, { $type: environmentConfigType, value: 'newValue' }],
      },
    );
  });

  it('adds a default resource without changing environment overrides', () => {
    const tt02Resource = { $type: environmentConfigType, env: 'tt02', value: 'resource-tt02' };
    const element = elementWithCorrespondenceResources([tt02Resource]);
    const { updateModdleProperties } = setUpBpmnContext(element);

    const { result } = renderHook(() => useUpdateCorrespondenceResource());
    act(() => result.current('newValue'));

    expect(updateModdleProperties).toHaveBeenCalledWith(
      element,
      element.businessObject.extensionElements.values[0].signatureConfig,
      {
        correspondenceResource: [tt02Resource, { $type: environmentConfigType, value: 'newValue' }],
      },
    );
  });
});
