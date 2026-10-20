import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import type { Moddle } from 'bpmn-js/lib/model/Types';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { BpmnGuard } from '../../../../utils/bpmnGuard/BpmnGuard';
import { TaskUtils } from '../../../../utils/taskUtils';
import type { EnvironmentEntry } from '../../EnvironmentConfig';
import {
  fromEnvironmentConfigElements,
  toEnvironmentConfigElements,
} from '../../EnvironmentConfig';
import {
  fromEFormidlingDataTypesElements,
  toEFormidlingDataTypesElements,
} from './eFormidlingConfigModdleUtils';

const eFormidlingConfigType = 'altinn:EFormidlingConfig';

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

/** Imported tasks can omit eFormidlingConfig. */
export const useEFormidlingConfig = (): EFormidlingConfig => {
  const { bpmnDetails, modelerRef } = useBpmnContext();

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

    const taskExtension = TaskUtils.getTaskExtension(bpmnDetails.element);
    if (taskExtension.eFormidlingConfig) {
      modeling.updateModdleProperties(bpmnDetails.element, taskExtension.eFormidlingConfig, {
        [property]: elements,
      });
    } else {
      modeling.updateModdleProperties(bpmnDetails.element, taskExtension, {
        eFormidlingConfig: moddle.create(eFormidlingConfigType, { [property]: elements }),
      });
    }
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
