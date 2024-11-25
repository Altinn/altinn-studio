import { StringUtils } from '@studio/pure-functions';

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

  static extractFilename = (path: string): string => {
    const indexOfLastSlash = path.lastIndexOf('/');
    return indexOfLastSlash < 0 ? path : path.substring(indexOfLastSlash + 1);
  };

  static removeFileNameFromPath = (path: string, excludeLastSlash: boolean = false): string => {
    const fileName = this.extractFilename(path);
    const indexOfLastSlash = path.lastIndexOf('/');
    return path.slice(
      0,
      path.lastIndexOf(excludeLastSlash && indexOfLastSlash > 0 ? '/' + fileName : fileName),
    );
  };
}
