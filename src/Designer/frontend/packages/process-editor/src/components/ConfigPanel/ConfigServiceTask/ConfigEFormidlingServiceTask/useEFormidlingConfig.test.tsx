import { act, renderHook } from '@testing-library/react';
import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import { createBpmnTestModeler } from '../../../../../test/createBpmnTestModeler';
import { useEFormidlingConfig } from './useEFormidlingConfig';

describe('useEFormidlingConfig', () => {
  it('creates configuration and saves both scalar values and data type lists', async () => {
    const { result, saveXml } = renderEFormidlingConfig();
    act(() => {
      result.current.process.onChange([{ value: 'archive', env: 'tt02' }]);
      result.current.dataTypes.onChange([{ value: ['model', 'attachment'] }]);
    });

    const xml = await saveXml();
    expect(xml).toContain('<altinn:process env="tt02">archive</altinn:process>');
    expect(xml).toContain('<altinn:dataType>model</altinn:dataType>');
    expect(xml).toContain('<altinn:dataType>attachment</altinn:dataType>');
    expect(result.current.process.entries).toEqual([{ env: 'tt02', value: 'archive' }]);
    expect(result.current.dataTypes.entries[0].value).toEqual(['model', 'attachment']);
  });

  it('preserves other environments and settings when changing a field', async () => {
    const { result, saveXml, taskExtension } = renderEFormidlingConfig();
    act(() =>
      result.current.type.onChange([{ env: 'at21', value: 'imported' }, { value: 'global' }]),
    );
    act(() => result.current.process.onChange([{ value: 'archive' }]));
    const previousEntries = taskExtension.eFormidlingConfig.type;
    act(() =>
      result.current.type.onChange([{ env: 'at21', value: 'imported' }, { value: 'updated' }]),
    );
    expect(previousEntries[1].value).toBe('global');
    expect(await saveXml()).toContain('<altinn:type env="at21">imported</altinn:type>');

    act(() => result.current.process.onChange([]));
    const xml = await saveXml();
    expect(xml).not.toContain('<altinn:process');
    expect(xml).toContain('<altinn:type>updated</altinn:type>');
    expect(xml).toContain('<altinn:type env="at21">imported</altinn:type>');
  });
});

function renderEFormidlingConfig() {
  const modeler = createBpmnTestModeler();
  const taskExtension: ModdleElement = modeler.moddle.create('altinn:TaskExtension', {
    taskType: 'eFormidling',
  });
  modeler.businessObject.extensionElements = modeler.moddle.create('bpmn:ExtensionElements', {
    values: [taskExtension],
  });
  return {
    ...modeler,
    taskExtension,
    ...renderHook(() => useEFormidlingConfig(), { wrapper: modeler.Wrapper }),
  };
}
