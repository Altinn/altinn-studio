import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import BpmnModdle from 'bpmn-moddle';
import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import type Modeler from 'bpmn-js/lib/Modeler';
import { BpmnContext } from '../../contexts/BpmnContext';
import { altinnCustomTasks } from '../../extensions/altinnCustomTasks';
import { mockBpmnDetails } from '../../../test/mocks/bpmnDetailsMock';
import { useUpdateDataTypesToSign } from './useUpdateDataTypesToSign';

describe('useUpdateDataTypesToSign', () => {
  it('persists the selection even when the selector is closed immediately', async () => {
    const { result, unmount, saveXml } = renderUpdateDataTypesToSign();

    act(() => result.current(['model', 'attachment']));
    unmount();

    const xml = await saveXml();
    expect(xml).toContain('<altinn:dataType>model</altinn:dataType>');
    expect(xml).toContain('<altinn:dataType>attachment</altinn:dataType>');
    expect(xml).toContain('<altinn:signatureDataType>signatures</altinn:signatureDataType>');
  });

  it('leaves the previous selection intact for undo when replacing or clearing it', async () => {
    const { result, taskExtension, saveXml } = renderUpdateDataTypesToSign();
    act(() => result.current(['model']));
    const previousSelection = taskExtension.signatureConfig.dataTypesToSign;

    act(() => result.current([]));

    expect(previousSelection.dataTypes.map(({ dataType }) => dataType)).toEqual(['model']);
    expect(await saveXml()).not.toContain('<altinn:dataType>');
    expect(await saveXml()).toContain(
      '<altinn:signatureDataType>signatures</altinn:signatureDataType>',
    );
  });

  it('adds a signature config when it is absent from an imported task', async () => {
    const { result, saveXml } = renderUpdateDataTypesToSign(false);

    act(() => result.current(['model']));

    expect(await saveXml()).toContain('<altinn:dataType>model</altinn:dataType>');
  });
});

function renderUpdateDataTypesToSign(withSignatureConfig = true) {
  const moddle = new BpmnModdle({ altinn: altinnCustomTasks });
  const taskExtension: ModdleElement = moddle.create('altinn:TaskExtension', {
    taskType: 'signing',
    signatureConfig: withSignatureConfig
      ? moddle.create('altinn:SignatureConfig', { signatureDataType: 'signatures' })
      : undefined,
  });
  const businessObject = moddle.create('bpmn:Task', {
    id: 'SigningTask',
    extensionElements: moddle.create('bpmn:ExtensionElements', { values: [taskExtension] }),
  });
  const element = { ...mockBpmnDetails.element, businessObject };
  const services = {
    bpmnFactory: moddle,
    modeling: {
      updateModdleProperties: (_element, target, properties) => {
        Object.entries(properties).forEach(([key, value]) => target.set(key, value));
      },
    },
  };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <BpmnContext.Provider
      value={{
        bpmnDetails: { ...mockBpmnDetails, element },
        modelerRef: { current: { get: (service: string) => services[service] } as Modeler },
      }}
    >
      {children}
    </BpmnContext.Provider>
  );
  return {
    ...renderHook(() => useUpdateDataTypesToSign(), { wrapper }),
    taskExtension,
    saveXml: async (): Promise<string> => (await moddle.toXML(businessObject)).xml,
  };
}
