import { filterFunction, getLangName, getRandNumber } from './utils';

describe('getLangName', () => {
  it('should return empty string when language code is undefined', () => {
    const result = getLangName({ code: undefined });
    expect(result).toBe('');
  });

  it('should return "norsk bokmål" when language code is nb', () => {
    const result = getLangName({ code: 'nb' });
    expect(result).toBe('norsk bokmål');
  });

  it('should fallback to other method of getting language name, when Intl.DisplayNames returns code', () => {
    const mockIntl = {
      of: (code: string) => {
        return code;
      },
      resolvedOptions: jest.fn(),
    };

    const result = getLangName({ code: 'nb', intlDisplayNames: mockIntl });

    expect(result).toBe('norwegian bokmål');
  });

  it('should return code when language code is something unknown', () => {
    const code = 'xx';
    const result = getLangName({ code });
    expect(result).toBe(code);
  });
});

describe('getRandNumber', () => {
  it('should return different numbers', () => {
    const n1 = getRandNumber();
    const n2 = getRandNumber();

    expect(n1).not.toEqual(n2);
  });
});

test('that filter function works as intended', () => {
  expect(filterFunction('test', 'spock', 'ock')).toBe(true);
  expect(filterFunction('test', 'spock', 'rock')).toBe(false);
  expect(filterFunction('test', 'spock', '')).toBe(true);
  expect(filterFunction('test', 'spock', 'test')).toBe(true);
  expect(filterFunction('test', 'spock', 'testen')).toBe(false);
  expect(filterFunction('test', 'spock', undefined)).toBe(true);
  expect(filterFunction('test', undefined, undefined)).toBe(true);
});
