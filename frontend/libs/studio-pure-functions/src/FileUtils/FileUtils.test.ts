import { FileNameErrorResult, FileUtils } from './FileUtils';

describe('FileUtils', () => {
  describe('convertToFormData', () => {
    it('should append the file to FormData under the key "file"', () => {
      const fileContent = 'Test file contents';
      const fileName = 'test.txt';
      const fileType = 'text/plain';
      const file = new File([fileContent], fileName, { type: fileType });

      const formData = FileUtils.convertToFormData(file);

      const retrievedFile = formData.get('file');
      expect(retrievedFile).toBe(file);
    });
  });

  describe('removeExtension', () => {
    it('Removes extension from filename if it exists', () => {
      expect(FileUtils.removeExtension('filename.txt')).toEqual('filename');
      expect(FileUtils.removeExtension('filename.xsd')).toEqual('filename');
      expect(FileUtils.removeExtension('.abc')).toEqual('');
      expect(FileUtils.removeExtension('filename.schema.json')).toEqual('filename.schema');
    });

    it('Removes the extension for filenames with special characters', () => {
      expect(FileUtils.removeExtension('file name.txt')).toBe('file name');
      expect(FileUtils.removeExtension('my-file.name$!.txt')).toBe('my-file.name$!');
      expect(FileUtils.removeExtension('.hiddenfile.txt')).toBe('.hiddenfile');
      expect(FileUtils.removeExtension('file123.456.txt')).toBe('file123.456');
    });

    it('Returns same input string if there is no extension', () => {
      expect(FileUtils.removeExtension('filename')).toEqual('filename');
      expect(FileUtils.removeExtension('')).toEqual('');
    });

    it('returns an empty string if the filename starts with dot', () => {
      expect(FileUtils.removeExtension('.hiddenfile')).toBe('');
      expect(FileUtils.removeExtension('.')).toBe('');
    });
  });

  describe('removeSchemaExtension', () => {
    it('Removes .schema.json extension from filename if it exists', () => {
      expect(FileUtils.removeSchemaExtension('filename.schema.json')).toEqual('filename');
      expect(FileUtils.removeSchemaExtension('filename.SCHEMA.JSON')).toEqual('filename');
    });

    it('Removes .xsd extension from filename if it exists', () => {
      expect(FileUtils.removeSchemaExtension('filename.xsd')).toEqual('filename');
      expect(FileUtils.removeSchemaExtension('filename.XSD')).toEqual('filename');
    });

    it('Returns entire input string if there is no .schema.json or .xsd extension', () => {
      expect(FileUtils.removeSchemaExtension('filename.xml')).toEqual('filename.xml');
    });
  });

  describe('isXsdFile', () => {
    it('Returns true if filename has an XSD extension', () => {
      expect(FileUtils.isXsdFile('filename.xsd')).toBe(true);
      expect(FileUtils.isXsdFile('filename.XSD')).toBe(true);
    });

    it('Returns false if filename does not have an XSD extension', () => {
      expect(FileUtils.isXsdFile('filename.schema.json')).toBe(false);
      expect(FileUtils.isXsdFile('filename')).toBe(false);
    });
  });

  describe('extractFileName', () => {
    it('Returns filename if path contains a slash', () => {
      expect(FileUtils.extractFileName('/path/to/filename')).toEqual('filename');
      expect(FileUtils.extractFileName('/path/to/filename.json')).toEqual('filename.json');
    });

    it('Returns path if path does not contain a slash', () => {
      expect(FileUtils.extractFileName('filename')).toEqual('filename');
      expect(FileUtils.extractFileName('filename.json')).toEqual('filename.json');
    });
  });

  describe('removeFileNameFromPath', () => {
    it('Returns file path without file name', () => {
      expect(FileUtils.removeFileNameFromPath('/path/to/filename')).toEqual('/path/to/');
      expect(FileUtils.removeFileNameFromPath('/path/to/filename.json')).toEqual('/path/to/');
    });

    it('Returns file path without file name and last slash if "excludeLastSlash" is true', () => {
      expect(FileUtils.removeFileNameFromPath('/path/to/filename', true)).toEqual('/path/to');
      expect(FileUtils.removeFileNameFromPath('/path/to/filename.json', true)).toEqual('/path/to');
    });

    it('Returns empty string if path is only fileName', () => {
      expect(FileUtils.removeFileNameFromPath('filename')).toEqual('');
      expect(FileUtils.removeFileNameFromPath('filename.json')).toEqual('');
    });

    it('Returns empty string if path is only fileName and "excludeLastSlash" is true', () => {
      expect(FileUtils.removeFileNameFromPath('filename', true)).toEqual('');
      expect(FileUtils.removeFileNameFromPath('filename.json', true)).toEqual('');
    });
  });

  describe('findFileNameError', () => {
    it('Returns "FileNameIsEmpty" when file name is empty', () => {
      const fileName: string = '';
      const fileNameError: FileNameErrorResult | null = FileUtils.findFileNameError(fileName, []);
      expect(fileNameError).toBe(FileNameErrorResult.FileNameIsEmpty);
    });

    it('Returns "NoRegExMatch" when file name does not match file name regex', () => {
      const fileName: string = 'file/name';
      const fileNameError: FileNameErrorResult | null = FileUtils.findFileNameError(fileName, []);
      expect(fileNameError).toBe(FileNameErrorResult.NoRegExMatch);
    });

    it('Returns "NoRegExMatch" when file name does not match file name regex in terms of length', () => {
      const fileName: string = '12345678901234567890123456789';
      const fileNameError: FileNameErrorResult | null = FileUtils.findFileNameError(fileName, []);
      expect(fileNameError).toBe(FileNameErrorResult.NoRegExMatch);
    });

    it('Returns "FileExists" when file name matches regEx and name exists in list', () => {
      const fileName: string = 'fileName1';
      const invalidFileNames: string[] = [fileName, 'fileName2', 'fileName3'];
      const fileNameError: FileNameErrorResult | null = FileUtils.findFileNameError(
        fileName,
        invalidFileNames,
      );
      expect(fileNameError).toBe(FileNameErrorResult.FileExists);
    });

    it('Returns "FileExists" when file name matches regEx and case-insensitive name exists in list', () => {
      const fileName: string = 'fileName1';
      const lowerCaseFileName: string = fileName.toLowerCase();
      const invalidFileNames: string[] = [lowerCaseFileName, 'fileName2', 'fileName3'];
      const fileNameError: FileNameErrorResult | null = FileUtils.findFileNameError(
        fileName,
        invalidFileNames,
      );
      expect(fileNameError).toBe(FileNameErrorResult.FileExists);
    });

    it('Returns null when file name matches regEx and does not exist in list of invalid names', () => {
      const fileName: string = 'fileName';
      const invalidFileNames: string[] = ['fileName2', 'fileName3'];
      const fileNameError: FileNameErrorResult | null = FileUtils.findFileNameError(
        fileName,
        invalidFileNames,
      );
      expect(fileNameError).toBeNull();
    });

    it('Returns null when file name matches regEx and list of invalid names is empty', () => {
      const fileName: string = 'fileName';
      const fileNameError: FileNameErrorResult | null = FileUtils.findFileNameError(fileName, []);
      expect(fileNameError).toBeNull();
    });
  });

  describe('findFileNameErrorByGivenRegEx', () => {
    it('Returns "FileNameIsEmpty" when file name is empty', () => {
      const fileName: string = '';
      const fileNameRegEx: RegExp = /^[a-z]+$/;
      const fileNameError: FileNameErrorResult | null = FileUtils.findFileNameErrorByGivenRegEx(
        fileName,
        [],
        fileNameRegEx,
      );
      expect(fileNameError).toBe(FileNameErrorResult.FileNameIsEmpty);
    });

    it('Returns "NoRegExMatch" when file name does not match given regex', () => {
      const fileName: string = 'ABC';
      const fileNameRegEx: RegExp = /^[a-z]+$/;
      const fileNameError: FileNameErrorResult | null = FileUtils.findFileNameErrorByGivenRegEx(
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
      const fileNameError: FileNameErrorResult | null = FileUtils.findFileNameErrorByGivenRegEx(
        fileName,
        invalidFileNames,
        fileNameRegEx,
      );
      expect(fileNameError).toBe(FileNameErrorResult.FileExists);
    });
  });
});
