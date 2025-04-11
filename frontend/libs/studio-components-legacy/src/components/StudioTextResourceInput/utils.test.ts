import {
  changeTextResourceInList,
  editTextResourceValue,
  getTextResourceById,
  determineDefaultMode,
  createNewTextResource,
} from './utils';
import { textResourcesMock } from '../../test-data/textResourcesMock';
import type { TextResource } from '../../types/TextResource';
import { Mode } from './types/Mode';

describe('utils', () => {
  describe('getTextResourceById', () => {
    it('Returns the text resource with the given ID', () => {
      const result = getTextResourceById(textResourcesMock, 'land.NO');
      expect(result).toEqual({ id: 'land.NO', value: 'Norge' });
    });

    it('Returns undefined when the text resource with the given ID does not exist', () => {
      const result = getTextResourceById(textResourcesMock, 'non-existing-id');
      expect(result).toBeUndefined();
    });
  });

  describe('editTextResourceValue', () => {
    it('Changes the value of the given text resource', () => {
      const currentValue = 'Lorem ipsum';
      const textResource: TextResource = { id: 'land.NO', value: currentValue, variables: [] };
      const newValue = 'Dolor sit amet';
      const result = editTextResourceValue(textResource, newValue);
      expect(result).toEqual({ id: 'land.NO', value: newValue, variables: [] });
    });

    it('Returns a new object', () => {
      const textResource: TextResource = { id: 'test', value: 'Test' };
      const result = editTextResourceValue(textResource, 'Updated value');
      expect(result).not.toBe(textResource);
    });
  });

  describe('changeTextResourceInList', () => {
    it('Changes the text resource with the given ID in the list', () => {
      const textResource0 = { id: '0', value: 'Test 0' };
      const textResource1 = { id: '1', value: 'Test 1' };
      const textResource2 = { id: '2', value: 'Test 2' };
      const textResources = [textResource0, textResource1, textResource2];
      const newTextResource1 = { id: '1', value: 'Updated value' };
      const result = changeTextResourceInList(textResources, newTextResource1);
      expect(result).toEqual([textResource0, newTextResource1, textResource2]);
    });

    it('Returns a new array', () => {
      const textResources = [{ id: '0', value: 'Test 0' }];
      const newTextResource = { id: '0', value: 'Updated value' };
      const result = changeTextResourceInList(textResources, newTextResource);
      expect(result).not.toBe(textResources);
    });
  });

  describe('determineDefaultMode', () => {
    it('Returns "editValue" when a valid ID is given', () => {
      const result = determineDefaultMode('land.NO');
      expect(result).toBe(Mode.EditValue);
    });

    it.each([
      ['an empty string', ''],
      ['null', null],
      ['undefined', undefined],
    ])('Returns "search" when the ID is %s', (_, id) => {
      const result = determineDefaultMode(id);
      expect(result).toBe(Mode.Search);
    });
  });

  describe('createNewTextResource', () => {
    it('Returns a text resource with a generated id', () => {
      const value: string = 'Lorem ipsum';
      const result: TextResource = createNewTextResource(value);
      expect(result.value).toBe('Lorem ipsum');
      expect(result.id).toMatch(/^id_[1-9][0-9]{3}$/);
    });
  });
});
