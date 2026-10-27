import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { createBpmnTestModeler } from '../../../../../test/createBpmnTestModeler';
import { useSubformPdfConfig } from './useSubformPdfConfig';

describe('useSubformPdfConfig', () => {
  it('persists the UI folder and filename when an imported task has no config', async () => {
    const { result, saveXml } = renderSubformConfig();
    act(() => {
      result.current.setSubformUiFolder('vehicleSubform');
      result.current.setFilenameTextResourceId('vehicle-pdf-name');
    });

    const xml = await saveXml();
    expect(xml).toContain('<altinn:subformUiFolder>vehicleSubform</altinn:subformUiFolder>');
    expect(xml).toContain(
      '<altinn:filenameTextResourceKey>vehicle-pdf-name</altinn:filenameTextResourceKey>',
    );
    expect(result.current.subformUiFolder).toBe('vehicleSubform');
    expect(result.current.filenameTextResourceId).toBe('vehicle-pdf-name');
  });

  it('removes the settings that the UI folder replaces', async () => {
    const { result, saveXml } = renderSubformConfig({
      subformComponentId: 'vehicles',
      subformDataTypeId: 'vehicle',
    });

    act(() => result.current.setSubformUiFolder('vehicleSubform'));

    const xml = await saveXml();
    expect(xml).toContain('<altinn:subformUiFolder>vehicleSubform</altinn:subformUiFolder>');
    expect(xml).not.toContain('subformComponentId');
    expect(xml).not.toContain('subformDataTypeId');
  });

  it('clears the UI folder without changing the filename', async () => {
    const { result, saveXml } = renderSubformConfig();
    act(() => result.current.setSubformUiFolder('vehicleSubform'));
    act(() => result.current.setFilenameTextResourceId('vehicle-pdf-name'));
    act(() => result.current.setSubformUiFolder(''));

    const xml = await saveXml();
    expect(xml).not.toContain('subformUiFolder');
    expect(xml).toContain('vehicle-pdf-name');
  });

  it('clears the filename without changing the UI folder', async () => {
    const { result, saveXml } = renderSubformConfig();
    act(() => result.current.setSubformUiFolder('vehicleSubform'));
    act(() => result.current.setFilenameTextResourceId('vehicle-pdf-name'));
    act(() => result.current.setFilenameTextResourceId(''));

    const xml = await saveXml();
    expect(xml).not.toContain('filenameTextResourceKey');
    expect(xml).toContain('<altinn:subformUiFolder>vehicleSubform</altinn:subformUiFolder>');
  });

  it('does not create a command for an unchanged UI folder', () => {
    const { result, modeling } = renderSubformConfig();
    act(() => result.current.setSubformUiFolder('vehicleSubform'));
    modeling.updateModdleProperties.mockClear();
    act(() => result.current.setSubformUiFolder('vehicleSubform'));
    expect(modeling.updateModdleProperties).not.toHaveBeenCalled();
  });
});

function renderSubformConfig(subformPdfConfig?: object) {
  const modeler = createBpmnTestModeler();
  modeler.businessObject.extensionElements = modeler.moddle.create('bpmn:ExtensionElements', {
    values: [
      modeler.moddle.create('altinn:TaskExtension', {
        taskType: 'subformPdf',
        subformPdfConfig:
          subformPdfConfig && modeler.moddle.create('altinn:SubformPdfConfig', subformPdfConfig),
      }),
    ],
  });
  return { ...modeler, ...renderHook(() => useSubformPdfConfig(), { wrapper: modeler.Wrapper }) };
}
