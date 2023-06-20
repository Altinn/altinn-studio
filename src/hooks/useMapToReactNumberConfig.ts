import { useLanguage } from 'src/hooks/useLanguage';
import { formatNumber } from 'src/utils/formattingUtils';
import type { IInputFormatting } from 'src/layout/layout';
import type { CurrencyFormattingOptions, UnitFormattingOptions } from 'src/utils/formattingUtils';

export const useMapToReactNumberConfig = (formatting: IInputFormatting, value = ''): IInputFormatting => {
  const { selectedLanguage } = useLanguage();

  if (!formatting?.currency && !formatting?.unit) {
    return formatting;
  }

  const createOptions = (config: IInputFormatting) => {
    if (config.currency) {
      return { style: 'currency', currency: config.currency } as CurrencyFormattingOptions;
    }
    if (config.unit) {
      return { style: 'unit', unit: config.unit } as UnitFormattingOptions;
    }
    return undefined;
  };
  // Check if position has been configured in dynamic formatting. Either prefix or suffix
  const position = formatting?.position || undefined;

  const numberFormatResult = {
    ...formatNumber(value, selectedLanguage, createOptions(formatting), position),
    ...formatting.number,
  };

  return { ...formatting, number: numberFormatResult };
};
