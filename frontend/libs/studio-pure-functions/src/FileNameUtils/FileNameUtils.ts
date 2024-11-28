import { StringUtils } from '@studio/pure-functions';

export enum FileNameErrorResult {
  FileNameIsEmpty = 'fileNameIsEmpty',
  NoRegExMatch = 'noRegExMatch',
  FileExists = 'fileExists',
}

export class FileNameUtils {
  /**
   * Remove extension from filename.
   * @param filename
   * @returns filename without extension
   */
  static removeExtension = (filename: string): string => {
    const indexOfLastDot = filename.lastIndexOf('.');
    return indexOfLastDot < 0 ? filename : filename.substring(0, indexOfLastDot);
  };

  /**
   * Remove json.schema or .xsd extension from filename.
   * @param filename
   * @returns filename without extension if the extension is ".schema.json" or ".xsd", otherwise the filename is returned unchanged.
   */
  static removeSchemaExtension = (filename: string): string =>
    StringUtils.removeEnd(filename, '.schema.json', '.xsd');

  /**
   * Remove json.schema or .xsd extension from filename.
   * @param filename
   * @returns filename without extension if the extension is ".schema.json" or ".xsd", otherwise the filename is returned unchanged.
   */
  static isXsdFile = (filename: string): boolean => filename.toLowerCase().endsWith('.xsd');

  static extractFileName = (path: string): string => {
    const indexOfLastSlash = path.lastIndexOf('/');
    return indexOfLastSlash < 0 ? path : path.substring(indexOfLastSlash + 1);
  };

  static removeFileNameFromPath = (path: string, excludeLastSlash: boolean = false): string => {
    const fileName = this.extractFileName(path);
    const indexOfLastSlash = path.lastIndexOf('/');
    return path.slice(
      0,
      path.lastIndexOf(excludeLastSlash && indexOfLastSlash > 0 ? '/' + fileName : fileName),
    );
  };

  /**
   * Validates if file name does not exist in list of invalid names and if name matches regEx, if provided.
   * @param fileName
   * @param invalidFileNames
   * @param regEx
   * @returns {FileNameErrorResult | null}
   */
  static findFileNameError = (
    fileName: string,
    invalidFileNames: string[],
    regEx?: RegExp,
  ): FileNameErrorResult => {
    if (fileName === '') {
      return FileNameErrorResult.FileNameIsEmpty;
    }

    const isFileNameNotMatchingRegEx: boolean = regEx ? Boolean(!fileName.match(regEx)) : false;
    const isFileNameInInvalidList: boolean = invalidFileNames.some(
      (invalidFileName) => invalidFileName === fileName,
    );

    if (isFileNameNotMatchingRegEx) {
      return FileNameErrorResult.NoRegExMatch;
    }
    if (isFileNameInInvalidList) {
      return FileNameErrorResult.FileExists;
    }
    return null;
  };
}
