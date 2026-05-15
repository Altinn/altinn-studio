import {
  mapSelectedValuesToMaskinportenScopes,
  mapMaskinPortenScopesToScopeList,
  combineSelectedAndMaskinportenScopes,
  isMandatoryMaskinportenScope,
  sortScopesForDisplay,
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

    it('sorts altinn serviceowner scopes first and the rest alphabetically', () => {
      const serviceOwnerReadScope: MaskinportenScope = {
        scope: 'altinn:serviceowner/instances.read',
        description: 'Service owner read',
      };
      const serviceOwnerWriteScope: MaskinportenScope = {
        scope: 'altinn:serviceowner/instances.write',
        description: 'Service owner write',
      };
      const selectedScopes: MaskinportenScope[] = [maskinportenScope3, serviceOwnerWriteScope];
      const maskinportenScopes: MaskinportenScope[] = [
        maskinportenScopeA,
        serviceOwnerReadScope,
        maskinportenScope2,
      ];

      const result = combineSelectedAndMaskinportenScopes(selectedScopes, maskinportenScopes);
      expect(result).toEqual([
        serviceOwnerReadScope,
        serviceOwnerWriteScope,
        maskinportenScope2,
        maskinportenScope3,
        maskinportenScopeA,
      ]);
    });
  });

  describe('sortScopesForDisplay', () => {
    it('does not mutate the input list', () => {
      const serviceOwnerScope: MaskinportenScope = {
        scope: 'altinn:serviceowner/instances.read',
        description: 'Service owner read',
      };
      const scopes: MaskinportenScope[] = [maskinportenScope2, serviceOwnerScope];

      const result = sortScopesForDisplay(scopes);

      expect(result).toEqual([serviceOwnerScope, maskinportenScope2]);
      expect(scopes).toEqual([maskinportenScope2, serviceOwnerScope]);
    });
  });

  describe('isMandatoryMaskinportenScope', () => {
    it('returns true for the mandatory serviceowner instance scopes', () => {
      expect(isMandatoryMaskinportenScope('altinn:serviceowner/instances.read')).toBe(true);
      expect(isMandatoryMaskinportenScope('altinn:serviceowner/instances.write')).toBe(true);
    });

    it('returns false for other serviceowner scopes', () => {
      expect(isMandatoryMaskinportenScope('altinn:serviceowner/other')).toBe(false);
    });
  });
});
