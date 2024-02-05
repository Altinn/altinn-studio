/**
 * Finds the page index of a component in a list of children ids.
 * @param id The id of the component to find the page index of.
 * @param children The list of children  to search in.
 * @returns The page index of the component.
 */
export const findPageIndexInChildList = (id: string, children: string[]): number | null => {
  const idWithPageIndex = children.find((it) => removePageIndexPrefix(it) === id);
  return extractPageIndexPrefix(idWithPageIndex);
};

/**
 * Removes the page index prefix from a component id.
 * @param id The id to remove the prefix from.
 * @returns The id without the prefix.
 */
export const removePageIndexPrefix = (id: string): string => id.replace(/^\d+:/, '');

/**
 * Extracts the page index prefix from a component id.
 * @param id The id to extract the prefix from.
 * @returns The page index prefix.
 */
export const extractPageIndexPrefix = (id: string): number => parseInt(id.match(/^\d+:/)[0]);

/**
 * Adds a page index prefix to a component id.
 * @param id The id to add the prefix to.
 * @param pageIndex The page index to add.
 * @returns The id with the prefix.
 */
export const addPageIndexPrefix = (id: string, pageIndex: number): string => `${pageIndex}:${id}`;
