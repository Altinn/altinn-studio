import { removeExtension, removeSchemaExtension } from 'app-shared/utils/filenameUtils';

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

  describe('removeSchemaExtension', () => {
    it('Removes .schema.json extension from filename if it exists', () => {
      expect(removeSchemaExtension('filename.schema.json')).toEqual('filename');
      expect(removeSchemaExtension('filename.SCHEMA.JSON')).toEqual('filename');
    });

    it('Removes .xsd extension from filename if it exists', () => {
      expect(removeSchemaExtension('filename.xsd')).toEqual('filename');
      expect(removeSchemaExtension('filename.XSD')).toEqual('filename');
    });

    it('Returns entire input string if there is no .schema.json or .xsd extension', () => {
      expect(removeSchemaExtension('filename.xml')).toEqual('filename.xml');
    });
  });
});
