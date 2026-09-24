import React from 'react';
import { act, renderHook } from '@testing-library/react';
import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import { BpmnContext, type BpmnContextProps } from '../../../../contexts/BpmnContext';
import { mockBpmnContextValue } from '../../../../../test/mocks/bpmnContextMock';
import { mockBpmnDetails } from '../../../../../test/mocks/bpmnDetailsMock';
import { BpmnTypeEnum } from '../../../../enum/BpmnTypeEnum';
import type { BpmnDetails } from '../../../../types/BpmnDetails';
import { useSubformPdfConfig } from './useSubformPdfConfig';

const updateModdleProperties = jest.fn();
const createElement = jest.fn((elementType: string, options: object) => ({
  $type: elementType,
  ...options,
}));

jest.mock('../../../../utils/bpmnModeler/StudioModeler', () => ({
  StudioModeler: jest.fn().mockImplementation(() => ({
    updateModdleProperties: (...args: unknown[]) => updateModdleProperties(...args),
    createElement: (...args: unknown[]) => createElement(...(args as [string, object])),
  })),
}));

describe('useSubformPdfConfig', () => {
  afterEach(jest.clearAllMocks);

  it('reads the three values the runtime looks for', () => {
    const { result } = renderUseSubformPdfConfig({
      subformComponentId: 'my-subform',
      subformDataTypeId: 'subform-data',
      filenameTextResourceKey: { value: 'my-filename-key' },
    });

    expect(result.current.subformComponentId).toBe('my-subform');
    expect(result.current.subformDataTypeId).toBe('subform-data');
    expect(result.current.filenameTextResourceId).toBe('my-filename-key');
  });

  it('writes the subform component id and its data type id in one update', () => {
    const { result, subformPdfConfig } = renderUseSubformPdfConfig({});

    act(() => result.current.setSubformComponentAndDataTypeIds('my-subform', 'subform-data'));

    expect(updateModdleProperties).toHaveBeenCalledTimes(1);
    expect(updateModdleProperties).toHaveBeenCalledWith(
      { subformComponentId: 'my-subform', subformDataTypeId: 'subform-data' },
      subformPdfConfig,
    );
  });

  it('writes the subform data type id into the existing config node', () => {
    const { result, subformPdfConfig } = renderUseSubformPdfConfig({});

    act(() => result.current.setSubformDataTypeId('subform-data'));

    expect(updateModdleProperties).toHaveBeenCalledWith(
      { subformDataTypeId: 'subform-data' },
      subformPdfConfig,
    );
  });

  it('writes the filename as its own element', () => {
    const { result, subformPdfConfig } = renderUseSubformPdfConfig({});

    act(() => result.current.setFilenameTextResourceId('my-filename-key'));

    expect(createElement).toHaveBeenCalledWith('altinn:FilenameTextResourceKey', {
      value: 'my-filename-key',
    });
    expect(updateModdleProperties).toHaveBeenCalledWith(
      {
        filenameTextResourceKey: expect.objectContaining({ value: 'my-filename-key' }),
      },
      subformPdfConfig,
    );
  });

  it('creates the config node when a hand-authored task has none', () => {
    const { result, taskExtension } = renderUseSubformPdfConfig(undefined);

    act(() => result.current.setSubformComponentAndDataTypeIds('my-subform', 'subform-data'));

    expect(createElement).toHaveBeenCalledWith('altinn:SubformPdfConfig', {
      subformComponentId: 'my-subform',
      subformDataTypeId: 'subform-data',
    });
    expect(updateModdleProperties).toHaveBeenCalledWith(
      { subformPdfConfig: expect.objectContaining({ $type: 'altinn:SubformPdfConfig' }) },
      taskExtension,
    );
  });

  it('removes an emptied value rather than writing a blank one', () => {
    const { result, subformPdfConfig } = renderUseSubformPdfConfig({
      subformComponentId: 'my-subform',
      subformDataTypeId: 'subform-data',
      filenameTextResourceKey: { value: 'my-filename-key' },
    });

    act(() => result.current.setSubformComponentAndDataTypeIds('', ''));
    act(() => result.current.setFilenameTextResourceId(''));

    expect(updateModdleProperties).toHaveBeenCalledWith(
      { subformComponentId: undefined, subformDataTypeId: undefined },
      subformPdfConfig,
    );
    expect(updateModdleProperties).toHaveBeenCalledWith(
      { filenameTextResourceKey: undefined },
      subformPdfConfig,
    );
  });

  it('leaves the bpmn alone when a value did not change', () => {
    const { result } = renderUseSubformPdfConfig({
      subformComponentId: 'my-subform',
      subformDataTypeId: 'subform-data',
    });

    act(() => result.current.setSubformComponentAndDataTypeIds('my-subform', 'subform-data'));

    expect(updateModdleProperties).not.toHaveBeenCalled();
  });
});

const createSubformPdfDetails = (taskExtension: ModdleElement): BpmnDetails => ({
  ...mockBpmnDetails,
  taskType: 'subformPdf',
  type: BpmnTypeEnum.ServiceTask,
  element: {
    ...mockBpmnDetails.element,
    businessObject: { extensionElements: { values: [taskExtension] } },
  },
});

const renderUseSubformPdfConfig = (subformPdfConfig: object | undefined) => {
  const taskExtension = {
    $type: 'altinn:TaskExtension',
    taskType: 'subformPdf',
    subformPdfConfig,
  } as unknown as ModdleElement;
  const bpmnContextProps: Partial<BpmnContextProps> = {
    bpmnDetails: createSubformPdfDetails(taskExtension),
  };

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <BpmnContext.Provider value={{ ...mockBpmnContextValue, ...bpmnContextProps }}>
      {children}
    </BpmnContext.Provider>
  );

  return {
    ...renderHook(() => useSubformPdfConfig(), { wrapper: Wrapper }),
    taskExtension,
    subformPdfConfig,
  };
};
