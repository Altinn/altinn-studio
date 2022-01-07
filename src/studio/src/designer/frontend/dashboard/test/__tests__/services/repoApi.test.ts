import { adjustQueryParams } from 'services/repoApi';

describe('repoApi', () => {
  describe('adjustQueryParams', () => {
    it('should add 1 to page param', () => {
      const result = adjustQueryParams({
        page: 1,
      });

      expect(result.page).toBe(2);
    });

    it('should change sortby param to "alpha" when sortby is "name"', () => {
      const result = adjustQueryParams({
        sortby: 'name',
      });

      expect(result.sortby).toBe('alpha');
    });

    it('should change sortby param to "updated" when sortby is "updated_at"', () => {
      const result = adjustQueryParams({
        sortby: 'updated_at',
      });

      expect(result.sortby).toBe('updated');
    });
  });
});
