import { TZDate } from '@date-fns/tz';

import { getLanguageFromCode } from 'src/language/languages';
import type { FixedLanguageList } from 'src/language/languages';

const UNICODE_TOKENS = /[^a-zA-Z0-9]+/g;
type Separator = string | undefined;
export type Token = keyof typeof tokenOptions;

interface ExtraOptions {
  numeric: boolean;
}

const tokenOptions = {
  G: { era: 'short', numeric: false },
  GG: { era: 'short', numeric: false },
  GGG: { era: 'short', numeric: false },
  GGGG: { era: 'long', numeric: false },
  GGGGG: { era: 'narrow', numeric: false },
  y: { year: 'numeric', numeric: true },
  yy: { year: '2-digit', numeric: true },
  yyy: { year: 'numeric', numeric: true },
  yyyy: { year: 'numeric', numeric: true },
  u: { year: 'numeric', numeric: true },
  uu: { year: 'numeric', numeric: true },
  uuu: { year: 'numeric', numeric: true },
  uuuu: { year: 'numeric', numeric: true },
  M: { month: 'numeric', numeric: true },
  MM: { month: '2-digit', numeric: true },
  MMM: { month: 'short', numeric: false },
  MMMM: { month: 'long', numeric: false },
  MMMMM: { month: 'narrow', numeric: false },
  d: { day: 'numeric', numeric: true },
  dd: { day: '2-digit', numeric: true },
  E: { weekday: 'short', numeric: false },
  EE: { weekday: 'short', numeric: false },
  EEE: { weekday: 'short', numeric: false },
  EEEE: { weekday: 'long', numeric: false },
  EEEEE: { weekday: 'narrow', numeric: false },
  a: { hour12: true, hour: '2-digit', numeric: false },
  h: { hour: 'numeric', hourCycle: 'h12', numeric: true },
  hh: { hour: '2-digit', hourCycle: 'h12', numeric: true },
  H: { hour: 'numeric', hourCycle: 'h23', numeric: true },
  HH: { hour: '2-digit', hourCycle: 'h23', numeric: true },
  m: { minute: 'numeric', numeric: true },
  mm: { minute: '2-digit', numeric: true },
  s: { second: 'numeric', numeric: true },
  ss: { second: '2-digit', numeric: true },
  S: { fractionalSecondDigits: 1, numeric: true },
  SS: { fractionalSecondDigits: 2, numeric: true },
  SSS: { fractionalSecondDigits: 3, numeric: true },
} satisfies Record<string, Intl.DateTimeFormatOptions & ExtraOptions>;

export function formatDateLocale(localeStr: string, date: Date, unicodeFormat?: string) {
  if (!unicodeFormat) {
    return new Intl.DateTimeFormat(localeStr, { dateStyle: 'short' }).format(date);
  }
  const tokens = unicodeFormat.split(UNICODE_TOKENS) as Token[];
  const separators: Separator[] = unicodeFormat.match(UNICODE_TOKENS) ?? [];
  const lang = getLanguageFromCode(localeStr);

  let output = '';
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const options = tokenOptions[token];
    const separator = separators[i] ?? '';
    if (!options) {
      // TODO: Throw an error instead?
      output += `Unsupported: ${token}${separator}`;
      continue;
    }

    const formatLang = token === 'a' ? 'en' : localeStr;
    const value = selectPartToUse(new Intl.DateTimeFormat(formatLang, options).formatToParts(date), token)?.value;
    output += postProcessValue(token, date, lang, value) + separator;
  }

  return output;
}

/**
 * This function will massage locale date formats to require a fixed number of characters so that a pattern-format can be used on the text input
 */
export function getDatepickerFormat(unicodeFormat: string): string {
  const tokens = unicodeFormat.split(UNICODE_TOKENS) as Token[];
  const separators: Separator[] = unicodeFormat.match(UNICODE_TOKENS) ?? [];

  return tokens.reduce((acc, token: Token, index) => {
    if (['y', 'yy', 'yyy', 'yyyy', 'u', 'uu', 'uuu', 'uuuu'].includes(token)) {
      return `${acc}yyyy${separators?.[index] ?? ''}`;
    }
    if (['M', 'MM', 'MMM', 'MMMM', 'MMMMM'].includes(token)) {
      return `${acc}MM${separators?.[index] ?? ''}`;
    }
    if (['d', 'dd'].includes(token)) {
      return `${acc}dd${separators?.[index] ?? ''}`;
    }
    return acc;
  }, '');
}

/**
 * Convert the date picker format to a react-number-format pattern format
 */
export function getFormatAsPatternFormat(datePickerFormat: string): string {
  return datePickerFormat.replaceAll(/[dmy]/gi, '#');
}

function selectPartToUse(parts: Intl.DateTimeFormatPart[], token: Token) {
  if (['G', 'GG', 'GGG', 'GGGG', 'GGGGG'].includes(token)) {
    return parts.find((part) => part.type === 'era');
  }
  if (['y', 'yy', 'yyy', 'yyyy', 'u', 'uu', 'uuu', 'uuuu'].includes(token)) {
    return parts.find((part) => part.type === 'year');
  }
  if (['M', 'MM', 'MMM', 'MMMM', 'MMMMM'].includes(token)) {
    return parts.find((part) => part.type === 'month');
  }
  if (['d', 'dd'].includes(token)) {
    return parts.find((part) => part.type === 'day');
  }
  if (['E', 'EE', 'EEE', 'EEEE', 'EEEEE', 'e', 'ee', 'eee', 'eeee', 'eeeee'].includes(token)) {
    return parts.find((part) => part.type === 'weekday');
  }
  if (['h', 'hh', 'H', 'HH'].includes(token)) {
    return parts.find((part) => part.type === 'hour');
  }
  if (['m', 'mm'].includes(token)) {
    return parts.find((part) => part.type === 'minute');
  }
  if (['s', 'ss'].includes(token)) {
    return parts.find((part) => part.type === 'second');
  }
  if (['S', 'SS', 'SSS'].includes(token)) {
    return parts.find((part) => part.type === 'fractionalSecond');
  }
  if (['a'].includes(token)) {
    return parts.find((part) => part.type === 'dayPeriod');
  }
}

function postProcessValue(token: Token, date: Date, lang: FixedLanguageList | undefined, value: string | undefined) {
  if (value === undefined) {
    return value;
  }
  if (token === 'h' || token === 'H') {
    return value.replace(/^0/, '');
  }
  if (['hh', 'HH', 'mm', 'ss', 'yyy', 'yyyy'].includes(token)) {
    return value.padStart(token.length, '0');
  }
  if (['u', 'uu', 'uuu', 'uuuu'].includes(token)) {
    if (date.getUTCFullYear() < 0) {
      const numberComponent = (parseInt(value) - 1).toString();
      return `-${numberComponent.padStart(token.length, '0')}`;
    }
    return value.padStart(token.length, '0');
  }
  if (['E', 'EE', 'EEE'].includes(token)) {
    return value.replace(/\.$/, '');
  }
  if (token === 'a' && lang) {
    return value === 'AM' ? lookup(lang, 'dateTime.am') : lookup(lang, 'dateTime.pm');
  }
  return value;
}

function lookup(lang: FixedLanguageList, key: keyof FixedLanguageList) {
  return lang[key];
}

/**
 *
 * @param date date string or Date object
 * @param zone Time zone name (IANA or UTC offset)
 * @returns A TZDate object
 */
export function toTimeZonedDate(date: string | Date, zone: string = 'Europe/Oslo') {
  return new TZDate(new Date(date), zone);
}

/**
 * This will accept a Unicode date format and figure out if 'inputMode: numeric' can be used for an input field when
 * combined with a pattern format in react-number-format. When the numeric mode is set, the mobile OS will show a
 * strictly numeric keyboard (with no punctuation possible, at least on iOS). Since react-number-format fills in the
 * separators for you automatically, there is no need for the user to actually type them, so we can give the user
 * a better keyboard for these inputs.
 *
 * @see https://github.com/s-yadav/react-number-format/issues/189
 * @see getFormatAsPatternFormat
 */
export function dateFormatCanBeNumericInReactPatternFormat(format: string): boolean {
  const tokens = format.split(UNICODE_TOKENS) as Token[];
  for (const token of tokens) {
    if (!tokenOptions[token] || !tokenOptions[token].numeric) {
      return false;
    }
  }

  return true;
}
