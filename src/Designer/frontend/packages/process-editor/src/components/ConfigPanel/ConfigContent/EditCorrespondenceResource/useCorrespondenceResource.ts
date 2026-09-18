import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import type { Moddle } from 'bpmn-js/lib/model/Types';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { useChecksum } from '../../../../hooks/useChecksum';
import { BpmnGuard } from '../../../../utils/bpmnGuard/BpmnGuard';
import { TaskUtils } from '../../../../utils/taskUtils';
import type { EnvironmentEntry } from '../../EnvironmentConfig';
import {
  fromEnvironmentConfigElements,
  toEnvironmentConfigElements,
} from '../../EnvironmentConfig';

export type CorrespondenceResource = {
  entries: EnvironmentEntry<string>[];
  updateEntries: (entries: EnvironmentEntry<string>[]) => void;
};

/** Reads and writes the environment-scoped `correspondenceResource` list of a signing task. */
export const useCorrespondenceResource = (): CorrespondenceResource => {
  const { bpmnDetails, modelerRef } = useBpmnContext();
  const { updateChecksum: forceReRenderComponent } = useChecksum();

  const signatureConfig = TaskUtils.getTaskExtension(bpmnDetails.element)?.signatureConfig;

  const updateEntries = (entries: EnvironmentEntry<string>[]): void => {
    BpmnGuard.ensureHasSignatureConfig(bpmnDetails.element);
    const modeling: Modeling = modelerRef.current.get('modeling');
    const moddle: Moddle = modelerRef.current.get('moddle');

    modeling.updateModdleProperties(bpmnDetails.element, signatureConfig, {
      correspondenceResource: toEnvironmentConfigElements(entries, moddle),
    });
    forceReRenderComponent();
  };

  return {
    entries: fromEnvironmentConfigElements(signatureConfig?.correspondenceResource),
    updateEntries,
  };
};
