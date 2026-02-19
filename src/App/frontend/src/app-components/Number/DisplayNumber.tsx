import React from 'react';
import { numericFormatter, patternFormatter } from 'react-number-format';
import type { NumericFormatProps, PatternFormatProps } from 'react-number-format';

import classes from 'src/app-components/Number/Number.module.css';

export type DisplayNumberProps = {
  value: number;
  formatting?: { number?: NumericFormatProps | PatternFormatProps };
  iconUrl?: string;
  iconAltText?: string;
  labelId?: string;
};

export const DisplayNumber = ({ value, formatting, iconUrl, iconAltText, labelId }: DisplayNumberProps) => {
  const displayData = formatting?.number ? formatNumericText(value.toString(), formatting.number) : value;

  return (
    <>
      {iconUrl && (
        <img
          src={iconUrl}
          className={classes.icon}
          alt={iconAltText}
        />
      )}
      {labelId && <span aria-labelledby={labelId}>{displayData}</span>}
      {!labelId && <span>{displayData}</span>}
    </>
  );
};

const isPatternFormat = (numberFormat: NumericFormatProps | PatternFormatProps): numberFormat is PatternFormatProps =>
  (numberFormat as PatternFormatProps).format !== undefined;

const isNumericFormat = (numberFormat: NumericFormatProps | PatternFormatProps): numberFormat is NumericFormatProps =>
  (numberFormat as PatternFormatProps).format === undefined;

const formatNumericText = (text: string, format?: NumericFormatProps | PatternFormatProps) => {
  if (format && isNumericFormat(format)) {
    return numericFormatter(text, format);
  } else if (format && isPatternFormat(format)) {
    return patternFormatter(text, format);
  } else {
    return text;
  }
};
