import { textResourcesMock } from '../../test-data/textResourcesMock';
import { doesTextResourceExist } from './utils';

describe('utils', () => {
  describe('doesTextResourceExist', () => {
    it('Returns true when the text resource exists', () => {
      const textResources = textResourcesMock;
      const arbitraryTextResourceIndex = 129;
      const textResource = textResources[arbitraryTextResourceIndex];
      expect(doesTextResourceExist(textResources, textResource.id)).toBe(true);
    });

    it('Returns false when the text resource does not exist', () => {
      const textResources = textResourcesMock;
      const idThatDoesNotExist = 'does-not-exist';
      expect(doesTextResourceExist(textResources, idThatDoesNotExist)).toBe(false);
    });
  });
});
