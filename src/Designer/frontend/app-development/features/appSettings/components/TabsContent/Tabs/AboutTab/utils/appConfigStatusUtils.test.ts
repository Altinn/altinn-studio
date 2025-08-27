import { getStatusOptions, statusMap } from './appConfigStatusUtils';
import type { LabelAndValue } from '../../../../../types/LabelAndValue';

const mockTranslationFunction = jest.fn((key: string) => `translated:${key}`);

describe('appConfigStatusUtils', () => {
  describe('getStatusOptions', () => {
    it('returns status options with correct value and translated label', () => {
      const result = getStatusOptions(mockTranslationFunction);

      const expected: LabelAndValue[] = Object.keys(statusMap).map((key) => ({
        value: key,
        label: `translated:${statusMap[key as keyof typeof statusMap]}`,
      }));

      expect(result).toEqual(expected);
    });

    it('calls translation function for each status key', () => {
      getStatusOptions(mockTranslationFunction);

      const statusKeys = Object.keys(statusMap) as (keyof typeof statusMap)[];

      statusKeys.forEach((key) => {
        expect(mockTranslationFunction).toHaveBeenCalledWith(statusMap[key]);
      });
    });
  });
});
