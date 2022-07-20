import moment from 'moment';

import { getFlagBasedDate, getISOString } from 'src/utils/dateHelpers';
import type { DateFlags } from 'src/types';

describe('dateHelpers', () => {
  describe('getFlagBasedDate(...)', () => {
    test.each(['', undefined, null, 'abcdef'])(
      'should return undefined if flag is %p',
      (flag) => {
        expect(getFlagBasedDate(flag as DateFlags)).toBeUndefined();
      },
    );

    test.each([[moment().set('hour', 12).set('minute', 0), 'today']])(
      'should return %p if flag is %p',
      (expectedDate, flag) => {
        const result = getFlagBasedDate(flag as DateFlags);
        expect(moment(result).isSame(expectedDate, 'day')).toEqual(true);
      },
    );
  });

  describe('getISOString', () => {
    test.each(['', undefined, null])(
      'should return undefined if input date is %p',
      (date) => {
        expect(getISOString(date)).toBeUndefined();
      },
    );

    it('should return undefined if input date is "abcdef"', () => {
      jest.spyOn(console, 'warn').mockImplementation();

      expect(getISOString('abcdef')).toBeUndefined();
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringMatching(
          /Deprecation warning: value provided is not in a recognized RFC2822 or ISO format. moment construction falls back to js Date/,
        ),
      );
    });

    it('should return ISO string if input date is valid ISO string', () => {
      const validISOString = '2020-12-13T12:00:00Z';
      const result = getISOString(validISOString);
      expect(moment(result).isSame(validISOString, 'day')).toEqual(true);
    });
  });
});
