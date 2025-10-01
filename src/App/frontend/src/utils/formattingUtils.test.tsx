import React from 'react';
import type { NumericFormatProps, PatternFormatProps } from 'react-number-format';

import { render as renderRtl, screen } from '@testing-library/react';

import { formatNumber, formatNumericText } from 'src/utils/formattingUtils';
import type { CurrencyFormattingOptions, UnitFormattingOptions } from 'src/utils/formattingUtils';

const value = '12000.20';
let language = 'en';
const currencyOptions: CurrencyFormattingOptions = { style: 'currency', currency: 'NOK' };
const unitOptions: UnitFormattingOptions = { style: 'unit', unit: 'kilogram' };
let position: 'prefix' | 'suffix' | undefined = 'prefix';

describe('dynamic number formatting', () => {
  it('returns with correct number config', () => {
    const formattedNumber = { thousandSeparator: ',', decimalSeparator: '.', prefix: 'NOK ', suffix: undefined };
    expect(formattedNumber).toEqual(formatNumber(value, language, currencyOptions, position));
  });
  it('returns with correct valuta and position when norwegian and position is undefined', () => {
    language = 'nb';
    position = undefined;
    expect('kr ').toEqual(formatNumber(value, language, currencyOptions, position).prefix);
  });
  it('returns with correct unit and position when norwegian and position is undefined', () => {
    language = 'nb';
    position = undefined;
    expect(' kg').toEqual(formatNumber(value, language, unitOptions, position).suffix);
  });
  it('returns correct position for unit when app dev has config prefix position.', () => {
    position = 'prefix';
    expect('kg ').toEqual(formatNumber(value, language, unitOptions, position).prefix);
  });
  it('returns correct position for unit when app dev has config suffix position.', () => {
    position = 'suffix';
    expect(' kg').toEqual(formatNumber(value, language, unitOptions, position).suffix);
  });
  it('returns correct position for currency when app dev has config prefix position.', () => {
    language = 'en';
    position = 'prefix';
    expect('NOK ').toEqual(formatNumber(value, language, currencyOptions, position).prefix);
  });
  it('returns correct position for currency when app dev has config suffix position.', () => {
    language = 'nb';
    position = 'suffix';
    expect(' kr').toEqual(formatNumber(value, language, currencyOptions, position).suffix);
  });
});

describe('numberFormat', () => {
  it('should render as NumericFormat if format is of type NumericFormatProps', () => {
    render({
      text: '12345.6789',
      format: {
        prefix: 'NOK ',
        thousandSeparator: ' ',
        decimalSeparator: ',',
        decimalScale: 2,
      },
    });

    expect(screen.getByText('NOK 12 345,67')).toBeInTheDocument();
  });

  it('should render as PatternFormat if format is of type PatternFormatProps', () => {
    render({
      text: '98765432',
      format: {
        format: '+47 ### ## ###',
      },
    });

    expect(screen.getByText('+47 987 65 432')).toBeInTheDocument();
  });

  it('should render as plain text if format is undefined', () => {
    render({
      text: '12345.6789',
    });

    expect(screen.getByText('12345.6789')).toBeInTheDocument();
  });
});

interface FormatNumericTextProps {
  text: string;
  format?: NumericFormatProps | PatternFormatProps;
}

const render = (props: FormatNumericTextProps) => renderRtl(<span>{formatNumericText(props.text, props.format)}</span>);
