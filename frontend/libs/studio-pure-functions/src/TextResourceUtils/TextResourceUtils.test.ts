import type { TextResource } from '../types/TextResource';
import { ObjectUtils } from '../ObjectUtils';
import { TextResourceUtils } from './TextResourceUtils';
import type { TextResourceMap } from '../types/TextResourceMap';

const text1Id = '1';
const text2Id = '2';
const text3Id = '3';
const text1 = 'Hello World';
const text2 = 'Goodbye World';
const text3 = 'Hello Goodbye';
const textResource1: TextResource = { id: text1Id, value: text1 };
const textResource2: TextResource = { id: text2Id, value: text2 };
const textResource3: TextResource = { id: text3Id, value: text3 };
const textResourceEntries: Array<[string, TextResource]> = [
  [text1Id, textResource1],
  [text2Id, textResource2],
  [text3Id, textResource3],
];
const textResourcesToTest: TextResourceMap = new Map(textResourceEntries);
const textResourcesCopy: TextResourceMap = new Map(ObjectUtils.deepCopy(textResourceEntries));
const textResourceUtils: TextResourceUtils = new TextResourceUtils(textResourcesToTest);

describe('TextResourceUtils', () => {
  describe('get', () => {
    const result = textResourceUtils.get(text1Id);

    it('Returns the correct text resource by id', () => {
      expect(result).toEqual(textResource1);
    });

    it('Is pure', verifyInitialMapIsUnchanged);
  });

  describe('set', () => {
    describe('When the given ID does not exist', () => {
      const newTextResource: TextResource = { id: '4', value: 'New Text' };
      const result: TextResourceMap = textResourceUtils.set(newTextResource);

      it('Adds the new text resource', () => {
        expect(result.get(newTextResource.id)).toEqual(newTextResource);
        expect([...result.values()]).toEqual([...textResourcesToTest.values(), newTextResource]);
      });

      it('Is pure', verifyInitialMapIsUnchanged);
    });

    describe('When the given ID already exists', () => {
      const updatedTextResource: TextResource = { id: text1Id, value: 'Updated Text' };
      const result: TextResourceMap = textResourceUtils.set(updatedTextResource);

      it('Updates the existing text resource', () => {
        expect(result.get(text1Id)).toEqual(updatedTextResource);
        expect([...result.values()]).toEqual([updatedTextResource, textResource2, textResource3]);
      });

      it('Is pure', verifyInitialMapIsUnchanged);
    });
  });

  describe('delete', () => {
    const result = textResourceUtils.delete(text1Id);

    it('Removes the text resource with the given ID', () => {
      expect(result.get(text1Id)).toBeUndefined();
      expect([...result.values()]).toEqual([textResource2, textResource3]);
    });

    it('Is pure', verifyInitialMapIsUnchanged);
  });

  describe('asArray', () => {
    it('Converts the map to an array of text resources', () => {
      const result = textResourceUtils.asArray();
      expect(result).toEqual([textResource1, textResource2, textResource3]);
    });

    it('Is pure', verifyInitialMapIsUnchanged);
  });

  describe('fromArray', () => {
    it('Instantiates a new class from the given array', () => {
      const textResourceList: TextResource[] = [textResource1, textResource2, textResource3];
      const result = TextResourceUtils.fromArray(textResourceList);

      expect(result).toBeInstanceOf(TextResourceUtils);
      expect(result.get(textResource1.id)).toEqual(textResource1);
      expect(result.get(textResource2.id)).toEqual(textResource2);
      expect(result.get(textResource3.id)).toEqual(textResource3);
    });
  });
});

function verifyInitialMapIsUnchanged(): void {
  expect(textResourcesToTest).toEqual(textResourcesCopy);
}
