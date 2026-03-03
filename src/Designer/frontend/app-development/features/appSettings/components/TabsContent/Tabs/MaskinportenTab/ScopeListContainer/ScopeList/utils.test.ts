import {
  mapSelectedValuesToMaskinportenScopes,
  mapMaskinPortenScopesToScopeList,
  combineSelectedAndMaskinportenScopes,
} from './utils';
import type { MaskinportenScope } from 'app-shared/types/MaskinportenScope';

const scope1: string = 'scope1';
const scope2: string = 'scope2';
const scope3: string = 'scope3';
const scopeA: string = 'scopeA';
const description1: string = 'Scope 1';
const description2: string = 'Scope 2';
const description3: string = 'Scope 3';
const descriptionA: string = 'Scope A';

const maskinportenScope1: MaskinportenScope = { scope: scope1, description: description1 };
const maskinportenScope2: MaskinportenScope = { scope: scope2, description: description2 };
const maskinportenScope3: MaskinportenScope = { scope: scope3, description: description3 };
const maskinportenScopeA: MaskinportenScope = { scope: scopeA, description: descriptionA };

const allScopesMock: MaskinportenScope[] = [
  maskinportenScope1,
  maskinportenScope2,
  maskinportenScope3,
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

  describe('combineSelectedAndMaskinportenScopes', () => {
    it('returns an empty array when both inputs are empty', () => {
      const result = combineSelectedAndMaskinportenScopes([], []);
      expect(result).toEqual([]);
    });

    it('returns only maskinportenScopes when selectedScopes is empty', () => {
      const maskinportenScopes: MaskinportenScope[] = [maskinportenScope1, maskinportenScope2];
      const result = combineSelectedAndMaskinportenScopes([], maskinportenScopes);
      expect(result).toEqual(maskinportenScopes);
    });

    it('returns only selectedScopes when maskinportenScopes is empty', () => {
      const selectedScopes: MaskinportenScope[] = [maskinportenScope1, maskinportenScope2];
      const result = combineSelectedAndMaskinportenScopes(selectedScopes, []);
      expect(result).toEqual(selectedScopes);
    });

    it('merges scopes and excludes duplicates when it exists', () => {
      const selectedScopes: MaskinportenScope[] = [maskinportenScope1];
      const maskinportenScopes: MaskinportenScope[] = [maskinportenScope1, maskinportenScope2];

      const result = combineSelectedAndMaskinportenScopes(selectedScopes, maskinportenScopes);

      expect(result).toEqual([maskinportenScope1, maskinportenScope2]);
    });

    it('sorts selected scopes first and sorts both groups alphabetically', () => {
      const selectedScopes: MaskinportenScope[] = [maskinportenScope3, maskinportenScope1];
      const maskinportenScopes: MaskinportenScope[] = [maskinportenScopeA, maskinportenScope2];

      const result = combineSelectedAndMaskinportenScopes(selectedScopes, maskinportenScopes);
      expect(result).toEqual([
        maskinportenScope1,
        maskinportenScope3,
        maskinportenScope2,
        maskinportenScopeA,
      ]);
    });
  });
});
