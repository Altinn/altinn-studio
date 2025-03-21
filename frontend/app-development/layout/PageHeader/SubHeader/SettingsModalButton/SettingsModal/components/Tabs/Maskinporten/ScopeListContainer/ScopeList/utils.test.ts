import {
  mapScopesToRowElements,
  mapRowElementsToSelectedScopes,
  filterOutCheckedRows,
  mapRowElementsToScopes,
  updateRowElementsCheckedState,
  toggleRowElementCheckedState,
  getAllElementsChecked,
  getSomeElementsChecked,
  getAllElementsDisabled,
} from './utils';
import { type StudioCheckboxTableRowElement } from '@studio/components-legacy';
import { type MaskinportenScope } from 'app-shared/types/MaskinportenScope';

// Mock data
const mockScopeLabel1: string = 'scope1';
const mockScopeLabel2: string = 'scope2';
const mockScopeLabel3: string = 'scope3';
const mockScopeLabel4: string = 'scope4';

const mockDescription1: string = 'description1';
const mockDescription2: string = 'description2';
const mockDescription3: string = 'description3';
const mockDescription4: string = 'description4';

const mockScope1: MaskinportenScope = { scope: mockScopeLabel1, description: mockDescription1 };
const mockScope2: MaskinportenScope = { scope: mockScopeLabel2, description: mockDescription2 };
const mockScope3: MaskinportenScope = { scope: mockScopeLabel3, description: mockDescription3 };
const mockScope4: MaskinportenScope = { scope: mockScopeLabel4, description: mockDescription4 };

const mockScopes: MaskinportenScope[] = [mockScope1, mockScope2, mockScope3];
const mockSelectedScopes: MaskinportenScope[] = [mockScope2, mockScope4];

const mockRowElement1: StudioCheckboxTableRowElement = {
  value: mockScopeLabel1,
  label: mockScopeLabel1,
  description: mockDescription1,
  checked: false,
  disabled: false,
};
const mockRowElement2: StudioCheckboxTableRowElement = {
  value: mockScopeLabel2,
  label: mockScopeLabel2,
  description: mockDescription2,
  checked: true,
  disabled: false,
};
const mockRowElement3: StudioCheckboxTableRowElement = {
  value: mockScopeLabel3,
  label: mockScopeLabel3,
  description: mockDescription3,
  checked: false,
  disabled: false,
};
const mockRowElement4: StudioCheckboxTableRowElement = {
  value: mockScopeLabel4,
  label: mockScopeLabel4,
  description: mockDescription4,
  checked: true,
  disabled: true,
};
const mockRowElements: StudioCheckboxTableRowElement[] = [
  mockRowElement1,
  mockRowElement2,
  mockRowElement3,
  mockRowElement4,
];

describe('ScopeList utils functions', () => {
  describe('mapScopesToRowElements', () => {
    it('should map scopes to checkbox table row elements correctly', () => {
      const result = mapScopesToRowElements(mockScopes, mockSelectedScopes);

      expect(result).toEqual([mockRowElement1, mockRowElement2, mockRowElement3, mockRowElement4]);
    });

    it('should return an empty array when both lists are empty', () => {
      const result = mapScopesToRowElements([], []);

      expect(result).toEqual([]);
    });

    it('should return only selected scopes when scopes list is empty, where the scopes are checked and disabled', () => {
      const result = mapScopesToRowElements([], mockSelectedScopes);

      expect(result).toEqual([{ ...mockRowElement2, disabled: true }, mockRowElement4]);
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

      expect(result).toEqual([mockRowElement2, mockRowElement4]);
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

    it('should set description to empty string when description is undefined', () => {
      const result = mapRowElementsToScopes([{ ...mockRowElement2, description: undefined }]);
      expect(result).toEqual([{ ...mockScope2, description: '' }]);
    });
  });

  describe('mapRowElementsToSelectedScopes', () => {
    it('should map selected checkbox table row elements to Maskinporten scopes', () => {
      const result = mapRowElementsToSelectedScopes(mockRowElements);

      expect(result).toEqual([mockScope2, mockScope4]);
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

  describe('updateRowElementsCheckedState', () => {
    it('should update checked state to the opposite of areAllChecked for non-disabled elements', () => {
      const areAllChecked = false;
      const result = updateRowElementsCheckedState(mockRowElements, areAllChecked);

      expect(result).toEqual([
        { ...mockRowElement1, checked: !mockRowElement1.checked },
        mockRowElement2,
        { ...mockRowElement3, checked: !mockRowElement3.checked },
        mockRowElement4,
      ]);
    });

    it('should keep the checked state as is for disabled elements', () => {
      const areAllChecked = true;
      const result = updateRowElementsCheckedState(mockRowElements, areAllChecked);

      expect(result).toEqual([
        mockRowElement1,
        { ...mockRowElement2, checked: !mockRowElement2.checked },
        mockRowElement3,
        mockRowElement4,
      ]);
    });

    it('should return the same elements when no row is updated', () => {
      const areAllChecked = true;
      const rowElementsWithNoChanges: StudioCheckboxTableRowElement[] = [
        { ...mockRowElement3, checked: mockRowElement3.checked },
      ];

      const result = updateRowElementsCheckedState(rowElementsWithNoChanges, areAllChecked);
      expect(result).toEqual([{ ...mockRowElement3, checked: mockRowElement3.checked }]);
    });

    it('should return an empty array when the input is empty', () => {
      const result = updateRowElementsCheckedState([], false);
      expect(result).toEqual([]);
    });
  });

  describe('toggleRowElementCheckedState', () => {
    it('should toggle checked state of the selected scope', () => {
      const result = toggleRowElementCheckedState(mockRowElements, mockScopeLabel2);

      expect(result).toEqual([
        mockRowElement1,
        { ...mockRowElement2, checked: !mockRowElement2.checked },
        mockRowElement3,
        mockRowElement4,
      ]);
    });

    it('should not modify the row elements if selectedScope does not match any value', () => {
      const result = toggleRowElementCheckedState(mockRowElements, 'noMatch');

      expect(result).toEqual(mockRowElements);
    });
  });

  describe('getAllElementsChecked', () => {
    it('should return true if all elements are checked or disabled', () => {
      const elements = [mockRowElement2, mockRowElement4];
      expect(getAllElementsChecked(elements)).toBe(true);
    });

    it('should return false if any element is not checked and not disabled', () => {
      const elements = [mockRowElement1, mockRowElement3];
      expect(getAllElementsChecked(elements)).toBe(false);
    });

    it('should return true for an empty array', () => {
      expect(getAllElementsChecked([])).toBe(true);
    });
  });

  describe('getSomeElementsChecked', () => {
    it('should return true if at least one element is checked', () => {
      const elements = [mockRowElement1, mockRowElement2, mockRowElement3];
      expect(getSomeElementsChecked(elements)).toBe(true);
    });

    it('should return false if no elements are checked', () => {
      const elements = [mockRowElement1, mockRowElement3];
      expect(getSomeElementsChecked(elements)).toBe(false);
    });

    it('should return false for an empty array', () => {
      expect(getSomeElementsChecked([])).toBe(false);
    });
  });

  describe('getAllElementsDisabled', () => {
    it('should return true if all elements are disabled', () => {
      const elements = [{ ...mockRowElement1, disabled: true }, mockRowElement4];
      expect(getAllElementsDisabled(elements)).toBe(true);
    });

    it('should return false if any element is not disabled', () => {
      const elements = [mockRowElement1, mockRowElement3];
      expect(getAllElementsDisabled(elements)).toBe(false);
    });

    it('should return true for an empty array', () => {
      expect(getAllElementsDisabled([])).toBe(true);
    });
  });
});
