import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import type { Moddle } from 'bpmn-js/lib/model/Types';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { useChecksum } from '../../../../hooks/useChecksum';
import { BpmnGuard } from '../../../../utils/bpmnGuard/BpmnGuard';
import type { EnvironmentEntry } from '../../EnvironmentConfig';
import {
  fromEnvironmentConfigElements,
  toEnvironmentConfigElements,
} from '../../EnvironmentConfig';

export type CorrespondenceResource = {
  entries: EnvironmentEntry<string>[];
  updateEntries: (entries: EnvironmentEntry<string>[]) => void;
};

/**
 * Reads and writes the whole `correspondenceResource` list, including the environment-scoped
 * entries.
 *
 * The moddle objects behind the list are not reactive, so a write is followed by a checksum bump
 * that re-renders the component reading from them.
 */
export const useCorrespondenceResource = (): CorrespondenceResource => {
  const { bpmnDetails, modelerRef } = useBpmnContext();
  const { updateChecksum: forceReRenderComponent } = useChecksum();

  const correspondenceResources: ModdleElement[] | undefined =
    bpmnDetails.element.businessObject.extensionElements?.values[0]?.signatureConfig
      ?.correspondenceResource;

  const updateEntries = (entries: EnvironmentEntry<string>[]): void => {
    BpmnGuard.ensureHasSignatureConfig(bpmnDetails.element);
    const modeling: Modeling = modelerRef.current.get('modeling');
    const moddle: Moddle = modelerRef.current.get('moddle');
    const signatureConfig =
      bpmnDetails.element.businessObject.extensionElements.values[0].signatureConfig;

    modeling.updateModdleProperties(bpmnDetails.element, signatureConfig, {
      correspondenceResource: toEnvironmentConfigElements(entries, moddle, correspondenceResources),
    });
    forceReRenderComponent();
  };

  return { entries: fromEnvironmentConfigElements(correspondenceResources), updateEntries };
};
