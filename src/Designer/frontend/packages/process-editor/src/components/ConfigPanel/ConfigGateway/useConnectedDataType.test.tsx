import React from 'react';
import { act, renderHook } from '@testing-library/react';
import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import { BpmnContext, type BpmnContextProps } from '../../../contexts/BpmnContext';
import { mockBpmnContextValue } from '../../../../test/mocks/bpmnContextMock';
import { mockBpmnDetails } from '../../../../test/mocks/bpmnDetailsMock';
import { BpmnTypeEnum } from '../../../enum/BpmnTypeEnum';
import type { BpmnDetails } from '../../../types/BpmnDetails';
import { useConnectedDataType } from './useConnectedDataType';

const updateModdleProperties = jest.fn();
const updateElementProperties = jest.fn();
const createElement = jest.fn((elementType: string, options: object) => ({
  $type: elementType,
  ...options,
}));

jest.mock('../../../utils/bpmnModeler/StudioModeler', () => ({
  StudioModeler: jest.fn().mockImplementation(() => ({
    updateModdleProperties: (...args: unknown[]) => updateModdleProperties(...args),
    updateElementProperties: (...args: unknown[]) => updateElementProperties(...args),
    createElement: (...args: unknown[]) => createElement(...(args as [string, object])),
  })),
}));

describe('useConnectedDataType', () => {
  afterEach(jest.clearAllMocks);

  it('reads the data type the gateway extension already points at', () => {
    const { result } = renderUseConnectedDataType([createGatewayExtension('model')]);

    expect(result.current.connectedDataTypeId).toBe('model');
  });

  it('writes the chosen data type into the existing gateway extension', () => {
    const gatewayExtension = createGatewayExtension('model');
    const { result } = renderUseConnectedDataType([gatewayExtension]);

    act(() => result.current.setConnectedDataTypeId('other-model'));

    expect(updateModdleProperties).toHaveBeenCalledWith(
      { connectedDataTypeId: 'other-model' },
      gatewayExtension,
    );
  });

  it('creates the gateway extension when the gateway has no extension elements yet', () => {
    const { result } = renderUseConnectedDataType(undefined);

    act(() => result.current.setConnectedDataTypeId('model'));

    expect(createElement).toHaveBeenCalledWith('altinn:GatewayExtension', {
      connectedDataTypeId: 'model',
    });
    expect(updateElementProperties).toHaveBeenCalledWith({
      extensionElements: expect.objectContaining({ $type: 'bpmn:ExtensionElements' }),
    });
  });

  it('keeps an extension of another type instead of replacing the whole node', () => {
    const foreignExtension = { $type: 'altinn:TaskExtension' } as unknown as ModdleElement;
    const { result } = renderUseConnectedDataType([foreignExtension]);

    act(() => result.current.setConnectedDataTypeId('model'));

    expect(createElement).toHaveBeenCalledWith('bpmn:ExtensionElements', {
      values: [foreignExtension, expect.objectContaining({ $type: 'altinn:GatewayExtension' })],
    });
  });

  it('removes the value rather than writing an empty one, handing the choice back to the runtime', () => {
    const gatewayExtension = createGatewayExtension('model');
    const { result } = renderUseConnectedDataType([gatewayExtension]);

    act(() => result.current.setConnectedDataTypeId(''));

    expect(updateModdleProperties).toHaveBeenCalledWith(
      { connectedDataTypeId: undefined },
      gatewayExtension,
    );
  });

  it('writes nothing when a gateway without an extension is cleared', () => {
    const { result } = renderUseConnectedDataType(undefined);

    act(() => result.current.setConnectedDataTypeId(''));

    expect(updateElementProperties).not.toHaveBeenCalled();
    expect(updateModdleProperties).not.toHaveBeenCalled();
  });
});

const createGatewayExtension = (connectedDataTypeId: string): ModdleElement =>
  ({ $type: 'altinn:GatewayExtension', connectedDataTypeId }) as unknown as ModdleElement;

const createGatewayDetails = (extensionValues?: ModdleElement[]): BpmnDetails => ({
  ...mockBpmnDetails,
  taskType: null,
  type: BpmnTypeEnum.ExclusiveGateway,
  element: {
    ...mockBpmnDetails.element,
    businessObject: {
      extensionElements: extensionValues ? { values: extensionValues } : undefined,
    },
  },
});

const renderUseConnectedDataType = (extensionValues?: ModdleElement[]) => {
  const bpmnContextProps: Partial<BpmnContextProps> = {
    bpmnDetails: createGatewayDetails(extensionValues),
  };

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <BpmnContext.Provider value={{ ...mockBpmnContextValue, ...bpmnContextProps }}>
      {children}
    </BpmnContext.Provider>
  );

  return renderHook(() => useConnectedDataType(), { wrapper: Wrapper });
};
