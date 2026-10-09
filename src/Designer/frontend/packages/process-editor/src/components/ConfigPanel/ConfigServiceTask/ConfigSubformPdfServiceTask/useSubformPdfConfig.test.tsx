import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { createBpmnTestModeler } from '../../../../../test/createBpmnTestModeler';
import { useSubformPdfConfig } from './useSubformPdfConfig';

describe('useSubformPdfConfig', () => {
  it('persists the selection and filename when an imported task has no config', async () => {
    const { result, saveXml } = renderSubformConfig();
    act(() => {
      result.current.setSubformComponentAndDataTypeIds('vehicles', 'vehicle');
      result.current.setFilenameTextResourceId('vehicle-pdf-name');
    });

    const xml = await saveXml();
    expect(xml).toContain('<altinn:subformComponentId>vehicles</altinn:subformComponentId>');
    expect(xml).toContain('<altinn:subformDataTypeId>vehicle</altinn:subformDataTypeId>');
    expect(xml).toContain(
      '<altinn:filenameTextResourceKey>vehicle-pdf-name</altinn:filenameTextResourceKey>',
    );
    expect(result.current.subformComponentId).toBe('vehicles');
    expect(result.current.subformDataTypeId).toBe('vehicle');
    expect(result.current.filenameTextResourceId).toBe('vehicle-pdf-name');
  });

  it('preserves other settings when repairing a data type and clearing the selection', async () => {
    const { result, saveXml } = renderSubformConfig();
    act(() => result.current.setSubformComponentAndDataTypeIds('vehicles', 'old-type'));
    act(() => result.current.setFilenameTextResourceId('vehicle-pdf-name'));
    act(() => result.current.setSubformDataTypeId('vehicle'));
    expect(await saveXml()).toContain(
      '<altinn:subformDataTypeId>vehicle</altinn:subformDataTypeId>',
    );

    act(() => result.current.setSubformComponentAndDataTypeIds('', ''));
    const xml = await saveXml();
    expect(xml).not.toContain('subformComponentId');
    expect(xml).not.toContain('subformDataTypeId');
    expect(xml).toContain('vehicle-pdf-name');
  });

  it('clears the filename without changing the selected subform', async () => {
    const { result, saveXml } = renderSubformConfig();
    act(() => result.current.setSubformComponentAndDataTypeIds('vehicles', 'vehicle'));
    act(() => result.current.setFilenameTextResourceId('vehicle-pdf-name'));
    act(() => result.current.setFilenameTextResourceId(''));

    const xml = await saveXml();
    expect(xml).not.toContain('filenameTextResourceKey');
    expect(xml).toContain('<altinn:subformComponentId>vehicles</altinn:subformComponentId>');
  });

  it('does not create a command for an unchanged selection', () => {
    const { result, modeling } = renderSubformConfig();
    act(() => result.current.setSubformComponentAndDataTypeIds('vehicles', 'vehicle'));
    modeling.updateModdleProperties.mockClear();
    act(() => result.current.setSubformComponentAndDataTypeIds('vehicles', 'vehicle'));
    expect(modeling.updateModdleProperties).not.toHaveBeenCalled();
  });
});

function renderSubformConfig() {
  const modeler = createBpmnTestModeler();
  modeler.businessObject.extensionElements = modeler.moddle.create('bpmn:ExtensionElements', {
    values: [modeler.moddle.create('altinn:TaskExtension', { taskType: 'subformPdf' })],
  });
  return { ...modeler, ...renderHook(() => useSubformPdfConfig(), { wrapper: modeler.Wrapper }) };
}
