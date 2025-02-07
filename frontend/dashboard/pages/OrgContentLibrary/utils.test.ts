import { isOrg } from './utils';
import { SelectedContextType } from '../../context/HeaderContext';

describe('utils', () => {
  describe('isOrg', () => {
    it('Returns true when the input is not a reserved keyword', () => {
      expect(isOrg('organization')).toBe(true);
    });

    it.each([SelectedContextType.Self, SelectedContextType.All, SelectedContextType.None])(
      'Returns false when the input is %s',
      (contextType) => {
        expect(isOrg(contextType)).toBe(false);
      },
    );
  });
});
