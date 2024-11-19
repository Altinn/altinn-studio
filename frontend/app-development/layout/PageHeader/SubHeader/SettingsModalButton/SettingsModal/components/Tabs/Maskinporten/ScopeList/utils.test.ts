import {
  mapScopesToRowElements,
  mapRowElementsToSelectedScopes,
  filterOutCheckedRows,
  mapRowElementsToScopes,
} from './utils';
import { type StudioCheckboxTableRowElement } from '@studio/components';
import { type MaskinportenScope } from 'app-shared/types/MaskinportenScope';

// Mock data
const mockScopeLabel1: string = 'scope1';
const mockScopeLabel2: string = 'scope2';
const mockScopeLabel3: string = 'scope3';

const mockDescription1: string = 'description1';
const mockDescription2: string = 'description2';
const mockDescription3: string = 'description3';

const mockScope1: MaskinportenScope = { scope: mockScopeLabel1, description: mockDescription1 };
const mockScope2: MaskinportenScope = { scope: mockScopeLabel2, description: mockDescription2 };
const mockScope3: MaskinportenScope = { scope: mockScopeLabel3, description: mockDescription3 };

const mockScopes: MaskinportenScope[] = [mockScope1, mockScope2, mockScope3];
const mockSelectedScopes: MaskinportenScope[] = [mockScope2];

const mockRowElement1: StudioCheckboxTableRowElement = {
  value: mockScopeLabel1,
  label: mockScopeLabel1,
  description: mockDescription1,
  checked: false,
};
const mockRowElement2: StudioCheckboxTableRowElement = {
  value: mockScopeLabel2,
  label: mockScopeLabel2,
  description: mockDescription2,
  checked: true,
};
const mockRowElement3: StudioCheckboxTableRowElement = {
  value: mockScopeLabel3,
  label: mockScopeLabel3,
  description: mockDescription3,
  checked: false,
};
const mockRowElements: StudioCheckboxTableRowElement[] = [
  mockRowElement1,
  mockRowElement2,
  mockRowElement3,
];

describe('ScopeList utils functions', () => {
  describe('mapScopesToRowElements', () => {
    it('should map scopes to checkbox table row elements correctly', () => {
      const result = mapScopesToRowElements(mockScopes, mockSelectedScopes);

      expect(result).toEqual([mockRowElement1, mockRowElement2, mockRowElement3]);
    });

    it('should return an empty array when scopes list is empty', () => {
      const result = mapScopesToRowElements([], mockSelectedScopes);

      expect(result).toEqual([]);
    });

    it('should return all unchecked elements when selectedScopes is empty', () => {
      const result = mapScopesToRowElements(mockScopes, []);

      expect(result).toEqual([
        { ...mockRowElement1, checked: false },
        { ...mockRowElement2, checked: false },
        { ...mockRowElement3, checked: false },
      ]);
    });
  });

  describe('filterOutCheckedRows', () => {
    it('should filter out rows where "checked" is true', () => {
      const result = filterOutCheckedRows(mockRowElements);

      expect(result).toEqual([mockRowElement2]);
    });

    it('should return an empty array when input list is empty', () => {
      const result = filterOutCheckedRows([]);

      expect(result).toEqual([]);
    });

    it('should return an empty array when no rows are checked', () => {
      const uncheckedRows = mockRowElements.map((row) => ({ ...row, checked: false }));
      const result = filterOutCheckedRows(uncheckedRows);

      expect(result).toEqual([]);
    });
  });

  describe('mapRowElementsToScopes', () => {
    it('should map checkbox table row elements to Maskinporten scopes correctly', () => {
      const result = mapRowElementsToScopes([mockRowElement2]);

      expect(result).toEqual([mockScope2]);
    });

    it('should return an empty array when input list is empty', () => {
      const result = mapRowElementsToScopes([]);

      expect(result).toEqual([]);
    });
  });

  describe('mapRowElementsToSelectedScopes', () => {
    it('should map selected checkbox table row elements to Maskinporten scopes', () => {
      const result = mapRowElementsToSelectedScopes(mockRowElements);

      expect(result).toEqual([mockScope2]);
    });

    it('should return an empty array when input list is empty', () => {
      const result = mapRowElementsToSelectedScopes([]);

      expect(result).toEqual([]);
    });

    it('should return an empty array when no rows are checked', () => {
      const uncheckedRows = mockRowElements.map((row) => ({ ...row, checked: false }));
      const result = mapRowElementsToSelectedScopes(uncheckedRows);

      expect(result).toEqual([]);
    });
  });
});
