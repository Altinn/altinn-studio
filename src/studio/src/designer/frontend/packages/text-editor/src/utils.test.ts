import { getLanguageName, getRandNumber } from './utils';

describe('getLanguageName', () => {
  it('should return empty string when language code is undefined', () => {
    const result = getLanguageName({ code: undefined });
    expect(result).toBe('');
  });

  it('should return "norsk bokmål" when language code is nb', () => {
    const result = getLanguageName({ code: 'nb' });
    expect(result).toBe('norsk bokmål');
  });

  it('should fallback to other method of getting language name, when Intl.DisplayNames returns code', () => {
    const mockIntl = {
      of: (code: string) => {
        return code;
      },
      resolvedOptions: jest.fn(),
    };

    const result = getLanguageName({ code: 'nb', intlDisplayNames: mockIntl });

    expect(result).toBe('norwegian bokmål');
  });

  it('should return code when language code is something unknown', () => {
    const code = 'xx';
    const result = getLanguageName({ code });
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
