import 'jest';
import moment from 'moment';
import { getFlagBasedDate } from '../../src/utils/dateFlagParser';

describe('/utils/dateFlagParser.ts', () => {
  describe('getFlagBasedDate(...)', () => {
    test.each([
      '',
      undefined,
      null
    ])
    ('should return null if flagOrDate is %p', (flagOrDateValue) => {
      expect(getFlagBasedDate(flagOrDateValue)).toBeNull();
    });
  
    test.each([
      ['a', false],
      ['10.10.2020', true],
    ])
    ('should return moment.Moment if flagOrDate is %p and it is not a flag', (flagOrDateValue, isValidDate) => {
      const result = getFlagBasedDate(flagOrDateValue);
      expect(result).toBeInstanceOf(moment);
      expect(result.isValid()).toEqual(isValidDate);
    });

    test.each([
      [moment().set('hour', 12).set('minute', 0), 'today'],
    ])
    ('should return %p if flagOrDate is %p', (expectedDate, flagOrDateValue) => {
      const result = getFlagBasedDate(flagOrDateValue);
      expect(result.isSame(expectedDate, 'day')).toEqual(true);
    });
  });
});
