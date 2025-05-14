import { TZDate } from '@date-fns/tz';

import { getLanguageFromCode } from 'src/language/languages';
import type { FixedLanguageList } from 'src/language/languages';

const UNICODE_TOKENS = /[^a-zA-Z0-9]+/g;
export type Token =
  | 'G'
  | 'GG'
  | 'GGG'
  | 'GGGG'
  | 'GGGGG'
  | 'y'
  | 'yy'
  | 'yyy'
  | 'yyyy'
  | 'u'
  | 'uu'
  | 'uuu'
  | 'uuuu'
  | 'M'
  | 'MM'
  | 'MMM'
  | 'MMMM'
  | 'MMMMM'
  | 'd'
  | 'dd'
  | 'a'
  | 'E'
  | 'EE'
  | 'EEE'
  | 'EEEE'
  | 'EEEEE'
  | 'h'
  | 'hh'
  | 'H'
  | 'HH'
  | 'm'
  | 'mm'
  | 's'
  | 'ss'
  | 'S'
  | 'SS'
  | 'SSS';
type Separator = string | undefined;

const tokenMappings: Record<Token, Intl.DateTimeFormatOptions> = {
  G: { era: 'short' },
  GG: { era: 'short' },
  GGG: { era: 'short' },
  GGGG: { era: 'long' },
  GGGGG: { era: 'narrow' },
  y: { year: 'numeric' },
  yy: { year: '2-digit' },
  yyy: { year: 'numeric' },
  yyyy: { year: 'numeric' },
  u: { year: 'numeric' },
  uu: { year: 'numeric' },
  uuu: { year: 'numeric' },
  uuuu: { year: 'numeric' },
  M: { month: 'numeric' },
  MM: { month: '2-digit' },
  MMM: { month: 'short' },
  MMMM: { month: 'long' },
  MMMMM: { month: 'narrow' },
  d: { day: 'numeric' },
  dd: { day: '2-digit' },
  E: { weekday: 'short' },
  EE: { weekday: 'short' },
  EEE: { weekday: 'short' },
  EEEE: { weekday: 'long' },
  EEEEE: { weekday: 'narrow' },
  a: { hour12: true, hour: '2-digit' },
  h: { hour: 'numeric', hourCycle: 'h12' },
  hh: { hour: '2-digit', hourCycle: 'h12' },
  H: { hour: 'numeric', hourCycle: 'h23' },
  HH: { hour: '2-digit', hourCycle: 'h23' },
  m: { minute: 'numeric' },
  mm: { minute: '2-digit' },
  s: { second: 'numeric' },
  ss: { second: '2-digit' },
  S: { fractionalSecondDigits: 1 },
  SS: { fractionalSecondDigits: 2 },
  SSS: { fractionalSecondDigits: 3 },
};

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
    const options = tokenMappings[token];
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

export function getFormatPattern(datePickerFormat: string): string {
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
