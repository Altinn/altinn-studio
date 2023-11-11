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
type TokenValueSeparator = [Token, string | undefined, Separator];

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

  const options: Partial<Record<Token, Intl.DateTimeFormatOptions>> = tokens.reduce(
    (acc, token) => ({ ...acc, [token]: tokenMappings[token] }),
    {},
  );

  const parts: Partial<Record<Token, Intl.DateTimeFormatPart>> = Object.keys(options)
    .filter((token: Token) => options[token] !== undefined)
    .reduce(
      (acc, token: Token) => ({
        ...acc,
        [token]: selectPartToUse(new Intl.DateTimeFormat(localeStr, options[token]).formatToParts(date), token),
      }),
      {},
    );

  const tokenValueSeparators = tokens.map<TokenValueSeparator>((token: Token, index) => [
    token,
    postProcessValue(token, date, parts[token]?.value),
    separators?.[index],
  ]);

  return tokenValueSeparators.reduce((acc, [token, value, separator]) => {
    const valueWithFallback = value ?? `Unsupported: ${token}`;
    return `${acc}${valueWithFallback}${separator ?? ''}`;
  }, '');
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

function postProcessValue(token: Token, date: Date, value?: string) {
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
  return value;
}
