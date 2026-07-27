import type { ConfPageType } from './types/ConfigPageType';
import type { ComponentType, CustomComponentType } from 'app-shared/types/ComponentType';
import type { FormItemConfigs } from '../../data/formItemConfig';
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

  public static getAvailableComponentList(
    confPageType: ConfPageType,
  ): FormItemConfigs[ComponentType][] {
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
  ): Array<ComponentType | CustomComponentType> | undefined {
    if (!confPageType) return undefined;
    return ElementsUtils.getAvailableComponentList(confPageType).map((component) => component.name);
  }
}
