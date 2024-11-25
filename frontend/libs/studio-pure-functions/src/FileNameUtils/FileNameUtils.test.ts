import { FileNameUtils, FileNameValidationResult } from './FileNameUtils';

describe('FileNameUtils', () => {
  describe('removeExtension', () => {
    it('Removes extension from filename if it exists', () => {
      expect(FileNameUtils.removeExtension('filename.txt')).toEqual('filename');
      expect(FileNameUtils.removeExtension('filename.xsd')).toEqual('filename');
      expect(FileNameUtils.removeExtension('.abc')).toEqual('');
      expect(FileNameUtils.removeExtension('filename.schema.json')).toEqual('filename.schema');
    });

    it('Removes the extension for filenames with special characters', () => {
      expect(FileNameUtils.removeExtension('file name.txt')).toBe('file name');
      expect(FileNameUtils.removeExtension('my-file.name$!.txt')).toBe('my-file.name$!');
      expect(FileNameUtils.removeExtension('.hiddenfile.txt')).toBe('.hiddenfile');
      expect(FileNameUtils.removeExtension('file123.456.txt')).toBe('file123.456');
    });

    it('Returns same input string if there is no extension', () => {
      expect(FileNameUtils.removeExtension('filename')).toEqual('filename');
      expect(FileNameUtils.removeExtension('')).toEqual('');
    });

    it('returns an empty string if the filename starts with dot', () => {
      expect(FileNameUtils.removeExtension('.hiddenfile')).toBe('');
      expect(FileNameUtils.removeExtension('.')).toBe('');
    });
  });

  describe('removeSchemaExtension', () => {
    it('Removes .schema.json extension from filename if it exists', () => {
      expect(FileNameUtils.removeSchemaExtension('filename.schema.json')).toEqual('filename');
      expect(FileNameUtils.removeSchemaExtension('filename.SCHEMA.JSON')).toEqual('filename');
    });

    it('Removes .xsd extension from filename if it exists', () => {
      expect(FileNameUtils.removeSchemaExtension('filename.xsd')).toEqual('filename');
      expect(FileNameUtils.removeSchemaExtension('filename.XSD')).toEqual('filename');
    });

    it('Returns entire input string if there is no .schema.json or .xsd extension', () => {
      expect(FileNameUtils.removeSchemaExtension('filename.xml')).toEqual('filename.xml');
    });
  });

  describe('isXsdFile', () => {
    it('Returns true if filename has an XSD extension', () => {
      expect(FileNameUtils.isXsdFile('filename.xsd')).toBe(true);
      expect(FileNameUtils.isXsdFile('filename.XSD')).toBe(true);
    });

    it('Returns false if filename does not have an XSD extension', () => {
      expect(FileNameUtils.isXsdFile('filename.schema.json')).toBe(false);
      expect(FileNameUtils.isXsdFile('filename')).toBe(false);
    });
  });

  describe('extractFileName', () => {
    it('Returns filename if path contains a slash', () => {
      expect(FileNameUtils.extractFileName('/path/to/filename')).toEqual('filename');
      expect(FileNameUtils.extractFileName('/path/to/filename.json')).toEqual('filename.json');
    });

    it('Returns path if path does not contain a slash', () => {
      expect(FileNameUtils.extractFileName('filename')).toEqual('filename');
      expect(FileNameUtils.extractFileName('filename.json')).toEqual('filename.json');
    });
  });

  describe('removeFileNameFromPath', () => {
    it('Returns file path without file name', () => {
      expect(FileNameUtils.removeFileNameFromPath('/path/to/filename')).toEqual('/path/to/');
      expect(FileNameUtils.removeFileNameFromPath('/path/to/filename.json')).toEqual('/path/to/');
    });

    it('Returns file path without file name and last slash if "excludeLastSlash" is true', () => {
      expect(FileNameUtils.removeFileNameFromPath('/path/to/filename', true)).toEqual('/path/to');
      expect(FileNameUtils.removeFileNameFromPath('/path/to/filename.json', true)).toEqual(
        '/path/to',
      );
    });

    it('Returns empty string if path is only fileName', () => {
      expect(FileNameUtils.removeFileNameFromPath('filename')).toEqual('');
      expect(FileNameUtils.removeFileNameFromPath('filename.json')).toEqual('');
    });

    it('Returns empty string if path is only fileName and "excludeLastSlash" is true', () => {
      expect(FileNameUtils.removeFileNameFromPath('filename', true)).toEqual('');
      expect(FileNameUtils.removeFileNameFromPath('filename.json', true)).toEqual('');
    });
  });

  describe('validateFileName', () => {
    it('Returns "FileNameIsEmpty" when file name is empty', () => {
      const fileName: string = '';
      const fileNameValidation: FileNameValidationResult = FileNameUtils.validateFileName(
        fileName,
        [],
      );
      expect(fileNameValidation).toBe(FileNameValidationResult.FileNameIsEmpty);
    });

    it('Returns "NoRegExMatch" when file name does not match given regex', () => {
      const fileName: string = 'ABC';
      const fileNameRegEx: RegExp = /^[a-z]+$/;
      const fileNameValidation: FileNameValidationResult = FileNameUtils.validateFileName(
        fileName,
        [],
        fileNameRegEx,
      );
      expect(fileNameValidation).toBe(FileNameValidationResult.NoRegExMatch);
    });

    it('Returns "FileExists" when file name matches regEx and exists in list', () => {
      const fileName: string = 'fileName1';
      const invalidFileNames: string[] = ['fileName1', 'fileName2', 'fileName3'];
      const fileNameRegEx: RegExp = /^[a-zA-Z0-9]+$/;
      const fileNameValidation: FileNameValidationResult = FileNameUtils.validateFileName(
        fileName,
        invalidFileNames,
        fileNameRegEx,
      );
      expect(fileNameValidation).toBe(FileNameValidationResult.FileExists);
    });

    it('Returns "FileExists" when no regEx is provided and exists in list', () => {
      const fileName: string = 'fileName1';
      const invalidFileNames: string[] = ['fileName1', 'fileName2', 'fileName3'];
      const fileNameValidation: FileNameValidationResult = FileNameUtils.validateFileName(
        fileName,
        invalidFileNames,
      );
      expect(fileNameValidation).toBe(FileNameValidationResult.FileExists);
    });

    it('Returns "Valid" when file name matches regEx and does not exist in list of invalid names', () => {
      const fileName: string = 'fileName';
      const invalidFileNames: string[] = ['fileName2', 'fileName3'];
      const fileNameRegEx: RegExp = /^[a-zA-Z]+$/;
      const fileNameValidation: FileNameValidationResult = FileNameUtils.validateFileName(
        fileName,
        invalidFileNames,
        fileNameRegEx,
      );
      expect(fileNameValidation).toBe(FileNameValidationResult.Valid);
    });

    it('Returns "Valid" when no regEx is provided and file name does not exist in list of invalid names', () => {
      const fileName: string = 'fileName';
      const invalidFileNames: string[] = ['fileName2', 'fileName3'];
      const fileNameValidation: FileNameValidationResult = FileNameUtils.validateFileName(
        fileName,
        invalidFileNames,
      );
      expect(fileNameValidation).toBe(FileNameValidationResult.Valid);
    });

    it('Returns "Valid" when no regEx is provided and list of invalid names is empty', () => {
      const fileName: string = 'fileName';
      const fileNameValidation: FileNameValidationResult = FileNameUtils.validateFileName(
        fileName,
        [],
      );
      expect(fileNameValidation).toBe(FileNameValidationResult.Valid);
    });
  });
});
