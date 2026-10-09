import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { createBpmnTestModeler } from '../../../../test/createBpmnTestModeler';
import { useConnectedDataType } from './useConnectedDataType';

describe('useConnectedDataType', () => {
  it('creates the gateway extension when selecting a data type and removes the value when cleared', async () => {
    const { result, saveXml } = renderConnectedDataType();
    act(() => result.current.setConnectedDataTypeId('model'));
    expect(await saveXml()).toContain(
      '<altinn:connectedDataTypeId>model</altinn:connectedDataTypeId>',
    );
    expect(result.current.connectedDataTypeId).toBe('model');

    act(() => result.current.setConnectedDataTypeId(''));
    expect(await saveXml()).not.toContain('connectedDataTypeId');
    expect(result.current.connectedDataTypeId).toBe('');
  });

  it('keeps other extensions when creating the gateway extension', async () => {
    const { result, saveXml } = renderConnectedDataType(true);
    act(() => result.current.setConnectedDataTypeId('model'));
    const xml = await saveXml();
    expect(xml).toContain('<altinn:taskType>custom</altinn:taskType>');
    expect(xml).toContain('<altinn:connectedDataTypeId>model</altinn:connectedDataTypeId>');
  });

  it('does not create a command when the chosen data type is unchanged', () => {
    const { result, modeling } = renderConnectedDataType();
    act(() => result.current.setConnectedDataTypeId('model'));
    modeling.updateModdleProperties.mockClear();
    act(() => result.current.setConnectedDataTypeId('model'));
    expect(modeling.updateModdleProperties).not.toHaveBeenCalled();
  });
});

function renderConnectedDataType(withOtherExtension = false) {
  const modeler = createBpmnTestModeler('bpmn:ExclusiveGateway');
  if (withOtherExtension) {
    modeler.businessObject.extensionElements = modeler.moddle.create('bpmn:ExtensionElements', {
      values: [modeler.moddle.create('altinn:TaskExtension', { taskType: 'custom' })],
    });
  }
  return { ...modeler, ...renderHook(() => useConnectedDataType(), { wrapper: modeler.Wrapper }) };
}
