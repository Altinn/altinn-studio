import moment from 'moment';

import { DateFlags } from 'src/types/index';
import {
  DatepickerMaxDateDefault,
  DatepickerMinDateDefault,
  getDateConstraint,
  getDateFormat,
  getDateString,
  getISOString,
} from 'src/utils/dateHelpers';

describe('dateHelpers', () => {
  describe('getISOString', () => {
    it.each(['', undefined])('should return undefined if input date is %p', (date) => {
      expect(getISOString(date)).toBeUndefined();
    });

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

  describe('getDateFormat', () => {
    it('should return format if format is provided', () => {
      const result = getDateFormat('YYYY-MM-DD');
      expect(result).toEqual('YYYY-MM-DD');
    });

    it('should return english format', () => {
      const result = getDateFormat(undefined, 'en');
      expect(result).toEqual('MM/DD/YYYY');
    });

    it('should return norwegian format', () => {
      const result = getDateFormat(undefined, 'nb');
      expect(result).toEqual('DD.MM.YYYY');
    });

    it('should return norwegian format as default', () => {
      const result = getDateFormat(undefined, undefined);
      expect(result).toEqual('DD.MM.YYYY');
    });
  });

  describe('getDateString', () => {
    it.each([true, false])('should return a string that can be parsed as ISO_8601', (timestamp) => {
      const date = moment();
      const dateString = getDateString(date, timestamp);
      const parsedDate = moment(dateString, moment.ISO_8601);

      expect(dateString).not.toHaveLength(0);
      expect(parsedDate.isValid()).toEqual(true);
      expect(parsedDate.year()).toEqual(date.year());
      expect(parsedDate.month()).toEqual(date.month());
      expect(parsedDate.day()).toEqual(date.day());
    });
    it.each([true, false])('should return an empty string if date is null', (timestamp) => {
      const dateString = getDateString(null, timestamp);
      expect(dateString).toEqual('');
    });
  });
  describe('getDateConstraint', () => {
    it.each(['min', 'max'])('should return default min/max if input is undefined', (constraint: 'min' | 'max') => {
      const dateConstraint = getDateConstraint(undefined, constraint);
      if (constraint === 'min') {
        expect(dateConstraint).toEqual(DatepickerMinDateDefault);
      }
      if (constraint === 'max') {
        expect(dateConstraint).toEqual(DatepickerMaxDateDefault);
      }
    });
    it.each([
      ['', 'min'],
      ['', 'max'],
      ['asdf', 'min'],
      ['asdf', 'max'],
      ['2022-45-15', 'min'],
      ['2022-45-15', 'max'],
    ])('should return default min/max if input is invalid', (invalidInput: string, constraint: 'min' | 'max') => {
      const dateConstraint = getDateConstraint(invalidInput, constraint);
      if (constraint === 'min') {
        expect(dateConstraint).toEqual(DatepickerMinDateDefault);
      }
      if (constraint === 'max') {
        expect(dateConstraint).toEqual(DatepickerMaxDateDefault);
      }
    });
    it.each(['min', 'max'])('should return correct date if given DateFlags.Today', (constraint: 'min' | 'max') => {
      const dateConstraint = getDateConstraint(DateFlags.Today, constraint);

      expect(dateConstraint).not.toHaveLength(0);

      const today = moment();
      const date = moment(dateConstraint, moment.ISO_8601);

      expect(date.isValid()).toEqual(true);

      expect(date.year()).toEqual(today.year());
      expect(date.month()).toEqual(today.month());
      expect(date.day()).toEqual(today.day());
    });
    it.each([
      ['2022-11-05T12:00:00.000Z', 'min'],
      ['2022-11-05T12:00:00.000Z', 'max'],
      ['2022-01-31', 'min'],
      ['2022-01-31', 'max'],
    ])('should return correct date if given a valid date', (validInput: string, constraint: 'min' | 'max') => {
      const dateConstraint = getDateConstraint(validInput, constraint);

      expect(dateConstraint).not.toHaveLength(0);

      const validDate = moment(validInput, moment.ISO_8601);
      const date = moment(dateConstraint, moment.ISO_8601);

      expect(date.isValid()).toEqual(true);

      expect(date.year()).toEqual(validDate.year());
      expect(date.month()).toEqual(validDate.month());
      expect(date.day()).toEqual(validDate.day());
    });
  });
});
