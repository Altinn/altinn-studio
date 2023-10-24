import { getIsDatesValid } from './setupTabUtils';

describe('setupTabUtils', () => {
  describe('getIsDatesValid', () => {
    const mockFrom1: string = '2023-09-30T10:36:00';
    const mockFrom2: string = '2023-11-30T10:36:00';
    const mockTo: string = '2023-10-30T10:36:00';

    it('returns true when "from" is undefined', () => {
      const result: boolean = getIsDatesValid(undefined, mockTo);
      expect(result).toBeTruthy();
    });

    it('returns true when "to" is undefined', () => {
      const result: boolean = getIsDatesValid(mockFrom1, undefined);
      expect(result).toBeTruthy();
    });

    it('returns false when "from" is after "to"', () => {
      const result: boolean = getIsDatesValid(mockFrom2, mockTo);
      expect(result).toBeFalsy();
    });

    it('returns true when "from" is before "to"', () => {
      const result: boolean = getIsDatesValid(mockFrom1, mockTo);
      expect(result).toBeTruthy();
    });
  });
});
