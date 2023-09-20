import { formatDateToDateAndTimeString } from './dateUtils';

describe('dateUtils', () => {
  describe('formatDateToDateAndTimeString', () => {
    const mockDateString: string = '2023-09-20T07:01:47Z';
    const mockFormattedString: string = '20.09.2023 09:01';

    it('formats the date correctly', () => {
      const formatedDate = formatDateToDateAndTimeString(mockDateString);
      expect(formatedDate).toEqual(mockFormattedString);
    });
  });
});
