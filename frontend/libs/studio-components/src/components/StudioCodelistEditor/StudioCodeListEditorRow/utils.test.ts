import type { CodeListItem } from '../types/CodeListItem';
import { ObjectUtils } from '@studio/pure-functions';
import { changeDescription, changeLabel, changeValue } from './utils';

// Test data:
const testItem: CodeListItem = {
  label: 'Test 1',
  value: 'test1',
  description: 'Test 1 description',
};
const createTestItem = (): CodeListItem => ObjectUtils.deepCopy(testItem);

describe('StudioCodeListEditorRow utils', () => {
  describe('changeLabel', () => {
    it('Changes the label of the code list item', () => {
      const item = createTestItem();
      const newLabel = 'Updated label';
      const updatedItem = changeLabel(item, newLabel);
      expect(updatedItem.label).toBe(newLabel);
    });

    it('Returns a new instance', () => {
      const item = createTestItem();
      const updatedItem = changeLabel(item, 'Updated label');
      expect(updatedItem).not.toBe(item);
    });
  });

  describe('changeDescription', () => {
    it('Changes the description of the code list item', () => {
      const item = createTestItem();
      const newDescription = 'Updated description';
      const updatedItem = changeDescription(item, newDescription);
      expect(updatedItem.description).toBe(newDescription);
    });

    it('Returns a new instance', () => {
      const item = createTestItem();
      const updatedItem = changeDescription(item, 'Updated description');
      expect(updatedItem).not.toBe(item);
    });
  });

  describe('changeValue', () => {
    it('Changes the value of the code list item', () => {
      const item = createTestItem();
      const newValue = 'updatedValue';
      const updatedItem = changeValue(item, newValue);
      expect(updatedItem.value).toBe(newValue);
    });

    it('Returns a new instance', () => {
      const item = createTestItem();
      const updatedItem = changeValue(item, 'updatedValue');
      expect(updatedItem).not.toBe(item);
    });
  });
});
