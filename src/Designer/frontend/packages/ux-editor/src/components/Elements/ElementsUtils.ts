import type { ConfPageType } from './types/ConfigPageType';
import type { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import type { ComponentPreset } from '@altinn/ux-editor/types/ComponentPreset';
import type { FormItemConfigEntry } from '../../data/formItemConfig';
import {
  confOnScreenComponents,
  paymentLayoutComponents,
  subformLayoutComponents,
} from '../../data/formItemConfig';

type GetConfigurationModeArgs = {
  selectedLayoutIsCustomReceipt: boolean;
  processTaskType?: string;
  selectedLayoutSetType?: string;
};

export class ElementsUtils {
  public static getConfigurationMode({
    selectedLayoutIsCustomReceipt,
    selectedLayoutSetType,
    processTaskType,
  }: GetConfigurationModeArgs): ConfPageType | undefined {
    if (selectedLayoutIsCustomReceipt) {
      return 'receipt';
    }

    if (processTaskType === 'payment') {
      return 'payment';
    }

    if (selectedLayoutSetType === 'subform') {
      return 'subform';
    }

    return undefined;
  }

  public static getAvailableComponentList(confPageType: ConfPageType): FormItemConfigEntry[] {
    switch (confPageType) {
      case 'receipt':
        return confOnScreenComponents;
      case 'payment':
        return paymentLayoutComponents;
      case 'subform':
        return subformLayoutComponents;
      default:
        return [];
    }
  }

  public static getAllowedComponentTypes(
    confPageType: ConfPageType | undefined,
  ): Array<ComponentType | ComponentPreset> | undefined {
    if (!confPageType) return undefined;
    return ElementsUtils.getAvailableComponentList(confPageType).map((component) => component.name);
  }
}
