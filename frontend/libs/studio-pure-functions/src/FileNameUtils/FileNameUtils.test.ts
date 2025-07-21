import { FileNameErrorResult, FileNameUtils } from './FileNameUtils';

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

  describe('findFileNameError', () => {
    it('Returns "FileNameIsEmpty" when file name is empty', () => {
      const fileName: string = '';
      const fileNameError: FileNameErrorResult | null = FileNameUtils.findFileNameError(
        fileName,
        [],
      );
      expect(fileNameError).toBe(FileNameErrorResult.FileNameIsEmpty);
    });

    it('Returns "NoRegExMatch" when file name does not match file name regex', () => {
      const fileName: string = 'file/name';
      const fileNameError: FileNameErrorResult | null = FileNameUtils.findFileNameError(
        fileName,
        [],
      );
      expect(fileNameError).toBe(FileNameErrorResult.NoRegExMatch);
    });

    it('Returns "NoRegExMatch" when file name does not match file name regex in terms of length', () => {
      const fileName: string = '12345678901234567890123456789';
      const fileNameError: FileNameErrorResult | null = FileNameUtils.findFileNameError(
        fileName,
        [],
      );
      expect(fileNameError).toBe(FileNameErrorResult.NoRegExMatch);
    });

    it('Returns "FileExists" when file name matches regEx and name exists in list', () => {
      const fileName: string = 'fileName1';
      const invalidFileNames: string[] = [fileName, 'fileName2', 'fileName3'];
      const fileNameError: FileNameErrorResult | null = FileNameUtils.findFileNameError(
        fileName,
        invalidFileNames,
      );
      expect(fileNameError).toBe(FileNameErrorResult.FileExists);
    });

    it('Returns "FileExists" when file name matches regEx and case-insensitive name exists in list', () => {
      const fileName: string = 'fileName1';
      const lowerCaseFileName: string = fileName.toLowerCase();
      const invalidFileNames: string[] = [lowerCaseFileName, 'fileName2', 'fileName3'];
      const fileNameError: FileNameErrorResult | null = FileNameUtils.findFileNameError(
        fileName,
        invalidFileNames,
      );
      expect(fileNameError).toBe(FileNameErrorResult.FileExists);
    });

    it('Returns null when file name matches regEx and does not exist in list of invalid names', () => {
      const fileName: string = 'fileName';
      const invalidFileNames: string[] = ['fileName2', 'fileName3'];
      const fileNameError: FileNameErrorResult | null = FileNameUtils.findFileNameError(
        fileName,
        invalidFileNames,
      );
      expect(fileNameError).toBeNull();
    });

    it('Returns null when file name matches regEx and list of invalid names is empty', () => {
      const fileName: string = 'fileName';
      const fileNameError: FileNameErrorResult | null = FileNameUtils.findFileNameError(
        fileName,
        [],
      );
      expect(fileNameError).toBeNull();
    });
  });

  describe('findFileNameErrorByGivenRegEx', () => {
    it('Returns "FileNameIsEmpty" when file name is empty', () => {
      const fileName: string = '';
      const fileNameRegEx: RegExp = /^[a-z]+$/;
      const fileNameError: FileNameErrorResult | null = FileNameUtils.findFileNameErrorByGivenRegEx(
        fileName,
        [],
        fileNameRegEx,
      );
      expect(fileNameError).toBe(FileNameErrorResult.FileNameIsEmpty);
    });

    it('Returns "NoRegExMatch" when file name does not match given regex', () => {
      const fileName: string = 'ABC';
      const fileNameRegEx: RegExp = /^[a-z]+$/;
      const fileNameError: FileNameErrorResult | null = FileNameUtils.findFileNameErrorByGivenRegEx(
        fileName,
        [],
        fileNameRegEx,
      );
      expect(fileNameError).toBe(FileNameErrorResult.NoRegExMatch);
    });

    it('Returns "FileExists" when file name matches regEx and exists in list', () => {
      const fileName: string = 'fileName1';
      const invalidFileNames: string[] = [fileName, 'fileName2', 'fileName3'];
      const fileNameRegEx: RegExp = /^[a-zA-Z0-9]+$/;
      const fileNameError: FileNameErrorResult | null = FileNameUtils.findFileNameErrorByGivenRegEx(
        fileName,
        invalidFileNames,
        fileNameRegEx,
      );
      expect(fileNameError).toBe(FileNameErrorResult.FileExists);
    });
  });
});
