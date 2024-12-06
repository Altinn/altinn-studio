import { StringUtils } from '@studio/pure-functions';

export const domListId = (baseId: string, id: string) => `${baseId}-${id}-list`;
export const domItemId = (baseId: string, id: string) => `${baseId}-${id}-listitem`;

export const extractIdFromDomItemId = (baseId: string, domItemId: string): string =>
  StringUtils.removeEnd(StringUtils.removeStart(domItemId, `${baseId}-`), '-listitem');
export const extractIdFromDomListId = (baseId: string, domListId: string): string =>
  StringUtils.removeEnd(StringUtils.removeStart(domListId, `${baseId}-`), '-list');

const replaceColonsWithUnderscores = (id: string): string => id.replaceAll(':', '_'); // Used to convert the useId value to a valid class name
export const domItemClass = (baseId: string) => `${replaceColonsWithUnderscores(baseId)}-listitem`;
export const domListClass = (baseId: string) => `${replaceColonsWithUnderscores(baseId)}-list`;

export const findParentId = (baseId: string, id: string): string => {
  const listClassName = domListClass(baseId);
  const itemDomId = domItemId(baseId, id);
  const domItem = document.getElementById(itemDomId);
  const parent = domItem.closest(`.${listClassName}`);
  return extractIdFromDomListId(baseId, parent.id);
};

export const findAllItemIds = (baseId: string): string[] => {
  const itemClassName = domItemClass(baseId);
  const domItems = document.getElementsByClassName(itemClassName);
  const domItemIds = Array.from(domItems).map((item) => item.id);
  return domItemIds.map((domId) => extractIdFromDomItemId(baseId, domId));
};

export const findDirectChildDomIds = (baseId: string, id: string): string[] => {
  const allIds = findAllItemIds(baseId);
  return allIds.filter((itemId) => findParentId(baseId, itemId) === id);
};

export const findPositionInList = (baseId: string, id: string): number => {
  const parentId = findParentId(baseId, id);
  const sameLevelDomIds = findDirectChildDomIds(baseId, parentId);
  return sameLevelDomIds.indexOf(id);
};
