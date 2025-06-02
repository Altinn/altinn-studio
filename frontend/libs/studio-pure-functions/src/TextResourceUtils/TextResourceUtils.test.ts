import type { TextResource } from '../types/TextResource';
import { ObjectUtils } from '../ObjectUtils';
import { TextResourceUtils } from './TextResourceUtils';
import type { TextResourceMap } from '../types/TextResourceMap';
import type { TextResourcesWithLanguage } from '../types/TextResourcesWithLanguage';

const text1Id = '1';
const text2Id = '2';
const text3Id = '3';
const text1 = 'Hello World';
const text2 = 'Goodbye World';
const text3 = 'Hello Goodbye';
const textResource1: TextResource = { id: text1Id, value: text1 };
const textResource2: TextResource = { id: text2Id, value: text2, customData: 'test' };
const textResource3: TextResource = { id: text3Id, value: text3, otherCustomData: 'Lorem ipsum' };
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

  describe('getValueIfExists', () => {
    it('Returns the value of the text resource when it exists', () => {
      const result = textResourceUtils.getValueIfExists(text1Id);
      expect(result).toEqual(text1);
    });

    it('Returns null when the text resource does not exist', () => {
      const result = textResourceUtils.getValueIfExists('nonexistentId');
      expect(result).toBeNull();
    });

    it('Is pure', () => {
      textResourceUtils.getValueIfExists(text1Id);
      verifyInitialMapIsUnchanged();
    });
  });

  describe('withLanguage', () => {
    const language = 'en';
    const result = textResourceUtils.withLanguage(language);

    it('Returns a TextResourcesWithLanguage object with the given language', () => {
      const expectedResult: TextResourcesWithLanguage = {
        language,
        resources: [textResource1, textResource2, textResource3],
      };
      expect(result).toEqual(expectedResult);
    });

    it('Is pure', verifyInitialMapIsUnchanged);
  });

  describe('set', () => {
    describe('When the given ID does not exist', () => {
      const newTextResource: TextResource = { id: '4', value: 'New Text' };
      const result: TextResourceUtils = textResourceUtils.set(newTextResource);

      it('Adds the new text resource', () => {
        expect(result.get(newTextResource.id)).toEqual(newTextResource);
        expect(result.asArray()).toEqual([...textResourcesToTest.values(), newTextResource]);
      });

      it('Is pure', verifyInitialMapIsUnchanged);
    });

    describe('When the given ID already exists', () => {
      const updatedTextResource: TextResource = { id: text1Id, value: 'Updated Text' };
      const result: TextResourceUtils = textResourceUtils.set(updatedTextResource);

      it('Updates the existing text resource', () => {
        expect(result.get(text1Id)).toEqual(updatedTextResource);
        expect(result.asArray()).toEqual([updatedTextResource, textResource2, textResource3]);
      });

      it('Is pure', verifyInitialMapIsUnchanged);
    });
  });

  describe('setValues', () => {
    describe('When updating existing resources', () => {
      const updatedValues = {
        [text1Id]: 'Updated Hello World',
        [text2Id]: 'Updated Goodbye World',
      };
      const result: TextResourceUtils = textResourceUtils.setValues(updatedValues);

      it('Updates the values of the specified text resources', () => {
        expect(result.get(text1Id)?.value).toEqual(updatedValues[text1Id]);
        expect(result.get(text2Id)?.value).toEqual(updatedValues[text2Id]);
        expect(result.get(text3Id)?.value).toEqual(text3);
      });

      it('Leaves other text resources unchanged', () => {
        expect(result.get(text3Id)?.value).toEqual(text3);
      });

      it('Keeps the custom data intact', () => {
        expect(result.get(text2Id)?.customData).toEqual(textResource2.customData);
        expect(result.get(text3Id)?.otherCutomData).toEqual(textResource3.otherCutomData);
      });

      it('Is pure', verifyInitialMapIsUnchanged);
    });

    describe('When called with a non-existent ID', () => {
      const newId = 'nonExistentId';
      const newValue = 'New Value';
      const data: Record<string, string> = { [newId]: newValue };
      const result: TextResourceUtils = textResourceUtils.setValues(data);

      it('Adds a new text resource with the given data', () => {
        const expectedNewResource: TextResource = {
          id: newId,
          value: newValue,
        };
        expect(result.get(newId)).toEqual(expectedNewResource);
      });

      it('Is pure', verifyInitialMapIsUnchanged);
    });
  });

  describe('setMultiple', () => {
    const newTextResource: TextResource = { id: '4', value: 'New Text' };
    const updatedTextResource: TextResource = { id: text1Id, value: 'Updated Text' };
    const result: TextResourceUtils = textResourceUtils.setMultiple([
      newTextResource,
      updatedTextResource,
    ]);

    it('Adds new text resources and updates the existing ones', () => {
      expect(result.get(newTextResource.id)).toEqual(newTextResource);
      expect(result.get(updatedTextResource.id)).toEqual(updatedTextResource);
      expect(result.asArray()).toEqual([
        updatedTextResource,
        textResource2,
        textResource3,
        newTextResource,
      ]);
    });

    it('Is pure', verifyInitialMapIsUnchanged);
  });

  describe('prependOrUpdateMultiple', () => {
    const newTextResource1: TextResource = { id: '4', value: 'New Text' };
    const newTextResource2: TextResource = { id: '5', value: 'Another New Text' };
    const updatedTextResource1: TextResource = { id: text1Id, value: 'Updated Text' };
    const updatedTextResource2: TextResource = { id: text2Id, value: 'Another Updated Text' };
    const result: TextResourceUtils = textResourceUtils.prependOrUpdateMultiple([
      newTextResource1,
      updatedTextResource1,
      newTextResource2,
      updatedTextResource2,
    ]);

    it('Prepends new text resources and updates the existing ones', () => {
      expect(result.asArray()).toEqual([
        newTextResource1,
        newTextResource2,
        updatedTextResource1,
        updatedTextResource2,
        textResource3,
      ]);
    });

    it('Is pure', verifyInitialMapIsUnchanged);
  });

  describe('delete', () => {
    const result: TextResourceUtils = textResourceUtils.delete(text1Id);

    it('Removes the text resource with the given ID', () => {
      expect(result.get(text1Id)).toBeUndefined();
      expect(result.asArray()).toEqual([textResource2, textResource3]);
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
