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

/**
 * The `<altinn:eFormidlingConfig>` children holding a single text value per environment, mirroring
 * `AltinnEFormidlingConfiguration`. `dataTypes` is the ninth and holds a list instead.
 */
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

/** What one environment-scoped field reads from and writes to, in the shape its props take. */
export type EnvironmentConfigBinding<TValue> = {
  entries: EnvironmentEntry<TValue>[];
  onChange: (entries: EnvironmentEntry<TValue>[]) => void;
};

export type EFormidlingConfig = {
  disabled: EnvironmentConfigBinding<string>;
  receiver: EnvironmentConfigBinding<string>;
  process: EnvironmentConfigBinding<string>;
  standard: EnvironmentConfigBinding<string>;
  typeVersion: EnvironmentConfigBinding<string>;
  type: EnvironmentConfigBinding<string>;
  securityLevel: EnvironmentConfigBinding<string>;
  dpfShipmentType: EnvironmentConfigBinding<string>;
  dataTypes: EnvironmentConfigBinding<string[]>;
};

/**
 * Reads and writes the nine environment-scoped properties of `<altinn:eFormidlingConfig>` on the
 * selected task.
 *
 * Each property is written on its own, so a save touches the one list the user edited and leaves
 * the other eight elements exactly where they were. The palette seeds the config node, but a
 * hand-authored task can be missing it, so the first write creates it.
 *
 * The moddle objects behind the lists are not reactive, so a write is followed by a checksum bump
 * that re-renders the component reading from them.
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
  ): EnvironmentConfigBinding<string> => {
    const existingElements: ModdleElement[] | undefined = eFormidlingConfig?.[property];
    return {
      entries: fromEnvironmentConfigElements(existingElements),
      onChange: (entries) =>
        writeProperty(property, (moddle) =>
          toEnvironmentConfigElements(entries, moddle, existingElements),
        ),
    };
  };

  const existingDataTypeElements: ModdleElement[] | undefined = eFormidlingConfig?.dataTypes;

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
      entries: fromEFormidlingDataTypesElements(existingDataTypeElements),
      onChange: (entries) =>
        writeProperty('dataTypes', (moddle) =>
          toEFormidlingDataTypesElements(entries, moddle, existingDataTypeElements),
        ),
    },
  };
};
