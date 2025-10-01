import type { NumericFormatProps, PatternFormatProps } from 'react-number-format';

import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useMemoDeepEqual } from 'src/hooks/useStateDeepEqual';
import { formatNumber } from 'src/utils/formattingUtils';
import type { CompInternal } from 'src/layout/layout';
import type { CurrencyFormattingOptions, UnitFormattingOptions } from 'src/utils/formattingUtils';

type Formatting = Exclude<CompInternal<'Input'>['formatting'], undefined>;

interface Output {
  number?: NumericFormatProps | PatternFormatProps;
}

export const useMapToReactNumberConfig = (formatting: Formatting | undefined, value = '') => {
  const selectedLanguage = useCurrentLanguage();
  return useMemoDeepEqual(
    () => getMapToReactNumberConfig(formatting, value, selectedLanguage),
    [formatting, value, selectedLanguage],
  );
};

export const getMapToReactNumberConfig = (
  formatting: Formatting | undefined,
  value = '',
  selectedLanguage: string,
): Output => {
  if (!formatting?.currency && !formatting?.unit) {
    return formatting ?? {};
  }

  const createOptions = (config: Formatting) => {
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
