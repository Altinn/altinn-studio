import type { ConfPageType } from './types/ConfigPageType';

type GetConfigurationModeArgs = {
  selectedLayoutIsCustomReceipt: boolean;
  processTaskType: string;
  selectedLayoutSetType: string;
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
}
