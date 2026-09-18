import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { useChecksum } from '../../../../hooks/useChecksum';
import { StudioModeler } from '../../../../utils/bpmnModeler/StudioModeler';
import { TaskUtils } from '../../../../utils/taskUtils';

const RUN_DEFAULT_VALIDATOR_TYPE = 'altinn:RunDefaultValidator';
const SIGNATURE_CONFIG_TYPE = 'altinn:SignatureConfig';

export type UseRunDefaultValidatorResult = {
  runDefaultValidator: boolean;
  setRunDefaultValidator: (runDefaultValidator: boolean) => void;
};

/**
 * Reads and writes `<altinn:runDefaultValidator>` in the signing task's signature config. The runtime
 * reads it as a non-nullable bool, so an absent element is `false`.
 */
export const useRunDefaultValidator = (): UseRunDefaultValidatorResult => {
  const { bpmnDetails } = useBpmnContext();
  const { updateChecksum: forceReRenderComponent } = useChecksum();

  const taskExtension: ModdleElement | undefined = TaskUtils.getTaskExtension(bpmnDetails?.element);
  const signatureConfig: ModdleElement | undefined = taskExtension?.signatureConfig;
  const runDefaultValidator = signatureConfig?.runDefaultValidator?.value === true;

  const setRunDefaultValidator = (value: boolean): void => {
    const studioModeler = new StudioModeler(bpmnDetails.element);
    // `false` is written rather than removing the element, so the file records the choice.
    const runDefaultValidatorElement = studioModeler.createElement(RUN_DEFAULT_VALIDATOR_TYPE, {
      value,
    });

    if (signatureConfig) {
      studioModeler.updateModdleProperties(
        { runDefaultValidator: runDefaultValidatorElement },
        signatureConfig,
      );
    } else {
      studioModeler.updateModdleProperties(
        {
          signatureConfig: studioModeler.createElement(SIGNATURE_CONFIG_TYPE, {
            runDefaultValidator: runDefaultValidatorElement,
          }),
        },
        taskExtension,
      );
    }

    forceReRenderComponent();
  };

  return { runDefaultValidator, setRunDefaultValidator };
};
