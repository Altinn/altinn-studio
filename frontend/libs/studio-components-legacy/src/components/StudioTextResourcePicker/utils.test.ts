import { textResourcesMock } from '../../test-data/textResourcesMock';
import { retrieveSelectedValues } from './utils';

describe('utils', () => {
  describe('retrieveSelectedValues', () => {
    it('Returns an array with the value when the text resource exists', () => {
      const textResources = textResourcesMock;
      const arbitraryTextResourceIndex = 129;
      const textResource = textResources[arbitraryTextResourceIndex];
      expect(retrieveSelectedValues(textResources, textResource.id)).toEqual([textResource.id]);
    });

    it('Returns an empty array when the text resource does not exist', () => {
      const textResources = textResourcesMock;
      const idThatDoesNotExist = 'does-not-exist';
      expect(retrieveSelectedValues(textResources, idThatDoesNotExist)).toEqual([]);
    });

    it.each([null, undefined])('Returns an empty array when the value is %s', (value) => {
      expect(retrieveSelectedValues(textResourcesMock, value)).toEqual([]);
    });
  });
});
