import { Guard } from './Guard';

describe('Guard', () => {
  describe('AgainstNonJsonTypes', () => {
    it('Throws when file type is not json', () => {
      expect(() => Guard.AgainstNonJsonTypes('myFile.xsd')).toThrow();
    });

    it('Allows json files', () => {
      expect(() => Guard.AgainstNonJsonTypes('myFile.json')).not.toThrow();
    });
  });
});
