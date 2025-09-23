import { getColumnStyles, smartLowerCaseFirst } from 'src/utils/formComponentUtils';
import type { ITableColumnProperties } from 'src/layout/common.generated';

describe('formComponentUtils', () => {
  describe('smartLowerCaseFirst', () => {
    it.each([
      { input: 'Fornavn', expected: 'fornavn' },
      { input: 'fornavn', expected: 'fornavn' },
      { input: 'Postnummer', expected: 'postnummer' },
      { input: 'AlfabeteT', expected: 'alfabeteT' },
      {
        input: 'Den dominikanske Republikk',
        expected: 'den dominikanske Republikk',
      },
      {
        input: 'Den Dominikanske Republikk',
        expected: 'Den Dominikanske Republikk',
      },
      { input: 'Sas', expected: 'sas' },
      { input: 'SAS', expected: 'SAS' },
      { input: 'SERIOUSLY', expected: 'SERIOUSLY' },
      { input: 'ÆØÅ', expected: 'ÆØÅ' },
      { input: 'Grünerløkka', expected: 'grünerløkka' },
      { input: 'D.o.B.', expected: 'D.o.B.' },
      { input: 'SaaB', expected: 'SaaB' },
      { input: 'S.a.a.B', expected: 'S.a.a.B' },
      { input: '¿Cómo te llamas?', expected: '¿cómo te llamas?' },
      { input: undefined, expected: undefined },
      { input: '', expected: '' },
    ])('Should convert $input to $expected', ({ input, expected }) => {
      expect(smartLowerCaseFirst(input)).toEqual(expected);
    });
  });

  describe('getColumnStyles', () => {
    it('should return CSS properties object with correct values based on columnSettings', () => {
      const columnSettings: ITableColumnProperties = {
        width: '100px',
        textOverflow: { lineWrap: true, maxHeight: 3 },
        alignText: 'center',
      };
      const columnStyles = getColumnStyles(columnSettings);
      expect(columnStyles).toEqual({
        '--cell-max-number-of-lines': 3,
        '--cell-text-alignment': 'center',
        '--cell-width': '100px',
      });
    });

    it('should return CSS properties object with default value for "--cell-max-number-of-lines" if lineWrap is false', () => {
      const columnSettings: ITableColumnProperties = {
        width: '100px',
        textOverflow: { lineWrap: false, maxHeight: 3 },
        alignText: 'center',
      };
      const columnStyles = getColumnStyles(columnSettings);
      expect(columnStyles['--cell-max-number-of-lines']).toEqual(0);
    });
  });
});
