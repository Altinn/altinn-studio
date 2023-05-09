import { useAppSelector } from 'src/hooks/useAppSelector';
import { appLanguageStateSelector } from 'src/selectors/appLanguageStateSelector';
import { formatNumber } from 'src/utils/formattingUtils';
import type { IInputFormatting } from 'src/layout/layout';
import type { CurrencyFormattingOptions, UnitFormattingOptions } from 'src/utils/formattingUtils';

export const useMapToReactNumberConfig = (formatting: IInputFormatting, value = ''): IInputFormatting => {
  const appLanguage = useAppSelector(appLanguageStateSelector);

  if (!formatting?.currency && !formatting?.unit) {
    return formatting;
  }

  const createOptions = (config: IInputFormatting) => {
    if (config.currency) {
      return { style: 'currency', currency: config.currency.valuta } as CurrencyFormattingOptions;
    }
    if (config.unit) {
      return { style: 'unit', unit: config.unit.unitType } as UnitFormattingOptions;
    }
    return undefined;
  };
  // Check if position has been configured in dynamic formatting. Either prefix or suffix of currency/unit
  const position: string | undefined = formatting?.currency?.position || formatting?.unit?.position || undefined;

  const numberFormatResult = {
    ...formatNumber(value, appLanguage, createOptions(formatting), position),
    ...formatting.number,
  };

  return { ...formatting, number: numberFormatResult };
};
