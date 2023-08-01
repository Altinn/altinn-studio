import { removeExtension } from 'app-shared/utils/filenameUtils';

describe('filenameUtils', () => {
  describe('removeExtension', () => {
    it('Removes extension from filename if it exists', () => {
      expect(removeExtension('filename.txt')).toEqual('filename');
      expect(removeExtension('filename.xsd')).toEqual('filename');
      expect(removeExtension('.abc')).toEqual('');
      expect(removeExtension('filename.schema.json')).toEqual('filename.schema');
    });

    it('Returns entire input string if there is no extension', () => {
      expect(removeExtension('filename')).toEqual('filename');
    });
  });
});
