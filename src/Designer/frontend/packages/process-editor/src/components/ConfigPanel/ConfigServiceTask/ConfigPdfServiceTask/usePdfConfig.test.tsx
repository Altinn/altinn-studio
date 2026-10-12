import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBpmnTestModeler } from '../../../../../test/createBpmnTestModeler';
import { act, renderHook } from '@testing-library/react';
import { usePdfConfig } from './usePdfConfig';

describe('usePdfConfig', () => {
  afterEach(vi.clearAllMocks);

  it('persists a filename when the imported task has no PDF config', async () => {
    const { result, saveXml } = renderPdfConfig();

    act(() => result.current.updateFilenameTextResourceKey('pdf-filename'));

    expect(result.current.storedFilenameTextResourceId).toBe('pdf-filename');
    expect(await saveXml()).toContain(
      '<altinn:filenameTextResourceKey>pdf-filename</altinn:filenameTextResourceKey>',
    );
  });

  it('saves task selections when the PDF configuration is missing', async () => {
    const { result, saveXml } = renderPdfConfig();

    act(() => result.current.updateTaskIds(['Task_1', 'Task_2']));

    const xml = await saveXml();
    expect(xml).toContain('<altinn:taskId>Task_1</altinn:taskId>');
    expect(xml).toContain('<altinn:taskId>Task_2</altinn:taskId>');
    expect(result.current.pdfConfig.autoPdfTaskIds.taskIds.map(({ value }) => value)).toEqual([
      'Task_1',
      'Task_2',
    ]);
  });

  it('preserves the other settings when writing and clearing a filename', async () => {
    const { result, saveXml } = renderPdfConfig();
    act(() => result.current.updateTaskIds(['Task_1']));
    act(() => result.current.updateFilenameTextResourceKey('pdf-filename'));
    act(() => result.current.updateFilenameTextResourceKey(''));

    const xml = await saveXml();
    expect(xml).toContain('<altinn:taskId>Task_1</altinn:taskId>');
    expect(xml).not.toContain('filenameTextResourceKey');
    expect(result.current.storedFilenameTextResourceId).toBe('');
  });

  it('clears the task selection without removing the filename', async () => {
    const { result, saveXml } = renderPdfConfig();
    act(() => result.current.updateFilenameTextResourceKey('pdf-filename'));
    act(() => result.current.updateTaskIds(['Task_1']));
    act(() => result.current.updateTaskIds([]));

    const xml = await saveXml();
    expect(xml).not.toContain('<altinn:taskId>');
    expect(xml).toContain(
      '<altinn:filenameTextResourceKey>pdf-filename</altinn:filenameTextResourceKey>',
    );
  });

  it('preserves both changes when two fields save before a render', async () => {
    const { result, saveXml } = renderPdfConfig();
    act(() => {
      result.current.updateFilenameTextResourceKey('pdf-filename');
      result.current.updateTaskIds(['Task_1']);
    });

    const xml = await saveXml();
    expect(xml).toContain('<altinn:taskId>Task_1</altinn:taskId>');
    expect(xml).toContain(
      '<altinn:filenameTextResourceKey>pdf-filename</altinn:filenameTextResourceKey>',
    );
  });
});

function renderPdfConfig() {
  const modeler = createBpmnTestModeler();
  modeler.businessObject.extensionElements = modeler.moddle.create('bpmn:ExtensionElements', {
    values: [modeler.moddle.create('altinn:TaskExtension', { taskType: 'pdf' })],
  });
  return {
    ...renderHook(() => usePdfConfig(), { wrapper: modeler.Wrapper }),
    saveXml: modeler.saveXml,
  };
}
