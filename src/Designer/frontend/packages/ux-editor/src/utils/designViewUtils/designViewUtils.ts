import type { TranslationKey } from 'language/type';
import { validateLayoutNameAndLayoutSetName } from 'app-shared/utils/LayoutAndLayoutSetNameValidationUtils/validateLayoutNameAndLayoutSetName';
import type { GroupModel } from 'app-shared/types/api/dto/PageModel';

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

type GetUpdatedGroupsExcludingPageProps = {
  pageId: string;
  groups: GroupModel[];
  groupIndex: number;
};

export const getUpdatedGroupsExcludingPage = ({
  pageId,
  groups,
  groupIndex,
}: GetUpdatedGroupsExcludingPageProps): GroupModel[] => {
  const updatedGroup = excludePageFromGroup({ group: groups[groupIndex], pageId });

  return updatedGroup
    ? groups.map((group, index) => (index === groupIndex ? updatedGroup : group))
    : groups.filter((_, index) => index !== groupIndex);
};

type GetUpdatedGroupExludingPageProps = {
  group: GroupModel;
  pageId: string;
};

const excludePageFromGroup = ({
  group,
  pageId,
}: GetUpdatedGroupExludingPageProps): GroupModel | undefined => {
  const filteredOrder = group.order.filter((page) => page.id !== pageId);

  if (filteredOrder.length === 0) return undefined;

  const updatedName = filteredOrder.length === 1 ? undefined : group.name;
  return {
    ...group,
    order: filteredOrder,
    name: updatedName,
  };
};
