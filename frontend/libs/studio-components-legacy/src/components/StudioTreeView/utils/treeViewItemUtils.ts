/**
 * Returns the id of the node that should have its tabIndex set to 0.
 * - Returns `focusedId` if set.
 * - Returns `selectedId` if `focusedId` is not set, but `selectedId` is.
 * - Returns `firstItemId` if neither `focusedId` nor `selectedId` are set.
 *
 * This is with accordance to [the ARIA pattern for a single select tree view](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/).
 *
 * @param selectedId The id of the selected item.
 * @param focusedId The id of the focused item.
 * @param firstItemId Whether the item is the first item of the tree view.
 */
export const focusableNodeId = (
  focusedId: string | undefined,
  selectedId: string | undefined,
  firstItemId: string | null,
): string | null => focusedId || selectedId || firstItemId;
