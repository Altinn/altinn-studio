import { retrieveDateTimeFormatState, updateDateTimeRestrictions } from './utils';
import type { DateTimeFormatState } from './utils';
import { StrRestrictionKey } from '@altinn/schema-model/types';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

describe('StringRestrictions utils', () => {
  describe('retrieveDateTimeFormatState', () => {
    it('Returns correct state when minimum and maximum are set and they are inclusive', () => {
      const restrictions: KeyValuePairs = {
        [StrRestrictionKey.formatMinimum]: '2020-01-01T00:00:00Z',
        [StrRestrictionKey.formatMaximum]: '2022-01-01T00:00:00Z',
      };
      const result = retrieveDateTimeFormatState(restrictions);
      const expectedResult: DateTimeFormatState = {
        earliestIsInclusive: true,
        latestIsInclusive: true,
        earliest: '2020-01-01T00:00:00Z',
        latest: '2022-01-01T00:00:00Z',
      };
      expect(result).toEqual(expectedResult);
    });

    it('Returns correct state when exclusive minimum and maximum are set and they are exclusive', () => {
      const restrictions: KeyValuePairs = {
        [StrRestrictionKey.formatExclusiveMinimum]: '2020-01-01T00:00:00Z',
        [StrRestrictionKey.formatExclusiveMaximum]: '2022-01-01T00:00:00Z',
      };
      const result = retrieveDateTimeFormatState(restrictions);
      const expectedResult: DateTimeFormatState = {
        earliestIsInclusive: false,
        latestIsInclusive: false,
        earliest: '2020-01-01T00:00:00Z',
        latest: '2022-01-01T00:00:00Z',
      };
      expect(result).toEqual(expectedResult);
    });

    it('Sets dates to empty strings and inclusivity to true when no restrictions are set', () => {
      const result = retrieveDateTimeFormatState({});
      const expectedResult: DateTimeFormatState = {
        earliestIsInclusive: true,
        latestIsInclusive: true,
        earliest: '',
        latest: '',
      };
      expect(result).toEqual(expectedResult);
    });
  });

  describe('updateDateTimeRestrictions', () => {
    it('Returns correct restrictions when all values are set and they are inclusive', () => {
      const state: DateTimeFormatState = {
        earliestIsInclusive: true,
        latestIsInclusive: true,
        earliest: '2020-01-01T00:00:00Z',
        latest: '2022-01-01T00:00:00Z',
      };
      const result = updateDateTimeRestrictions({}, state);
      const expectedResult: KeyValuePairs = {
        [StrRestrictionKey.formatMinimum]: '2020-01-01T00:00:00Z',
        [StrRestrictionKey.formatMaximum]: '2022-01-01T00:00:00Z',
      };
      expect(result).toEqual(expectedResult);
    });

    it('Returns correct restrictions when all values are set and they are exclusive', () => {
      const state: DateTimeFormatState = {
        earliestIsInclusive: false,
        latestIsInclusive: false,
        earliest: '2020-01-01T00:00:00Z',
        latest: '2022-01-01T00:00:00Z',
      };
      const result = updateDateTimeRestrictions({}, state);
      const expectedResult: KeyValuePairs = {
        [StrRestrictionKey.formatExclusiveMinimum]: '2020-01-01T00:00:00Z',
        [StrRestrictionKey.formatExclusiveMaximum]: '2022-01-01T00:00:00Z',
      };
      expect(result).toEqual(expectedResult);
    });

    it('Updates the restrictions if they already exist', () => {
      const initialRestrictions: KeyValuePairs = {
        [StrRestrictionKey.formatMinimum]: '2019-01-01T00:00:00Z',
        [StrRestrictionKey.formatMaximum]: '2021-01-01T00:00:00Z',
      };
      const state: DateTimeFormatState = {
        earliestIsInclusive: true,
        latestIsInclusive: true,
        earliest: '2020-01-01T00:00:00Z',
        latest: '2022-01-01T00:00:00Z',
      };
      const result = updateDateTimeRestrictions(initialRestrictions, state);
      const expectedResult: KeyValuePairs = {
        [StrRestrictionKey.formatMinimum]: '2020-01-01T00:00:00Z',
        [StrRestrictionKey.formatMaximum]: '2022-01-01T00:00:00Z',
      };
      expect(result).toEqual(expectedResult);
    });

    it('Keeps unrelated restrictions intact', () => {
      const initialRestrictions: KeyValuePairs = {
        [StrRestrictionKey.formatMinimum]: '2019-01-01T00:00:00Z',
        [StrRestrictionKey.pattern]: '^.+$',
      };
      const state: DateTimeFormatState = {
        earliestIsInclusive: true,
        latestIsInclusive: true,
        earliest: '2020-01-01T00:00:00Z',
        latest: '2022-01-01T00:00:00Z',
      };
      const result = updateDateTimeRestrictions(initialRestrictions, state);
      const expectedResult: KeyValuePairs = {
        [StrRestrictionKey.formatMinimum]: '2020-01-01T00:00:00Z',
        [StrRestrictionKey.formatMaximum]: '2022-01-01T00:00:00Z',
        [StrRestrictionKey.pattern]: '^.+$',
      };
      expect(result).toEqual(expectedResult);
    });

    it('Removes minimum restriction when earliest is an empty string', () => {
      const initialRestrictions: KeyValuePairs = {
        [StrRestrictionKey.formatMinimum]: '2019-01-01T00:00:00Z',
        [StrRestrictionKey.formatMaximum]: '2021-01-01T00:00:00Z',
      };
      const state: DateTimeFormatState = {
        earliestIsInclusive: true,
        latestIsInclusive: true,
        earliest: '',
        latest: '2022-01-01T00:00:00Z',
      };
      const result = updateDateTimeRestrictions(initialRestrictions, state);
      const expectedResult: KeyValuePairs = {
        [StrRestrictionKey.formatMaximum]: '2022-01-01T00:00:00Z',
      };
      expect(result).toEqual(expectedResult);
    });

    it('Removes maximum restriction when latest is an empty string', () => {
      const initialRestrictions: KeyValuePairs = {
        [StrRestrictionKey.formatMinimum]: '2019-01-01T00:00:00Z',
        [StrRestrictionKey.formatMaximum]: '2021-01-01T00:00:00Z',
      };
      const state: DateTimeFormatState = {
        earliestIsInclusive: true,
        latestIsInclusive: true,
        earliest: '2020-01-01T00:00:00Z',
        latest: '',
      };
      const result = updateDateTimeRestrictions(initialRestrictions, state);
      const expectedResult: KeyValuePairs = {
        [StrRestrictionKey.formatMinimum]: '2020-01-01T00:00:00Z',
      };
      expect(result).toEqual(expectedResult);
    });

    it('Removes inclusive restriction when switching to exclusive', () => {
      const initialRestrictions: KeyValuePairs = {
        [StrRestrictionKey.formatMinimum]: '2019-01-01T00:00:00Z',
        [StrRestrictionKey.formatMaximum]: '2021-01-01T00:00:00Z',
      };
      const state: DateTimeFormatState = {
        earliestIsInclusive: false,
        latestIsInclusive: false,
        earliest: '2020-01-01T00:00:00Z',
        latest: '2022-01-01T00:00:00Z',
      };
      const result = updateDateTimeRestrictions(initialRestrictions, state);
      const expectedResult: KeyValuePairs = {
        [StrRestrictionKey.formatExclusiveMinimum]: '2020-01-01T00:00:00Z',
        [StrRestrictionKey.formatExclusiveMaximum]: '2022-01-01T00:00:00Z',
      };
      expect(result).toEqual(expectedResult);
    });

    it('Removes exclusive restriction when switching to inclusive', () => {
      const initialRestrictions: KeyValuePairs = {
        [StrRestrictionKey.formatExclusiveMinimum]: '2019-01-01T00:00:00Z',
        [StrRestrictionKey.formatExclusiveMaximum]: '2021-01-01T00:00:00Z',
      };
      const state: DateTimeFormatState = {
        earliestIsInclusive: true,
        latestIsInclusive: true,
        earliest: '2020-01-01T00:00:00Z',
        latest: '2022-01-01T00:00:00Z',
      };
      const result = updateDateTimeRestrictions(initialRestrictions, state);
      const expectedResult: KeyValuePairs = {
        [StrRestrictionKey.formatMinimum]: '2020-01-01T00:00:00Z',
        [StrRestrictionKey.formatMaximum]: '2022-01-01T00:00:00Z',
      };
      expect(result).toEqual(expectedResult);
    });

    it('Removes all date-time restrictions when both earliest and latest are empty strings', () => {
      const dateTimeRestrictions: KeyValuePairs = {
        [StrRestrictionKey.formatExclusiveMinimum]: '2019-01-01T00:00:00Z',
        [StrRestrictionKey.formatExclusiveMaximum]: '2021-01-01T00:00:00Z',
      };
      const otherRestrictions: KeyValuePairs = {
        [StrRestrictionKey.pattern]: '^.+$',
      };
      const initialRestrictions = { ...dateTimeRestrictions, ...otherRestrictions };
      const state: DateTimeFormatState = {
        earliestIsInclusive: false,
        latestIsInclusive: false,
        earliest: '',
        latest: '',
      };
      const result = updateDateTimeRestrictions(initialRestrictions, state);
      expect(result).toEqual(otherRestrictions);
    });
  });
});
