import { asDecimal, asInt32 } from 'src/features/formData/convertData';

interface TestCase {
  value: string;
  result: number;
}

describe('number converters', () => {
  describe('asDecimal', () => {
    const testCases: TestCase[] = [
      { value: '', result: NaN },
      { value: '1', result: 1 },
      { value: '1 234 456', result: 1234456 },
      { value: '1.', result: NaN },
      { value: '1.1', result: 1.1 },
      { value: '1.1e1', result: 11 },
      { value: '1.1e-1', result: 0.11 },
      { value: '1.1e+1', result: 11 },
      { value: '-1', result: -1 },
      { value: '-1.', result: NaN },
      { value: '-1.1', result: -1.1 },
      { value: '-1.1e1', result: -11 },
      { value: '-1.1e-1', result: -0.11 },
      { value: '-1.1e+1', result: -11 },
      { value: '8e28', result: NaN },
      { value: '-8e28', result: NaN },
      { value: '-', result: NaN },
      { value: '- 15', result: -15 },
      { value: '- 15 13 . 12', result: -1513.12 },
      { value: '.', result: NaN },
      { value: '0.1', result: 0.1 },
      { value: '.1', result: 0.1 },
    ];

    it.each(testCases)('should return $value as $result', ({ value, result }) => {
      const actual = asDecimal(value);
      expect(actual).toEqual(result);
    });
  });

  describe('asInt32', () => {
    const testCases: TestCase[] = [
      { value: '', result: NaN },
      { value: '1', result: 1 },
      { value: '123', result: 123 },
      { value: '1 234 799', result: 1234799 },
      { value: '1.', result: NaN },
      { value: '1e2', result: NaN },
      { value: '1.1', result: NaN },
      { value: '1.1e1', result: NaN },
      { value: '1.1e-1', result: NaN },
      { value: '1.1e+1', result: NaN },
      { value: '-1', result: -1 },
      { value: '-123', result: -123 },
      { value: '-1.', result: NaN },
      { value: '-1.1', result: NaN },
      { value: '-1.1e1', result: NaN },
      { value: '-1.1e-1', result: NaN },
      { value: '-1.1e+1', result: NaN },
      { value: '2147483646', result: 2147483646 },
      { value: '2147483648', result: NaN },
      { value: '-2147483647', result: -2147483647 },
      { value: '-2147483649', result: NaN },
      { value: '-', result: NaN },
      { value: '- 15', result: -15 },
      { value: '- 15 13 . 12', result: NaN },
      { value: '.', result: NaN },
      { value: '0.1', result: NaN },
      { value: '.1', result: NaN },
    ];

    it.each(testCases)('should return $value as $result', ({ value, result }) => {
      const actual = asInt32(value);
      expect(actual).toEqual(result);
    });
  });
});
