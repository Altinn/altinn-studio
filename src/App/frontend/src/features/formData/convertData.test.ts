import type { JSONSchema7 } from 'json-schema';

import { convertData } from 'src/features/formData/convertData';

describe('convertData with format date-time', () => {
  const schema: JSONSchema7 = { type: 'string', format: 'date-time' };

  it.each(['2026-01-01', '2026-01-01T12:34:56.123+01:00'])('accepts %s', (value) => {
    expect(convertData(value, schema)).toEqual({ newValue: value, error: false });
  });

  it.each(['32.13.2026', '2026-13-32', '12.34.____'])('rejects %s', (value) => {
    expect(convertData(value, schema)).toEqual({ newValue: undefined, error: true });
  });

  it('validates date-time in an anyOf sub-schema', () => {
    const nullableSchema: JSONSchema7 = { anyOf: [schema, { type: 'null' }] };
    expect(convertData('2026-01-01', nullableSchema)).toEqual({ newValue: '2026-01-01', error: false });
    expect(convertData('32.13.2026', nullableSchema)).toEqual({ newValue: undefined, error: true });
  });

  it('does not reject an invalid date for format "date", as the C# string accepts any text (validation still flags it)', () => {
    expect(convertData('32.13.2026', { type: 'string', format: 'date' })).toEqual({
      newValue: '32.13.2026',
      error: false,
    });
  });
});
