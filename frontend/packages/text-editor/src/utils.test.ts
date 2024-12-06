import { filterFunction, getLangName, getRandNumber, mapResourceFilesToTableRows } from './utils';
import type { ITextResources } from 'app-shared/types/global';

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

describe('filterFunction', () => {
  test('that filter function works as intended', () => {
    const entry = [{ lang: 'nb', translation: 'spock' }];
    expect(filterFunction('test', entry, 'ock')).toBe(true);
    expect(filterFunction('test', entry, 'rock')).toBe(false);
    expect(filterFunction('test', entry, '')).toBe(true);
    expect(filterFunction('test', entry, 'test')).toBe(true);
    expect(filterFunction('test', entry, 'testen')).toBe(false);
    expect(filterFunction('test', entry, undefined)).toBe(true);
    expect(filterFunction('test', undefined, undefined)).toBe(true);
  });
});

describe('mapResourceFilesToTableRows', () => {
  test('Converts from ITextResources format to table format without sorting', () => {
    const id = 'some-key';
    const id2 = 'a-key';
    const textResources: ITextResources = {
      nb: [
        { id, value: 'Min verdi 1' },
        { id: id2, value: 'Min verdi 2' },
      ],
      en: [
        { id, value: 'My value 1' },
        { id: id2, value: 'My value 2' },
      ],
    };
    const rows = mapResourceFilesToTableRows(textResources, false);
    expect(rows).toHaveLength(2);
    expect(rows[0].textKey).toBe(id);
    expect(rows[0].translations).toHaveLength(2);
  });

  test('Converts from ITextResources format to table format and sorts them alphabetically', () => {
    const id = 'some-key';
    const id2 = 'a-key';
    const textResources: ITextResources = {
      nb: [
        { id, value: 'Min verdi 1' },
        { id: id2, value: 'Min verdi 2' },
      ],
      en: [
        { id, value: 'My value 1' },
        { id: id2, value: 'My value 2' },
      ],
    };
    const rows = mapResourceFilesToTableRows(textResources, true);
    expect(rows).toHaveLength(2);
    expect(rows[0].textKey).toBe(id2);
    expect(rows[0].translations).toHaveLength(2);
  });

  test('Maintains variables if only present in a single language that is last in alphabetical order', () => {
    const id = 'some-key';
    const textResources: ITextResources = {
      nb: [
        { id, value: 'Min nøkkel' },
        {
          id: 'some-other-key',
          value: 'en tekst med variabel {0}',
          variables: [{ key: 'some-key-in-data-model', dataSource: 'dataModel' }],
        },
      ],
      en: [
        { id, value: 'My key' },
        { id: 'some-other-key', value: '' },
      ],
    };
    const rows = mapResourceFilesToTableRows(textResources, true);
    expect(rows).toHaveLength(2);
    expect(rows[1].variables).toHaveLength(1);
  });

  test('Maintains variables if only present in a single language that is first in alphabetical order', () => {
    const id = 'some-key';
    const textResources: ITextResources = {
      nb: [
        { id, value: 'Min nøkkel' },
        { id: 'some-other-key', value: '' },
      ],
      en: [
        { id, value: 'My key' },
        {
          id: 'some-other-key',
          value: 'en tekst med variabel {0}',
          variables: [{ key: 'some-key-in-data-model', dataSource: 'dataModel' }],
        },
      ],
    };
    const rows = mapResourceFilesToTableRows(textResources, true);
    expect(rows).toHaveLength(2);
    expect(rows[1].variables).toHaveLength(1);
  });
});
