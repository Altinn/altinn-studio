import {
  editTextResourceValue,
  createNewTextResource,
  generateRandomTextResourceId,
} from './utils';
import type { TextResource } from '../../../../studio-pure-functions/src/types/TextResource';

describe('utils', () => {
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

  describe('createNewTextResource', () => {
    it('Returns a text resource with a generated id', () => {
      const value: string = 'Lorem ipsum';
      const result: TextResource = createNewTextResource(value);
      expect(result.value).toBe('Lorem ipsum');
      expect(result.id).toEqual(expect.any(String));
    });
  });

  describe('generateRandomTextResourceId', () => {
    const numberOfIds = 1000;
    const ids: string[] = [];
    for (let i = 0; i < numberOfIds; i++) {
      ids.push(generateRandomTextResourceId());
    }

    it('Returns a string with the correct format', () => {
      ids.forEach((id: string) => {
        expect(id).toMatch(/^id_[a-zA-Z0-9]{12}$/);
      });
    });

    it('Returns a different ID each time', () => {
      const idSet = new Set(ids);
      expect(idSet.size).toBe(numberOfIds);
    });
  });
});
