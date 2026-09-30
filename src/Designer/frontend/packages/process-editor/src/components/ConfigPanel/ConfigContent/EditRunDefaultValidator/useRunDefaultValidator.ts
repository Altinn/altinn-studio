import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import type { Moddle } from 'bpmn-js/lib/model/Types';
import { TaskUtils } from '../../../../utils/taskUtils';

const RUN_DEFAULT_VALIDATOR_TYPE = 'altinn:RunDefaultValidator';
const SIGNATURE_CONFIG_TYPE = 'altinn:SignatureConfig';

export type UseRunDefaultValidatorResult = {
  runDefaultValidator: boolean;
  setRunDefaultValidator: (runDefaultValidator: boolean) => void;
};

export const useRunDefaultValidator = (): UseRunDefaultValidatorResult => {
  const { bpmnDetails, modelerRef } = useBpmnContext();

  const taskExtension: ModdleElement | undefined = TaskUtils.getTaskExtension(bpmnDetails?.element);
  const signatureConfig: ModdleElement | undefined = taskExtension?.signatureConfig;
  const runDefaultValidator = signatureConfig?.runDefaultValidator?.value === true;

  const setRunDefaultValidator = (value: boolean): void => {
    const modeling = modelerRef.current.get<Modeling>('modeling');
    const moddle = modelerRef.current.get<Moddle>('moddle');
    // Write false explicitly to record the choice in the BPMN.
    const runDefaultValidatorElement = moddle.create(RUN_DEFAULT_VALIDATOR_TYPE, {
      value,
    });

    if (signatureConfig) {
      modeling.updateModdleProperties(bpmnDetails.element, signatureConfig, {
        runDefaultValidator: runDefaultValidatorElement,
      });
    } else {
      modeling.updateModdleProperties(bpmnDetails.element, taskExtension, {
        signatureConfig: moddle.create(SIGNATURE_CONFIG_TYPE, {
          runDefaultValidator: runDefaultValidatorElement,
        }),
      });
    }
  };

  return { runDefaultValidator, setRunDefaultValidator };
};
