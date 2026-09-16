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
 * Reads and writes `<altinn:runDefaultValidator>` inside the signing task's signature config.
 *
 * `AltinnSignatureConfiguration.RunDefaultValidator` is a non-nullable `bool`, so an absent element
 * deserialises to `false` and the validator does not run. There is no third "not set" state to
 * represent, and this hook reports the absent element as `false` for that reason.
 *
 * The moddle objects behind the config are not reactive, so a write is followed by a checksum bump
 * that re-renders whatever reads from them.
 */
export const useRunDefaultValidator = (): UseRunDefaultValidatorResult => {
  const { bpmnDetails } = useBpmnContext();
  const { updateChecksum: forceReRenderComponent } = useChecksum();

  const taskExtension: ModdleElement | undefined = TaskUtils.getTaskExtension(bpmnDetails?.element);
  const signatureConfig: ModdleElement | undefined = taskExtension?.signatureConfig;
  const runDefaultValidator = signatureConfig?.runDefaultValidator?.value === true;

  const setRunDefaultValidator = (value: boolean): void => {
    const studioModeler = new StudioModeler(bpmnDetails.element);
    // `false` is written out rather than removing the element: the two mean the same to the
    // runtime, and a value in the file says the choice was made rather than forgotten.
    const runDefaultValidatorElement = studioModeler.createElement(RUN_DEFAULT_VALIDATOR_TYPE, {
      value,
    });

    if (signatureConfig) {
      studioModeler.updateModdleProperties(
        { runDefaultValidator: runDefaultValidatorElement },
        signatureConfig,
      );
    } else {
      // A hand-authored signing task can be missing its signature config. Building it here keeps
      // the toggle working instead of failing on a task Studio itself can render.
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
