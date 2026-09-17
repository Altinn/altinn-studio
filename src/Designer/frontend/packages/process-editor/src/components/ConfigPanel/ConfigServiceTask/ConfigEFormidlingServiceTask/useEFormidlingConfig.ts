import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import type { Moddle } from 'bpmn-js/lib/model/Types';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { useChecksum } from '../../../../hooks/useChecksum';
import { BpmnGuard } from '../../../../utils/bpmnGuard/BpmnGuard';
import { TaskUtils } from '../../../../utils/taskUtils';
import type { EnvironmentEntry } from '../../EnvironmentConfig';
import {
  fromEFormidlingDataTypesElements,
  fromEnvironmentConfigElements,
  toEFormidlingDataTypesElements,
  toEnvironmentConfigElements,
} from '../../EnvironmentConfig';

const eFormidlingConfigType = 'altinn:EFormidlingConfig';

/** The `<altinn:eFormidlingConfig>` children holding one text value per environment. */
export type EFormidlingTextProperty =
  | 'disabled'
  | 'receiver'
  | 'process'
  | 'standard'
  | 'typeVersion'
  | 'type'
  | 'securityLevel'
  | 'dpfShipmentType';

export type EFormidlingProperty = EFormidlingTextProperty | 'dataTypes';

export type EnvironmentConfigBinding<TValue> = {
  entries: EnvironmentEntry<TValue>[];
  onChange: (entries: EnvironmentEntry<TValue>[]) => void;
};

export type EFormidlingConfig = Record<
  EFormidlingTextProperty,
  EnvironmentConfigBinding<string>
> & {
  dataTypes: EnvironmentConfigBinding<string[]>;
};

/**
 * Reads and writes the nine environment-scoped properties of `<altinn:eFormidlingConfig>` on the
 * selected task, creating the config node when a hand-authored task lacks it.
 */
export const useEFormidlingConfig = (): EFormidlingConfig => {
  const { bpmnDetails, modelerRef } = useBpmnContext();
  const { updateChecksum: forceReRenderComponent } = useChecksum();

  const eFormidlingConfig: ModdleElement | undefined = TaskUtils.getTaskExtension(
    bpmnDetails.element,
  )?.eFormidlingConfig;

  const writeProperty = (
    property: EFormidlingProperty,
    createElements: (moddle: Moddle) => ModdleElement[],
  ): void => {
    BpmnGuard.ensureExtensionElementBusinessObject(bpmnDetails.element);
    const modeling: Modeling = modelerRef.current.get('modeling');
    const moddle: Moddle = modelerRef.current.get('moddle');
    const elements = createElements(moddle);

    if (eFormidlingConfig) {
      modeling.updateModdleProperties(bpmnDetails.element, eFormidlingConfig, {
        [property]: elements,
      });
    } else {
      const taskExtension = TaskUtils.getTaskExtension(bpmnDetails.element);
      modeling.updateModdleProperties(bpmnDetails.element, taskExtension, {
        eFormidlingConfig: moddle.create(eFormidlingConfigType, { [property]: elements }),
      });
    }
    forceReRenderComponent();
  };

  const createTextBinding = (
    property: EFormidlingTextProperty,
  ): EnvironmentConfigBinding<string> => ({
    entries: fromEnvironmentConfigElements(eFormidlingConfig?.[property]),
    onChange: (entries) =>
      writeProperty(property, (moddle) => toEnvironmentConfigElements(entries, moddle)),
  });

  return {
    disabled: createTextBinding('disabled'),
    receiver: createTextBinding('receiver'),
    process: createTextBinding('process'),
    standard: createTextBinding('standard'),
    typeVersion: createTextBinding('typeVersion'),
    type: createTextBinding('type'),
    securityLevel: createTextBinding('securityLevel'),
    dpfShipmentType: createTextBinding('dpfShipmentType'),
    dataTypes: {
      entries: fromEFormidlingDataTypesElements(eFormidlingConfig?.dataTypes),
      onChange: (entries) =>
        writeProperty('dataTypes', (moddle) => toEFormidlingDataTypesElements(entries, moddle)),
    },
  };
};
