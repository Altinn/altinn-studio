import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import type { Element } from 'bpmn-js/lib/model/Types';
import { useBpmnContext } from '../../../contexts/BpmnContext';
import { useChecksum } from '../../../hooks/useChecksum';
import { StudioModeler } from '../../../utils/bpmnModeler/StudioModeler';

const GATEWAY_EXTENSION_TYPE = 'altinn:GatewayExtension';

export type UseConnectedDataTypeResult = {
  connectedDataTypeId: string;
  setConnectedDataTypeId: (dataTypeId: string) => void;
};

/** Reads and writes `<altinn:gatewayExtension><altinn:connectedDataTypeId>` on the selected gateway. */
export const useConnectedDataType = (): UseConnectedDataTypeResult => {
  const { bpmnDetails } = useBpmnContext();
  const { updateChecksum: forceReRenderComponent } = useChecksum();

  const element = bpmnDetails.element;
  const connectedDataTypeId = getGatewayExtension(element)?.connectedDataTypeId ?? '';

  const setConnectedDataTypeId = (dataTypeId: string): void => {
    // An undefined property removes the element, handing the choice back to the runtime fallback.
    const newDataTypeId = dataTypeId || undefined;
    if (newDataTypeId === (connectedDataTypeId || undefined)) return;

    const gatewayExtension = getGatewayExtension(element);
    const studioModeler = new StudioModeler(element);

    if (gatewayExtension) {
      studioModeler.updateModdleProperties(
        { connectedDataTypeId: newDataTypeId },
        gatewayExtension,
      );
    } else {
      addGatewayExtension(studioModeler, element, newDataTypeId);
    }

    forceReRenderComponent();
  };

  return { connectedDataTypeId, setConnectedDataTypeId };
};

const getGatewayExtension = (element: Element): ModdleElement | undefined =>
  element?.businessObject?.extensionElements?.values?.find(
    (value: ModdleElement) => value?.$type === GATEWAY_EXTENSION_TYPE,
  );

/** A gateway carries no extension elements until something needs one; other extensions are kept. */
const addGatewayExtension = (
  studioModeler: StudioModeler,
  element: Element,
  connectedDataTypeId: string,
): void => {
  const existingValues: ModdleElement[] =
    element?.businessObject?.extensionElements?.values?.filter(Boolean) ?? [];

  studioModeler.updateElementProperties({
    extensionElements: studioModeler.createElement('bpmn:ExtensionElements', {
      values: [
        ...existingValues,
        studioModeler.createElement(GATEWAY_EXTENSION_TYPE, { connectedDataTypeId }),
      ],
    }),
  });
};
