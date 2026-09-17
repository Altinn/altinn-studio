import { generateRandomId } from 'app-shared/utils/generateRandomId';

/** The prefix keeps each panel's filenames recognizable in the text editor. */
export const generateTextResourceId = (prefix: string): string =>
  `${prefix}-${generateRandomId(8)}`;
