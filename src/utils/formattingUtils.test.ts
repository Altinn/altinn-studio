import { formatNumber } from 'src/utils/formattingUtils';
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
