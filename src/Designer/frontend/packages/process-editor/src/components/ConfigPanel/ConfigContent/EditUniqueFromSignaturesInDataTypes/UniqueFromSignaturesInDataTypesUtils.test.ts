import BpmnModdle from 'bpmn-moddle';
import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import type BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory';
import { altinnCustomTasks } from '../../../../extensions/altinnCustomTasks';
import { mockBpmnDetails } from '../../../../../test/mocks/bpmnDetailsMock';
import { updateDataTypes } from './UniqueFromSignaturesInDataTypesUtils';

it('saves signing constraints without changing the previous selection or other signature settings', async () => {
  const moddle = new BpmnModdle({ altinn: altinnCustomTasks });
  const previousSelection = moddle.create('altinn:UniqueFromSignaturesInDataTypes', {
    dataTypes: [moddle.create('altinn:DataType', { dataType: 'old-signatures' })],
  });
  const signatureConfig: ModdleElement = moddle.create('altinn:SignatureConfig', {
    uniqueFromSignaturesInDataTypes: previousSelection,
    signatureDataType: 'signatures',
  });
  const businessObject = moddle.create('bpmn:Task', {
    id: 'SigningTask',
    extensionElements: moddle.create('bpmn:ExtensionElements', {
      values: [moddle.create('altinn:TaskExtension', { taskType: 'signing', signatureConfig })],
    }),
  });
  const modeling = {
    updateModdleProperties: (_element, target, properties) => {
      Object.entries(properties).forEach(([key, value]) => target.set(key, value));
    },
  } as Modeling;

  updateDataTypes(
    moddle as unknown as BpmnFactory,
    modeling,
    { ...mockBpmnDetails, element: { ...mockBpmnDetails.element, businessObject } },
    ['new-signatures'],
  );

  const { xml } = await moddle.toXML(businessObject);
  expect(xml).toContain('<altinn:dataType>new-signatures</altinn:dataType>');
  expect(xml).not.toContain('old-signatures');
  expect(xml).toContain('<altinn:signatureDataType>signatures</altinn:signatureDataType>');
  expect((await moddle.toXML(previousSelection)).xml).toContain('old-signatures');
});
