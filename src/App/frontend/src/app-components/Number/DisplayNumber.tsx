import React from 'react';
import { numericFormatter, patternFormatter } from 'react-number-format';
import type { NumericFormatProps, PatternFormatProps } from 'react-number-format';

import { useTranslation } from 'src/app-components/AppComponentsProvider';
import classes from 'src/app-components/Number/Number.module.css';
import type { TranslationKey } from 'src/app-components/types';

export type DisplayNumberProps = {
  value: number;
  formatting?: { number?: NumericFormatProps | PatternFormatProps };
  iconUrl?: string;
  iconAltText?: TranslationKey;
  labelId?: string;
};

export const DisplayNumber = ({ value, formatting, iconUrl, iconAltText, labelId }: DisplayNumberProps) => {
  const displayData = formatting?.number ? formatNumericText(value.toString(), formatting.number) : value;
  const { translate } = useTranslation();

  return (
    <>
      {iconUrl && (
        <img
          src={iconUrl}
          className={classes.icon}
          alt={iconAltText ? translate(iconAltText) : undefined}
        />
      )}
      {labelId && <span aria-labelledby={labelId}>{displayData}</span>}
      {!labelId && <span>{displayData}</span>}
    </>
  );
};

const isPatternFormat = (numberFormat: NumericFormatProps | PatternFormatProps): numberFormat is PatternFormatProps =>
  'format' in numberFormat && numberFormat.format !== undefined;

const isNumericFormat = (numberFormat: NumericFormatProps | PatternFormatProps): numberFormat is NumericFormatProps =>
  !('format' in numberFormat) || numberFormat.format === undefined;

const formatNumericText = (text: string, format?: NumericFormatProps | PatternFormatProps) => {
  if (format && isNumericFormat(format)) {
    return numericFormatter(text, format);
  } else if (format && isPatternFormat(format)) {
    return patternFormatter(text, format);
  } else {
    return text;
  }
};
