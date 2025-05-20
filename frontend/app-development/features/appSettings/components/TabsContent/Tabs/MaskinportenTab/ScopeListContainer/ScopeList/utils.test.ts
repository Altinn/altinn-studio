import { mapSelectedValuesToMaskinportenScopes, mapMaskinPortenScopesToScopeList } from './utils';
import type { MaskinportenScope } from 'app-shared/types/MaskinportenScope';

const scope1: string = 'scope1';
const scope2: string = 'scope2';
const scope3: string = 'scope3';
const description1: string = 'Scope 1';
const description2: string = 'Scope 2';
const description3: string = 'Scope 3';

const allScopesMock: MaskinportenScope[] = [
  { scope: scope1, description: description1 },
  { scope: scope2, description: description2 },
  { scope: scope3, description: description3 },
];

describe('ScopeList utils functions', () => {
  describe('mapSelectedValuesToMaskinportenScopes', () => {
    it('should return the corresponding scope objects for the selected values', () => {
      const selectedValues = [scope1, scope3];
      const result = mapSelectedValuesToMaskinportenScopes(selectedValues, allScopesMock);

      expect(result).toEqual([
        { scope: scope1, description: description1 },
        { scope: scope3, description: description3 },
      ]);
    });

    it('should return an empty array if no selected values match', () => {
      const selectedValues = ['non-existent'];
      const result = mapSelectedValuesToMaskinportenScopes(selectedValues, allScopesMock);

      expect(result).toEqual([]);
    });

    it('should return an empty array if selected values is empty', () => {
      const selectedValues: string[] = [];
      const result = mapSelectedValuesToMaskinportenScopes(selectedValues, allScopesMock);

      expect(result).toEqual([]);
    });
  });

  describe('mapMaskinPortenScopesToScopeList', () => {
    it('should return an array of scope strings from MaskinportenScope objects', () => {
      const result = mapMaskinPortenScopesToScopeList(allScopesMock);

      expect(result).toEqual([scope1, scope2, scope3]);
    });

    it('should return an empty array if input is empty', () => {
      const result = mapMaskinPortenScopesToScopeList([]);

      expect(result).toEqual([]);
    });
  });
});
