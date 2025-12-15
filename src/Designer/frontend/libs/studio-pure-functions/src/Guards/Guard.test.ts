import { Guard } from './Guard';

describe('Guard', () => {
  describe('AgainstNonJsonTypes', () => {
    it('Throws when file type is not json', () => {
      expect(() => Guard.againstNonJsonTypes('myFile.xsd')).toThrow();
    });

    it('Allows json files', () => {
      expect(() => Guard.againstNonJsonTypes('myFile.json')).not.toThrow();
    });
  });
});
