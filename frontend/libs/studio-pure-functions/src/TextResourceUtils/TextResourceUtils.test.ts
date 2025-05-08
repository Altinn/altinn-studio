import type { TextResource } from '../types/TextResource';
import { ObjectUtils } from '../ObjectUtils';
import { TextResourceUtils } from './TextResourceUtils';

const text1Id = '1';
const text2Id = '2';
const text3Id = '3';
const text1 = 'Hello World';
const text2 = 'Goodbye World';
const text3 = 'Hello Goodbye';
const textResource1: TextResource = { id: text1Id, value: text1 };
const textResource2: TextResource = { id: text2Id, value: text2 };
const textResource3: TextResource = { id: text3Id, value: text3 };
const textResourcesToTest: Array<TextResource> = [textResource1, textResource2, textResource3];
const textResourcesCopy = ObjectUtils.deepCopy(textResourcesToTest);
const textResourceUtils: TextResourceUtils = new TextResourceUtils(textResourcesToTest);

describe('TextResourceUtils', () => {
  describe('get', () => {
    const result = textResourceUtils.get(text1Id);

    it('Returns the correct text resource by id', () => {
      expect(result).toEqual(textResource1);
    });

    it('Is pure', verifyInitialObjectIsUnchanged);
  });

  describe('add', () => {
    const newTextResource: TextResource = { id: '4', value: 'New Text' };
    const result = textResourceUtils.add(newTextResource);

    it('Adds a new text resource', () => {
      expect(result).toContainEqual(newTextResource);
      expect(result).toHaveLength(textResourcesToTest.length + 1);
    });

    it('Is pure', verifyInitialObjectIsUnchanged);
  });

  describe('update', () => {
    const updatedTextResource: TextResource = { id: text1Id, value: 'Updated Text' };
    const result = textResourceUtils.update(updatedTextResource);

    it('Updates the text resource with the given ID', () => {
      expect(result).toContainEqual(updatedTextResource);
      expect(result).toHaveLength(textResourcesToTest.length);
    });

    it('Is pure', verifyInitialObjectIsUnchanged);
  });

  describe('remove', () => {
    const result = textResourceUtils.remove(text1Id);

    it('Removes the text resource', () => {
      expect(result).not.toContainEqual(textResource1);
      expect(result).toHaveLength(textResourcesToTest.length - 1);
    });

    it('Is pure', verifyInitialObjectIsUnchanged);
  });
});

function verifyInitialObjectIsUnchanged(): void {
  expect(textResourcesToTest).toEqual(textResourcesCopy);
}
