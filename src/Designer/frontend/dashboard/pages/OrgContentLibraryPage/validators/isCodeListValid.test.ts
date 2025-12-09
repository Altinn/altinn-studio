import { isCodeListValid } from './isCodelistValid';

describe('isCodeListValid', () => {
  it('returns true for valid code list with minimal required fields', () => {
    const codeList: unknown = [{ value: 'option1' }, { value: 'option2' }];
    expect(isCodeListValid(codeList)).toBe(true);
  });

  it('returns true for valid code list with all optional fields', () => {
    const codeList: CodeList = [
      {
        value: 'cat',
        label: { nb: 'Katt', en: 'Cat' },
        description: { nb: 'Egyptisk gud', en: 'Egyptian godess' },
        helpText: {
          nb: 'Dette er dyret Felis catus fra kattefamilien Felidae',
          en: 'Felis catus from the family Felidae',
        },
        tags: ['animal', 'pet'],
      },
      {
        value: 'dog',
        label: { nb: 'Hund', en: 'Dog' },
        description: { nb: 'Menneskets beste venn', en: 'Mans best friend' },
        helpText: {
          nb: 'Velg denne hvis du er glad i å gå tur',
          en: 'Choose this option if you like going on walks',
        },
        tags: ['animal', 'pet'],
      },
    ];
    expect(isCodeListValid(codeList)).toBe(true);
  });

  it('returns true for empty code list array', () => {
    const codeList: unknown = [];
    expect(isCodeListValid(codeList)).toBe(true);
  });

  it('returns false when input is null', () => {
    expect(isCodeListValid(null)).toBe(false);
  });

  it('returns false when input is undefined', () => {
    expect(isCodeListValid(undefined)).toBe(false);
  });

  it('returns false when code list item is missing required value field', () => {
    const invalidCodeList = [{ label: { nb: 'Label' } }];
    expect(isCodeListValid(invalidCodeList)).toBe(false);
  });

  it('returns false when value is not a string', () => {
    const invalidCodeList = [{ value: 123 }];
    expect(isCodeListValid(invalidCodeList)).toBe(false);
  });

  it('returns false when label is not a valid multi-language object', () => {
    const invalidCodeList = [{ value: 'option1', label: 'string-instead-of-object' }];
    expect(isCodeListValid(invalidCodeList)).toBe(false);
  });

  it('returns false when description is not a valid multi-language object', () => {
    const invalidCodeList = [{ value: 'option1', description: ['array-instead-of-object'] }];
    expect(isCodeListValid(invalidCodeList)).toBe(false);
  });

  it('returns false when helpText is not a valid multi-language object', () => {
    const invalidCodeList = [{ value: 'option1', helpText: 123 }];
    expect(isCodeListValid(invalidCodeList)).toBe(false);
  });

  it('returns false when tags is not an array', () => {
    const invalidCodeList = [{ value: 'option1', tags: 'not-an-array' }];
    expect(isCodeListValid(invalidCodeList)).toBe(false);
  });

  it('returns false when tags array contains non-string values', () => {
    const invalidCodeList = [{ value: 'option1', tags: ['valid', 123, 'another'] }];
    expect(isCodeListValid(invalidCodeList)).toBe(false);
  });

  it('returns false when code list contains additional properties', () => {
    const invalidCodeList = [{ value: 'option1', unknownField: 'value' }];
    expect(isCodeListValid(invalidCodeList)).toBe(false);
  });

  it('returns false when input is not an array', () => {
    const invalidCodeList = { value: 'option1' };
    expect(isCodeListValid(invalidCodeList)).toBe(false);
  });
});
