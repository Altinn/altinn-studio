import { isOrg } from './';
import { SelectedContextType } from '../../enums/SelectedContextType';

describe('utils', () => {
  describe('isOrg', () => {
    it('Returns true when the input is not a reserved keyword', () => {
      expect(isOrg('organisation')).toBe(true);
    });

    it.each([SelectedContextType.Self, SelectedContextType.All, SelectedContextType.None])(
      'Returns false when the input is %s',
      (contextType) => {
        expect(isOrg(contextType)).toBe(false);
      },
    );
  });
});
