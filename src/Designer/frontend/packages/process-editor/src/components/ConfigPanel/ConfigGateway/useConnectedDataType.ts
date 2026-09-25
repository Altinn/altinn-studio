import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import type { Element, Moddle } from 'bpmn-js/lib/model/Types';
import { useBpmnContext } from '../../../contexts/BpmnContext';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';

const GATEWAY_EXTENSION_TYPE = 'altinn:GatewayExtension';

export type UseConnectedDataTypeResult = {
  connectedDataTypeId: string;
  setConnectedDataTypeId: (dataTypeId: string) => void;
};

/** Reads and writes `<altinn:gatewayExtension><altinn:connectedDataTypeId>` on the selected gateway. */
export const useConnectedDataType = (): UseConnectedDataTypeResult => {
  const { bpmnDetails, modelerRef } = useBpmnContext();

  const element = bpmnDetails.element;
  const connectedDataTypeId = getGatewayExtension(element)?.connectedDataTypeId ?? '';

  const setConnectedDataTypeId = (dataTypeId: string): void => {
    // An undefined property removes the element, handing the choice back to the runtime fallback.
    const newDataTypeId = dataTypeId || undefined;
    if (newDataTypeId === (connectedDataTypeId || undefined)) return;

    const gatewayExtension = getGatewayExtension(element);
    const modeling = modelerRef.current.get<Modeling>('modeling');
    const moddle = modelerRef.current.get<Moddle>('moddle');

    if (gatewayExtension) {
      modeling.updateModdleProperties(element, gatewayExtension, {
        connectedDataTypeId: newDataTypeId,
      });
    } else {
      const existingValues = element.businessObject.extensionElements?.values ?? [];
      modeling.updateProperties(element, {
        extensionElements: moddle.create('bpmn:ExtensionElements', {
          values: [
            ...existingValues,
            moddle.create(GATEWAY_EXTENSION_TYPE, { connectedDataTypeId: newDataTypeId }),
          ],
        }),
      });
    }
  };

  return { connectedDataTypeId, setConnectedDataTypeId };
};

const getGatewayExtension = (element: Element): ModdleElement | undefined =>
  element?.businessObject?.extensionElements?.values?.find(
    (value: ModdleElement) => value?.$type === GATEWAY_EXTENSION_TYPE,
  );
