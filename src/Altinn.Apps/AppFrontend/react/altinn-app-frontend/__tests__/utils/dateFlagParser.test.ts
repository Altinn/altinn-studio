import 'jest';
import moment from 'moment';
import { getFlagBasedDate, getISOString } from '../../src/utils/dateHelpers';
import { DateFlags } from '../../src/types';

describe('/utils/dateFlagParser.ts', () => {
  describe('getFlagBasedDate(...)', () => {
    test.each([
      '',
      undefined,
      null,
      'abcdef'
    ])
    ('should return undefined if flag is %p', (flag) => {
      expect(getFlagBasedDate(flag as DateFlags)).toBeUndefined();
    });

    test.each([
      [moment().set('hour', 12).set('minute', 0), 'today'],
    ])
    ('should return %p if flag is %p', (expectedDate, flag) => {
      const result = getFlagBasedDate(flag as DateFlags);
      expect(moment(result).isSame(expectedDate, 'day')).toEqual(true);
    });
  });

  describe('getISOString(...)', () => {
    test.each([
      '',
      undefined,
      null,
      'abcdef'
    ])
    ('should return undefined if input date is %p', (date) => {
      expect(getISOString(date)).toBeUndefined();
    });

    it('should return ISO string if input date is valid ISO string', () => {
      const validISOString = '2020-12-13T12:00:00Z';
      const result = getISOString(validISOString);
      expect(moment(result).isSame(validISOString, 'day')).toEqual(true);
    });
  });
});
