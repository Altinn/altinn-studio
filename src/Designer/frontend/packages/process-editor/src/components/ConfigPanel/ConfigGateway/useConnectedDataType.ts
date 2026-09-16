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

/**
 * Reads and writes `<altinn:gatewayExtension><altinn:connectedDataTypeId>` on the selected gateway.
 *
 * The extension sits directly under the gateway's `bpmn:extensionElements`, as a sibling of where a
 * task's `altinn:taskExtension` would be. The moddle objects behind it are not reactive, so a write
 * is followed by a checksum bump that re-renders whatever reads from them.
 */
export const useConnectedDataType = (): UseConnectedDataTypeResult => {
  const { bpmnDetails } = useBpmnContext();
  const { updateChecksum: forceReRenderComponent } = useChecksum();

  const element = bpmnDetails.element;
  const connectedDataTypeId = getGatewayExtension(element)?.connectedDataTypeId ?? '';

  const setConnectedDataTypeId = (dataTypeId: string): void => {
    // Moddle omits a property that is undefined, which is what removes the element from the xml
    // again and hands the choice of data model back to the runtime's own fallback.
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

/**
 * A gateway drawn in Studio carries no extension elements at all until something needs one, so the
 * first write has to build the whole node. Anything the element already carries is kept, and the
 * gateway extension is appended rather than put first, since nothing reads a gateway's extensions
 * by position.
 */
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
