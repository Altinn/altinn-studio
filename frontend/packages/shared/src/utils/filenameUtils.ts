import { removeEnd } from 'app-shared/utils/stringUtils';

/**
 * Remove extension from filename.
 * @param filename
 * @returns filename without extension
 */
export const removeExtension = (filename: string): string => {
  const indexOfLastDot = filename.lastIndexOf('.');
  return indexOfLastDot < 0 ? filename : filename.substring(0, indexOfLastDot);
};

/**
 * Remove json.schema or .xsd extension from filename.
 * @param filename
 * @returns filename without extension if the extension is ".schema.json" or ".xsd", otherwise the filename is returned unchanged.
 */
export const removeSchemaExtension = (filename: string): string =>
  removeEnd(filename, '.schema.json', '.xsd');

/**
 * Check if filename has an XSD extension.
 * @param filename
 * @returns true if filename has an XSD extension, otherwise false.
 */
export const isXsdFile = (filename: string): boolean => filename.toLowerCase().endsWith('.xsd');

export const extractFilename = (path: string): string => {
  const indexOfLastSlash = path.lastIndexOf('/');
  return indexOfLastSlash < 0 ? path : path.substring(indexOfLastSlash + 1);
};
