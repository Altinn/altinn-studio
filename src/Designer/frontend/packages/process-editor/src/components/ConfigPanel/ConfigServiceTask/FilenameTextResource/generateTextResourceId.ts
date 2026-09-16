import { generateRandomId } from 'app-shared/utils/generateRandomId';

/**
 * The id a newly written filename text resource is stored under.
 *
 * Nothing reads the prefix, so it exists to make the id recognizable in the text editor, where all
 * of an app's text resources sit in one list. Each panel therefore names its own, so a subform
 * filename is not mistaken for the one on the ordinary pdf task.
 * @param prefix the panel's own prefix, without a trailing dash.
 * @returns a text resource id that is unique within the app.
 */
export const generateTextResourceId = (prefix: string): string =>
  `${prefix}-${generateRandomId(8)}`;
