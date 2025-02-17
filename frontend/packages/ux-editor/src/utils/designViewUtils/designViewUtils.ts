import type { TranslationKey } from 'language/type';
import { validateLayoutNameAndLayoutSetName } from 'app-shared/utils/LayoutAndLayoutSetNameValidationUtils/validateLayoutNameAndLayoutSetName';

/**
 * Checks if the new written page name already exists
 */

type PageNameExists = {
  candidateName: string;
  oldName: string;
  layoutNames: string[];
};

export const pageNameExists = ({ candidateName, oldName, layoutNames }: PageNameExists): boolean =>
  layoutNames
    .filter((layout: string) => layout.toLowerCase() !== oldName.toLowerCase())
    .some((layout: string) => layout.toLowerCase() === candidateName.toLowerCase());

/**
 * Gets the page name error key if there is an error in a new suggested page name
 *
 * @param candidateName the new suggested name
 * @param oldName the old name
 * @param layoutNames the layout names currently used in the selected layout set
 *
 * @returns the key
 */
export const getPageNameErrorKey = (
  candidateName: string,
  oldName: string,
  layoutNames: string[],
): TranslationKey | null => {
  if (!candidateName) return 'ux_editor.pages_error_empty';
  if (pageNameExists({ candidateName, oldName, layoutNames }))
    return 'ux_editor.pages_error_unique';
  if (!validateLayoutNameAndLayoutSetName(candidateName)) return 'validation_errors.name_invalid';
  return null;
};
