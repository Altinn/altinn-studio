import React from 'react';
import { act, renderHook } from '@testing-library/react';
import BpmnModdle from 'bpmn-moddle';
import { usePdfConfig } from './usePdfConfig';
import { BpmnContext } from '../../../../contexts/BpmnContext';
import { BpmnModelerInstance } from '../../../../utils/bpmnModeler/BpmnModelerInstance';
import { altinnCustomTasks } from '../../../../extensions/altinnCustomTasks';
import { mockBpmnDetails } from '../../../../../test/mocks/bpmnDetailsMock';

jest.mock('../../../../utils/bpmnModeler/BpmnModelerInstance');

describe('usePdfConfig', () => {
  afterEach(jest.clearAllMocks);

  it('persists a filename when the imported task has no PDF config', async () => {
    const { result, saveXml } = renderPdfConfig();

    act(() => result.current.updateFilenameTextResourceKey('pdf-filename'));

    expect(result.current.storedFilenameTextResourceId).toBe('pdf-filename');
    expect(await saveXml()).toContain(
      '<altinn:filenameTextResourceKey>pdf-filename</altinn:filenameTextResourceKey>',
    );
  });

  it('persists task selections immediately when the imported task has no PDF config', async () => {
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

  it('does not overwrite the config when two fields commit before a render', async () => {
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
  const moddle = new BpmnModdle({ altinn: altinnCustomTasks });
  const businessObject = moddle.create('bpmn:ServiceTask', {
    id: 'PdfTask',
    extensionElements: moddle.create('bpmn:ExtensionElements', {
      values: [moddle.create('altinn:TaskExtension', { taskType: 'pdf' })],
    }),
  });
  const element = { ...mockBpmnDetails.element, id: 'PdfTask', businessObject };
  const services = {
    moddle,
    elementRegistry: { get: () => element },
    modeling: {
      // Keep the real moddle tree and serializer; only replace the command stack.
      updateModdleProperties: (_element, target, properties) => {
        Object.entries(properties).forEach(([key, value]) => target.set(key, value));
      },
    },
  };
  jest.mocked(BpmnModelerInstance.getInstance).mockReturnValue({
    get: (service: string) => services[service],
  } as ReturnType<typeof BpmnModelerInstance.getInstance>);

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BpmnContext.Provider value={{ bpmnDetails: { ...mockBpmnDetails, element } }}>
      {children}
    </BpmnContext.Provider>
  );
  return {
    ...renderHook(() => usePdfConfig(), { wrapper }),
    saveXml: async (): Promise<string> => (await moddle.toXML(businessObject)).xml,
  };
}
